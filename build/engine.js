/* ============================================================================
   LuaMore v12 — "main obfuscator" engine
   In-browser / Node obfuscation pipeline for Luau & Lua 5.1-5.4:
     lex -> structural scope analysis -> safe local renaming -> string pooling
     -> junk decoys -> control-flow flattening -> RLE -> 4-key XOR -> RC4
     -> block permutation -> base85 chunk scatter -> nested VM loaders
     -> hardened outer shell (watermark, invariants, sandbox + env-log probes)
   Everything is pure JS (no Node builtins) so the same file runs in a browser,
   a Web Worker, and Node for the differential test suite.
   ============================================================================ */
(function (global) {
  "use strict";

  var VERSION = "12.0.0";
  var BRAND_LINE = "-- This file was protected by LuaMore v" + VERSION + " [https://luamore.app]";

  /* ---------------------------------------------------------------- RNG --- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var f = mulberry32(seed == null ? ((Math.random() * 0xffffffff) >>> 0) : seed);
    return {
      next: f,
      int: function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      shuffle: function (arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(f() * (i + 1));
          var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      },
      seed: seed
    };
  }

  /* name generation: mix of uniform junk names and decoy "plausible" names */
  var DECOY_WORDS = ["buf", "tmp", "res", "val", "idx", "cnt", "len", "ptr", "arg", "ctx",
    "env", "cfg", "acc", "cur", "nxt", "prv", "out", "aux", "raw", "ref", "obj", "fn",
    "cb", "st", "hd", "it", "mk", "rs", "ks", "sb", "db", "ix", "qx", "v1", "v2"];
  function genName(rng, used) {
    for (var attempt = 0; attempt < 64; attempt++) {
      var n;
      if (rng.next() < 0.42) {
        n = "_" + rng.pick(DECOY_WORDS) + "_" + rng.int(10, 9999);
      } else {
        var L = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var len = rng.int(6, 12);
        n = "_";
        for (var i = 0; i < len; i++) n += L.charAt(Math.floor(rng.next() * L.length));
      }
      if (!used.has(n)) { used.add(n); return n; }
    }
    var k = 0; while (used.has("_z" + k)) k++;
    used.add("_z" + k); return "_z" + k;
  }
  function NameAllocator(rng) {
    var used = new Set();
    return { next: function () { return genName(rng, used); } };
  }

  /* obfuscated numeric literal (constant splitting) */
  function numLit(rng, n) {
    if (n < 8 || n > 0x7ffffff) return String(n);
    var a = 1 + Math.floor(rng.next() * (n - 1));
    var b = n - a;
    switch (Math.floor(rng.next() * 4)) {
      case 0: return "(" + a + "+" + b + ")";
      case 1: return "(" + (n + a) + "-" + a + ")";
      case 2: return "(" + a + "*1+" + b + ")";
      default: return "(" + b + "+" + a + ")";
    }
  }

  /* ------------------------------------------------------------- lexer --- */
  var KEYWORDS = new Set(["and", "break", "do", "else", "elseif", "end", "false", "for",
    "function", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then",
    "true", "until", "while", "continue", "goto", "export", "type"]);
  /* globals & Roblox/executor API names that must never be renamed */
  var PROTECTED_GLOBALS = new Set(["game", "workspace", "script", "Instance", "Vector3",
    "Vector2", "Vector3int16", "Vector2int16", "CFrame", "Color3", "UDim2", "UDim",
    "BrickColor", "Ray", "RaycastParams", "RaycastResult", "TweenInfo", "Enum", "Faces",
    "Axes", "NumberRange", "NumberSequence", "NumberSequenceKeypoint", "ColorSequence",
    "ColorSequenceKeypoint", "PhysicalProperties", "Region3", "Region3int16", "Rect",
    "Random", "DateTime", "Font", "PathWaypoint", "OverlapParams", "task", "debug",
    "bit32", "bit", "table", "string", "math", "os", "coroutine", "utf8", "pcall",
    "xpcall", "setmetatable", "getmetatable", "rawget", "rawset", "rawequal", "rawlen",
    "type", "typeof", "tostring", "tonumber", "error", "warn", "print", "select",
    "next", "pairs", "ipairs", "unpack", "require", "getfenv", "setfenv", "getgenv",
    "getrenv", "getsenv", "getreg", "loadstring", "load", "tick", "time", "elapsedTime",
    "shared", "_G", "_VERSION", "plugin", "newproxy", "gcinfo", "delay", "spawn",
    "Wait", "wait", "UserSettings", "settings", "stats", "Stats", "version",
    "collectgarbage", "hookfunction", "hookmetamethod", "newcclosure", "islclosure",
    "iscclosure", "checkcaller", "getnamecallmethod", "setnamecallmethod",
    "identifyexecutor", "getexecutorname", "self", "super", "buffer", "vector"]);

  function isIdStart(c) { return /[A-Za-z_]/.test(c); }
  function isIdChar(c) { return /[A-Za-z0-9_]/.test(c); }
  function isDigit(c) { return c >= "0" && c <= "9"; }

  /* unescape a short string literal body into an array of byte values */
  function utf8EncodeBytes(cp, out) {
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) { out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63)); }
    else if (cp < 0x10000) { out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)); }
    else { out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)); }
  }
  function unescapeShort(body) {
    var out = [];
    var i = 0, n = body.length;
    while (i < n) {
      var c = body.charAt(i);
      if (c !== "\\") {
        var code = body.charCodeAt(i);
        if (code < 0x80) out.push(code);
        else utf8EncodeBytes(body.codePointAt(i), out), i += (body.codePointAt(i) > 0xffff ? 1 : 0);
        i++;
        continue;
      }
      i++;
      var e = body.charAt(i);
      if (e === "a") { out.push(7); i++; }
      else if (e === "b") { out.push(8); i++; }
      else if (e === "f") { out.push(12); i++; }
      else if (e === "n") { out.push(10); i++; }
      else if (e === "r") { out.push(13); i++; }
      else if (e === "t") { out.push(9); i++; }
      else if (e === "v") { out.push(11); i++; }
      else if (e === "\\") { out.push(92); i++; }
      else if (e === '"') { out.push(34); i++; }
      else if (e === "'") { out.push(39); i++; }
      else if (e === "\n") { out.push(10); i++; }
      else if (e === "x") {
        var h = body.substr(i + 1, 2); i += 1 + h.length;
        out.push(parseInt(h, 16) & 0xff);
      } else if (e === "u" && body.charAt(i + 1) === "{") {
        var close = body.indexOf("}", i + 2);
        var hex = body.slice(i + 2, close < 0 ? n : close);
        i = (close < 0 ? n : close) + 1;
        utf8EncodeBytes(parseInt(hex, 16) || 0, out);
      } else if (e === "z") {
        i++;
        while (i < n && /\s/.test(body.charAt(i))) i++;
      } else if (isDigit(e) && e !== "0" ? true : e === "0" && isDigit(body.charAt(i + 1))) {
        var d = body.substr(i, 3).replace(/\D.*/, "");
        i += d.length;
        out.push(parseInt(d, 10) & 0xff);
      } else if (e === "0") { out.push(0); i++; }
      else if (e === "") { /* trailing backslash (invalid lua, be lenient) */ }
      else { out.push(body.charCodeAt(i)); i++; }
    }
    return out;
  }

  /* token types: NAME KEYWORD NUMBER STRING LONGSTRING PUNCT COMMENT SPACE EOF */
  function lex(src) {
    var toks = [];
    var i = 0, n = src.length;
    var line = 1;
    function push(t, raw, val) { toks.push({ t: t, raw: raw, v: val === undefined ? raw : val, i: toks.length, line: line }); }
    while (i < n) {
      var c = src.charAt(i);
      if (c === "\n") { line++; push("SPACE", "\n"); i++; continue; }
      if (/\s/.test(c)) { var j = i; while (j < n && /\s/.test(src.charAt(j)) && src.charAt(j) !== "\n") j++; if (src.charAt(j) === "\n") j = i + 1 === j ? j : j; push("SPACE", src.slice(i, j)); i = j; continue; }
      if (c === "-" && src.charAt(i + 1) === "-") {
        var k = i + 2;
        if (src.charAt(k) === "[" && (src.charAt(k + 1) === "[" || src.charAt(k + 1) === "=")) {
          var lv = 0, m = k + 1;
          while (src.charAt(m) === "=") { lv++; m++; }
          if (src.charAt(m) === "[") {
            var closer = "]" + "=".repeat(lv) + "]";
            var end = src.indexOf(closer, m + 1);
            var stop = end < 0 ? n : end + closer.length;
            var body = src.slice(m + 1, end < 0 ? n : end);
            var nl = body.split("\n").length - 1; line += nl;
            push("COMMENT", src.slice(i, stop)); i = stop; continue;
          }
        }
        var e = i + 2;
        while (e < n && src.charAt(e) !== "\n") e++;
        push("COMMENT", src.slice(i, e)); i = e; continue;
      }
      if (c === '"' || c === "'") {
        var q = c, p = i + 1, buf = [];
        var closed = false;
        while (p < n) {
          var ch = src.charAt(p);
          if (ch === "\\") {
            var seg = src.slice(p, p + 10);
            var m2 = /^\\(z|x[0-9a-fA-F]{1,2}|u\{[0-9a-fA-F ]*\}|[0-9]{1,3}|.)/.exec(seg);
            var tk = m2 ? m2[0] : "\\";
            if (tk === "\\\n") { line++; buf.push("\\\n"); p += 2; continue; }
            if (tk === "\\z") {
              buf.push(tk); p += 2;
              while (p < n && /\s/.test(src.charAt(p))) { if (src.charAt(p) === "\n") line++; p++; }
              continue;
            }
            buf.push(tk); p += tk.length;
            continue;
          }
          if (ch === q) { p++; closed = true; break; }
          if (ch === "\n") break;
          buf.push(ch); p++;
        }
        push("STRING", src.slice(i, p), buf.join(""));
        i = p;
        if (!closed) { /* unterminated — keep lexing leniently */ }
        continue;
      }
      if (c === "[" && (src.charAt(i + 1) === "[" || src.charAt(i + 1) === "=")) {
        var lv2 = 0, m3 = i + 1;
        while (src.charAt(m3) === "=") { lv2++; m3++; }
        if (src.charAt(m3) === "[") {
          var opener = "[" + "=".repeat(lv2) + "[";
          var closer2 = "]" + "=".repeat(lv2) + "]";
          var end2 = src.indexOf(closer2, m3 + 1);
          var stop2 = end2 < 0 ? n : end2 + closer2.length;
          var body2 = src.slice(m3 + 1, end2 < 0 ? n : end2);
          /* skip one newline right after the opener (lua rule) */
          if (body2.charAt(0) === "\r") body2 = body2.slice(1);
          if (body2.charAt(0) === "\n") body2 = body2.slice(1);
          line += body2.split("\n").length - 1;
          push("LONGSTRING", src.slice(i, stop2), body2);
          i = stop2;
          continue;
        }
        push("PUNCT", "["); i++; continue;
      }
      if (isDigit(c) || (c === "." && isDigit(src.charAt(i + 1)))) {
        var d0 = i;
        if (c === "0" && (src.charAt(i + 1) === "x" || src.charAt(i + 1) === "X")) {
          i += 2;
          while (i < n && /[0-9a-fA-F_.pP]/.test(src.charAt(i))) {
            if ((src.charAt(i) === "p" || src.charAt(i) === "P") && (src.charAt(i + 1) === "+" || src.charAt(i + 1) === "-")) i++;
            i++;
          }
        } else if (c === "0" && (src.charAt(i + 1) === "b" || src.charAt(i + 1) === "B")) {
          i += 2; while (i < n && /[01_]/.test(src.charAt(i))) i++;
        } else {
          while (i < n && /[0-9_]/.test(src.charAt(i))) i++;
          if (src.charAt(i) === ".") { i++; while (i < n && /[0-9_]/.test(src.charAt(i))) i++; }
          if (src.charAt(i) === "e" || src.charAt(i) === "E") {
            i++; if (src.charAt(i) === "+" || src.charAt(i) === "-") i++;
            while (i < n && /[0-9_]/.test(src.charAt(i))) i++;
          }
        }
        push("NUMBER", src.slice(d0, i)); i = i; continue;
      }
      if (isIdStart(c)) {
        var w = i; while (w < n && isIdChar(src.charAt(w))) w++;
        var word = src.slice(i, w);
        push(KEYWORDS.has(word) ? "KEYWORD" : "NAME", word);
        i = w; continue;
      }
      var tri = src.substr(i, 3);
      if (tri === "..." || tri === "..=" ) { push("PUNCT", tri); i += 3; continue; }
      var bi = src.substr(i, 2);
      if (["==", "~=", "<=", ">=", "..", "+=", "-=", "*=", "/=", "%=", "^=", "//", "::", "->", "|=", "&=", "<<", ">>"].indexOf(bi) >= 0) { push("PUNCT", bi); i += 2; continue; }
      push("PUNCT", c); i++; continue;
    }
    push("EOF", "");
    return toks;
  }

  /* =======================================================================
     Structural scanner — a small recursive-descent "parser-lite" over the
     token stream. It does NOT build an AST; it tracks scopes/bindings so
     local variables can be renamed safely (v11 renamed heuristically and
     could break `local t = t or {}`, global/local name collisions, labels,
     varargs, etc). On ANY construct it cannot prove, it raises {abort} and
     the renamer is disabled for the whole file (fail-safe, never fail-broken).
     ======================================================================= */
  function ScanAbort() {}
  function Scanner(sig, tokens) {
    this.sig = sig;         // significant tokens (no SPACE/COMMENT)
    this.p = 0;
    this.scopes = [new Map()];  // name -> binding {name, rename, declIdx}
    this.bindings = [];
    this.stmtStarts = [];   // indices (in sig) where a chunk-level statement starts
    this.depth = 0;         // function/block nesting (chunk level = 0)
  }
  Scanner.prototype = {
    peek: function (k) { return this.sig[Math.min(this.p + (k || 0), this.sig.length - 1)]; },
    la: function (k) { return this.sig[Math.min(this.p + (k || 0), this.sig.length - 1)]; },
    next: function () { var t = this.sig[this.p]; if (this.p < this.sig.length - 1) this.p++; return t; },
    atEnd: function () { return this.peek().t === "EOF"; },
    isP: function (v, k) { var t = this.peek(k); return t.t === "PUNCT" && t.v === v; },
    isK: function (v, k) { var t = this.peek(k); return t.t === "KEYWORD" && t.v === v; },
    isN: function (k) { return this.peek(k).t === "NAME"; },
    expectP: function (v) { if (!this.isP(v)) throw new ScanAbort(); return this.next(); },
    expectK: function (v) { if (!this.isK(v)) throw new ScanAbort(); return this.next(); },
    push: function () { this.scopes.push(new Map()); this.depth++; },
    pop: function () { this.scopes.pop(); this.depth--; },
    bind: function (nameTok) {
      var b = { name: nameTok.v, rename: null, tok: nameTok };
      nameTok.bind = b;
      this.scopes[this.scopes.length - 1].set(nameTok.v, b);
      this.bindings.push(b);
      return b;
    },
    resolve: function (nameTok) {
      for (var i = this.scopes.length - 1; i >= 0; i--) {
        var b = this.scopes[i].get(nameTok.v);
        if (b) { nameTok.bind = b; return; }
      }
      nameTok.globalRef = true; // global (or external): never rename
    },

    parseChunk: function () {
      while (!this.atEnd()) {
        this.stmtStarts.push(this.p);
        this.parseStatement();
      }
    },
    parseBlock: function (termKws) {
      while (!this.atEnd()) {
        if (this.peek().t === "KEYWORD" && termKws.indexOf(this.peek().v) >= 0) return;
        this.parseStatement();
      }
    },
    parseStatement: function () {
      var t = this.peek();
      if (t.t === "PUNCT") {
        if (t.v === ";") { this.next(); return; }
        if (t.v === "::") { // label
          this.next();
          if (this.isN()) this.next().labelDef = true;
          this.expectP("::");
          return;
        }
      }
      if (t.t === "KEYWORD") {
        switch (t.v) {
          case "local": this.next(); this.parseLocal(); return;
          case "if": this.next(); this.parseIf(); return;
          case "while": this.next(); this.parseExpr(); this.expectK("do"); this.push(); this.parseBlock(["end"]); this.pop(); this.expectK("end"); return;
          case "for": this.next(); this.parseFor(); return;
          case "repeat": this.next(); this.push(); this.parseBlock(["until"]); this.expectK("until"); this.parseExpr(); this.pop(); return;
          case "function": this.next(); this.parseFuncStatement(); return;
          case "return":
            this.next();
            if (!this.atStmtEnd()) { this.parseExprList(); }
            if (this.isP(";")) this.next();
            return;
          case "break": case "continue": this.next(); return;
          case "goto":
            this.next();
            if (this.isN()) this.next().labelRef = true;
            return;
          case "type": this.next(); this.parseTypeStmt(false); return;
          case "export":
            if (this.isK("type", 1)) { this.next(); this.next(); this.parseTypeStmt(true); return; }
            this.next(); return; // export function ... (luau module export)
          default: throw new ScanAbort();
        }
      }
      if (t.t === "NAME") { this.parseExprStatement(); return; }
      throw new ScanAbort();
    },
    atStmtEnd: function () {
      var t = this.peek();
      if (t.t === "EOF") return true;
      if (t.t === "KEYWORD" && (t.v === "end" || t.v === "else" || t.v === "elseif" || t.v === "until")) return true;
      if (t.t === "PUNCT" && t.v === ";") return true;
      return false;
    },
    parseLocal: function () {
      if (this.isK("function")) { // local function f() ... end
        this.next();
        if (!this.isN()) throw new ScanAbort();
        var nameTok = this.next();
        var b = this.bind(nameTok);
        b.localFunc = true;
        this.parseFuncBody(true);
        return;
      }
      if (this.isK("type")) { // local type X = ...
        this.next();
        if (this.isN()) this.next().typeName = true;
        if (this.isP("=")) { this.next(); this.parseType(); }
        return;
      }
      var names = [];
      for (;;) {
        if (!this.isN()) throw new ScanAbort();
        names.push(this.next());
        this.parseNameAttrib();
        if (this.isP(",")) { this.next(); continue; }
        break;
      }
      if (this.isP("=")) {
        this.next();
        this.parseExprList();
      }
      for (var i = 0; i < names.length; i++) this.bind(names[i]);
    },
    parseNameAttrib: function () {
      if (this.isP("<")) { // 5.4 <const>/<close>
        this.next();
        if (this.isN()) this.next().attrib = true;
        this.expectP(">");
        return;
      }
      if (this.isP(":")) { this.next(); this.parseType(); }
    },
    parseIf: function () {
      this.parseExpr();
      this.expectK("then");
      this.push(); this.parseBlock(["end", "else", "elseif"]); this.pop();
      for (;;) {
        if (this.isK("elseif")) {
          this.next(); this.parseExpr(); this.expectK("then");
          this.push(); this.parseBlock(["end", "else", "elseif"]); this.pop();
        } else if (this.isK("else")) {
          this.next();
          this.push(); this.parseBlock(["end"]); this.pop();
          break;
        } else break;
      }
      this.expectK("end");
    },
    parseFuncStatement: function () {
      // function a.b:c() ... end — first name is a reference, rest are fields
      if (!this.isN()) throw new ScanAbort();
      this.resolve(this.next());
      var isMethod = false;
      while (this.isP(".") || this.isP(":")) {
        var sep = this.next().v;
        if (!this.isN()) throw new ScanAbort();
        var nt = this.next();
        if (sep === ":") { nt.fieldDef = true; isMethod = true; }
        else nt.fieldDef = true;
      }
      this.parseFuncBody(isMethod);
    },
    parseFuncBody: function (isMethod) {
      this.push();
      if (isMethod) {
        var sb = { name: "self", rename: null, tok: null, implicit: true };
        this.scopes[this.scopes.length - 1].set("self", sb);
        this.bindings.push(sb);
      }
      this.expectP("(");
      var parNames = [];
      for (;;) {
        var t = this.peek();
        if (t.t === "PUNCT" && t.v === ")") break;
        if (t.t === "NAME") { parNames.push(this.next()); this.parseNameAttrib(); }
        else if (t.t === "PUNCT" && t.v === "...") { this.next(); this.parseNameAttrib(); }
        else throw new ScanAbort();
        if (this.isP(",")) { this.next(); continue; }
        break;
      }
      this.expectP(")");
      if (this.isP(":")) { this.next(); this.parseType(); } // return type annotation
      for (var i = 0; i < parNames.length; i++) this.bind(parNames[i]);
      this.parseBlock(["end"]);
      this.pop();
      this.expectK("end");
    },
    parseTypeStmt: function (isExport) {
      if (this.isN()) this.next().typeName = true;
      if (this.isP("<")) this.skipGenerics();
      if (this.isP("=")) { this.next(); this.parseType(); }
    },
    skipGenerics: function () {
      this.expectP("<");
      var d = 1;
      while (d > 0 && !this.atEnd()) {
        var t = this.next();
        if (t.t === "PUNCT" && t.v === "<") d++;
        else if (t.t === "PUNCT" && t.v === ">") d--;
        else if (t.t === "PUNCT" && t.v === ">>") d -= 2;
        else if (t.t === "NAME") t.typeName = true;
      }
    },
    parseType: function () {
      // mini type-expression automaton; marks NAMEs as type names (not renamed)
      var guard = 0;
      var expectOperand = true;
      for (;;) {
        if (guard++ > 4096) throw new ScanAbort();
        var t = this.peek();
        if (t.t === "EOF") return;
        if (expectOperand) {
          if (t.t === "NAME") { this.next().typeName = true; expectOperand = false; continue; }
          if (t.t === "STRING" || t.t === "NUMBER") { this.next(); expectOperand = false; continue; }
          if (t.t === "KEYWORD" && (t.v === "nil" || t.v === "true" || t.v === "false")) { this.next(); expectOperand = false; continue; }
          if (t.t === "PUNCT" && (t.v === "(" || t.v === "{")) {
            var close = t.v === "(" ? ")" : "}";
            this.next();
            this.skipBalancedTo(close);
            expectOperand = false;
            continue;
          }
          if (t.t === "PUNCT" && t.v === "[") { this.next(); this.parseType(); this.expectP("]"); expectOperand = false; continue; }
          if (t.t === "KEYWORD" && (t.v === "type" || t.v === "typeof" || t.v === "export")) { this.next(); continue; }
          if (t.t === "PUNCT" && t.v === "...") { this.next(); expectOperand = false; continue; }
          return; // cannot continue type
        } else {
          if (t.t === "PUNCT" && (t.v === "." || t.v === "|")) { this.next(); expectOperand = true; continue; }
          if (t.t === "PUNCT" && t.v === "?") { this.next(); continue; }
          if (t.t === "PUNCT" && t.v === "->") { this.next(); expectOperand = true; continue; }
          if (t.t === "PUNCT" && t.v === "<") { this.next(); this.skipGenerics(); continue; }
          if (t.t === "PUNCT" && t.v === ":") { this.next(); expectOperand = true; continue; } // table field types
          if (t.t === "PUNCT" && t.v === ",") { this.next(); expectOperand = true; continue; }
          return;
        }
      }
    },
    skipBalancedTo: function (close) {
      var d = 0;
      for (;;) {
        var t = this.peek();
        if (t.t === "EOF") throw new ScanAbort();
        if (t.t === "PUNCT" && (t.v === "(" || t.v === "{" || t.v === "[")) d++;
        if (t.t === "PUNCT" && (t.v === ")" || t.v === "}" || t.v === "]")) {
          if (d === 0) {
            if (t.v === close) { this.next(); return; }
            throw new ScanAbort();
          }
          d--;
        }
        if (t.t === "NAME") t.typeName = true; // inside parens of fun(...) etc — mostly types
        this.next();
      }
    },
    parseExprStatement: function () {
      this.parseExprList();
      if (this.isP("=") || this.isP("+=") || this.isP("-=") || this.isP("*=") || this.isP("/=") ||
          this.isP("%=") || this.isP("^=") || this.isP("..=") || this.isP("|=") || this.isP("&=")) {
        this.next();
        this.parseExprList();
      }
    },
    parseExprList: function () {
      this.parseExpr();
      while (this.isP(",")) { this.next(); this.parseExpr(); }
    },
    parseExpr: function () {
      var expectOperand = true;
      var guard = 0;
      for (;;) {
        if (guard++ > 1e7) throw new ScanAbort();
        var t = this.peek();
        if (expectOperand) {
          if (t.t === "NAME") { this.resolve(this.next()); expectOperand = false; continue; }
          if (t.t === "NUMBER" || t.t === "STRING" || t.t === "LONGSTRING") { this.next(); expectOperand = false; continue; }
          if (t.t === "KEYWORD" && (t.v === "nil" || t.v === "true" || t.v === "false")) { this.next(); expectOperand = false; continue; }
          if (t.t === "PUNCT" && t.v === "...") { this.next(); expectOperand = false; continue; }
          if (t.t === "PUNCT" && (t.v === "-" || t.v === "#" || t.v === "~")) { this.next(); continue; }
          if (t.t === "KEYWORD" && t.v === "not") { this.next(); continue; }
          if (t.t === "PUNCT" && t.v === "(") { this.next(); this.parseExpr(); this.expectP(")"); expectOperand = false; continue; }
          if (t.t === "PUNCT" && t.v === "[") { this.next(); this.parseExpr(); this.expectP("]"); expectOperand = false; continue; }
          if (t.t === "PUNCT" && t.v === "{") { this.parseTable(); expectOperand = false; continue; }
          if (t.t === "KEYWORD" && t.v === "function") { this.next(); this.parseFuncBody(false); expectOperand = false; continue; }
          if (t.t === "KEYWORD" && t.v === "if") { // luau if-expression
            this.next(); this.parseExpr(); this.expectK("then"); this.parseExpr();
            while (this.isK("elseif")) { this.next(); this.parseExpr(); this.expectK("then"); this.parseExpr(); }
            this.expectK("else"); this.parseExpr();
            expectOperand = false; continue;
          }
          throw new ScanAbort();
        } else {
          if (t.t === "PUNCT") {
            var bin = ["+","-","*","/","%","^","..","==","~=","<",">","<=",">=","and","or","&","|","~","<<",">>","//"];
            if (t.v === "." || t.v === ":") {
              this.next();
              if (!this.isN()) throw new ScanAbort();
              this.next().fieldDef = true;
              expectOperand = true;
              continue;
            }
            if (t.v === "(") { this.next(); this.parseExprList(); this.expectP(")"); continue; }
            if (t.v === "[") { this.next(); this.parseExpr(); this.expectP("]"); continue; }
            if (t.v === "{") { this.parseTable(); continue; }
            if (t.v === "::") { this.next(); this.parseType(); continue; }
            if (t.v === "?") { this.next(); continue; } // luau type suffix shouldn't appear here, be lenient
            if (bin.indexOf(t.v) >= 0) { this.next(); expectOperand = true; continue; }
          }
          if (t.t === "KEYWORD" && (t.v === "and" || t.v === "or")) { this.next(); expectOperand = true; continue; }
          if (t.t === "STRING" || t.t === "LONGSTRING") { this.next(); continue; } // call sugar argument
          if (t.t === "NAME") throw new ScanAbort(); // NAME right after operand = cannot parse
          return;
        }
      }
    },
    parseTable: function () {
      this.expectP("{");
      for (;;) {
        var t = this.peek();
        if (t.t === "EOF") throw new ScanAbort();
        if (t.t === "PUNCT" && t.v === "}") { this.next(); return; }
        if (t.t === "PUNCT" && t.v === "[") {
          this.next(); this.parseExpr(); this.expectP("]"); this.expectP("="); this.parseExpr();
        } else if (t.t === "NAME" && (this.la(1).t === "PUNCT" && this.la(1).v === "=")) {
          this.next().fieldDef = true; this.next(); this.parseExpr();
        } else if (t.t === "PUNCT" && t.v === "...") {
          this.next();
        } else {
          this.parseExpr();
        }
        if (this.isP(",") || this.isP(";")) { this.next(); continue; }
        if (this.isP("}")) { this.next(); return; }
        throw new ScanAbort();
      }
    },
    fixFor: function () {} // (placeholder — real for-parser below)
  };
  /* proper for-statement parser (replaces the stub above) */
  Scanner.prototype.parseFor = function () {
    var names = [];
    if (!this.isN()) throw new ScanAbort();
    names.push(this.next());
    while (this.isP(",")) { this.next(); if (!this.isN()) throw new ScanAbort(); names.push(this.next()); }
    if (this.isP("=")) { this.next(); this.parseExpr(); while (this.isP(",")) { this.next(); this.parseExpr(); } }
    else if (this.isK("in")) { this.next(); this.parseExprList(); }
    else throw new ScanAbort();
    this.expectK("do");
    this.push();
    for (var i = 0; i < names.length; i++) this.bind(names[i]);
    this.parseBlock(["end"]);
    this.pop();
    this.expectK("end");
  };

  /* ------------------------------------------------- renamer + assembly --- */
  function collectIdentifiers(toks) {
    var s = new Set();
    for (var i = 0; i < toks.length; i++) if (toks[i].t === "NAME" || toks[i].t === "KEYWORD") s.add(toks[i].v);
    return s;
  }

  function safeRename(toks, sig, rng, notes) {
    var sc = new Scanner(sig, toks);
    try {
      sc.parseChunk();
    } catch (e) {
      if (e instanceof ScanAbort) { notes.push("renamer: parser-lite could not prove this file — local renaming skipped (output stays correct, just less renamed)"); return null; }
      throw e;
    }
    var used = collectIdentifiers(toks);
    var alloc = { used: used, next: function () { return genName(rng, used); } };
    var renamed = 0;
    for (var i = 0; i < sig.length; i++) {
      var t = sig[i];
      if (t.t !== "NAME") continue;
      if (t.fieldDef || t.labelDef || t.labelRef || t.typeName || t.attrib) continue;
      if (!t.bind) continue;
      if (!t.bind.rename) t.bind.rename = t.bind.implicit ? "self" : alloc.next();
      t.newRaw = t.bind.rename;
      renamed++;
    }
    return { scanner: sc, renamed: renamed };
  }

  /* ------------------------------------------------------- string pool --- */
  function poolStrings(sig, rng, notes) {
    var pool = [];          // arrays of byte values
    var index = new Map();  // key -> pool index
    var toConvert = [];
    for (var i = 0; i < sig.length; i++) {
      var t = sig[i];
      if (t.t !== "STRING" && t.t !== "LONGSTRING") continue;
      var bytes = t.t === "STRING" ? unescapeShort(t.v) : utf8BytesOfString(t.v);
      var key = t.t + ":" + bytes.join(",");
      if (!index.has(key)) { index.set(key, pool.length); pool.push(bytes); }
      t.poolIdx = index.get(key);
      toConvert.push(t);
    }
    if (!pool.length) return { count: 0 };
    return { pool: pool, tokens: toConvert, count: pool.length };
  }
  function utf8BytesOfString(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var code = s.charCodeAt(i);
      if (code < 0x80) out.push(code);
      else utf8EncodeBytes(s.codePointAt(i), out), i += (s.codePointAt(i) > 0xffff ? 1 : 0);
    }
    return out;
  }

  /* b85 encode helper (shared with transport) */
  var B85_POOL_CHARS = ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
    "!#$%&()*+,-./:;<=>?@[]^_{|}~").split("");
  function b85Alphabet(rng) {
    var arr = B85_POOL_CHARS.slice();
    rng.shuffle(arr);
    return arr.slice(0, 85).join("");
  }
  function b85EncodeBytes(bytes, alphabet) {
    var out = "";
    var n = bytes.length;
    var i = 0;
    for (; i + 3 < n; i += 4) {
      var v = (bytes[i] * 16777216) + (bytes[i + 1] * 65536) + (bytes[i + 2] * 256) + bytes[i + 3];
      out += alphabet.charAt(Math.floor(v / 52200625) % 85);
      out += alphabet.charAt(Math.floor(v / 614125) % 85);
      out += alphabet.charAt(Math.floor(v / 7225) % 85);
      out += alphabet.charAt(Math.floor(v / 85) % 85);
      out += alphabet.charAt(v % 85);
    }
    var rem = n - i;
    if (rem > 0) {
      var b0 = bytes[i], b1 = rem > 1 ? bytes[i + 1] : 0, b2 = rem > 2 ? bytes[i + 2] : 0;
      var v2 = b0 * 16777216 + b1 * 65536 + b2 * 256;
      var nd = rem + 1;
      for (var d = 0; d < nd; d++) out += alphabet.charAt(Math.floor(v2 / Math.pow(85, 4 - d)) % 85);
    }
    return out;
  }

  function makePoolPrelude(pool, rng, alloc, alphabet) {
    /* returns {lua, fnName} — decoder prelude placed before the payload */
    var names = [];
    for (var i = 0; i < 14; i++) names.push(alloc());
    var dFn = names[0], dataN = names[1], offsN = names[2], lensN = names[3], cacheN = names[4];
    var d85 = names[5], alN = names[6], amN = names[7], charN = names[8], byteN = names[9],
      concN = names[10], floorN = names[11], unpN = names[12], xk = rng.int(17, 240);
    /* encode pool bytes: enc[j] = (val[j] + xk + j) % 256, j = 1-based */
    var all = new Uint8Array(pool.reduce(function (a, p) { return a + p.length; }, 0));
    var offs = [], lens = [];
    var pos = 0;
    for (var pi = 0; pi < pool.length; pi++) {
      offs.push(pos + 1); lens.push(pool[pi].length);
      for (var j = 0; j < pool[pi].length; j++) all[pos + j] = (pool[pi][j] + xk + (j + 1)) % 256;
      pos += pool[pi].length;
    }
    /* b85 the data, split into literals of <= 6000 chars */
    var b85 = b85EncodeBytes(all, alphabet);
    var lits = [];
    for (var c = 0; c < b85.length; c += 6000) lits.push(b85.substr(c, 6000));
    var dataExpr = lits.map(function (l) { return d85 + '("' + l + '")'; }).join("..");
    var oTab = offs.map(function (o) { return numLit(rng, o); }).join(",");
    var lTab = lens.map(function (l) { return numLit(rng, l); }).join(",");
    var lua =
      
      "local " + alN + '="' + alphabet + '"\n' +
      "local " + amN + "={}\n" +
      "do local ii=1 while ii<=85 do " + amN + "[" + alN + ":sub(ii,ii)]=ii-1 ii=ii+1 end end\n" +
      "local " + charN + "=string.char local " + byteN + "=string.byte local " + concN + "=table.concat local " + floorN + "=math.floor local " + unpN + "=table.unpack or unpack\n" +
      "local " + d85 + "=function(s) local o={} local p=0 local nn=#s local fl=nn-(nn%5) local i=1 " +
      "while i<=fl do " +
      "local v=" + amN + "[s:sub(i,i)]*52200625+" + amN + "[s:sub(i+1,i+1)]*614125+" + amN + "[s:sub(i+2,i+2)]*7225+" + amN + "[s:sub(i+3,i+3)]*85+" + amN + "[s:sub(i+4,i+4)] " +
      "p=p+1 o[p]=" + charN + "(" + floorN + "(v/16777216)%256) " +
      "p=p+1 o[p]=" + charN + "(" + floorN + "(v/65536)%256) " +
      "p=p+1 o[p]=" + charN + "(" + floorN + "(v/256)%256) " +
      "p=p+1 o[p]=" + charN + "(v%256) i=i+5 end " +
      "local rm=nn-fl if rm>1 then " +
      "local t=s:sub(fl+1).." + alN + ":sub(85,85):rep(5-rm) " +
      "local v=" + amN + "[t:sub(1,1)]*52200625+" + amN + "[t:sub(2,2)]*614125+" + amN + "[t:sub(3,3)]*7225+" + amN + "[t:sub(4,4)]*85+" + amN + "[t:sub(5,5)] " +
      "local bb=rm-1 if bb>=1 then p=p+1 o[p]=" + charN + "(" + floorN + "(v/16777216)%256) end " +
      "if bb>=2 then p=p+1 o[p]=" + charN + "(" + floorN + "(v/65536)%256) end " +
      "if bb>=3 then p=p+1 o[p]=" + charN + "(" + floorN + "(v/256)%256) end end " +
      "local w={} local q=1 local st=1 while st<=p do local en=st+511 if en>p then en=p end " +
      "w[q]=" + concN + '(o,"",st,en) q=q+1 st=en+1 end ' +
      "return " + concN + "(w) end\n" +
      "local " + dataN + "=" + dataExpr + "\n" +
      "local " + offsN + "={" + oTab + "}\n" +
      "local " + lensN + "={" + lTab + "}\n" +
      "local " + cacheN + "={}\n" +
      "local function " + dFn + "(ix)\n" +
      "  local id=ix+1\n" +
      "  local c=" + cacheN + "[id]\n" +
      "  if c~=nil then return c end\n" +
      "  local o=" + offsN + "[id] local l=" + lensN + "[id]\n" +
      "  if not o or not l or l<=0 then " + cacheN + "[id]='' return '' end\n" +
      "  local out={} local i=1\n" +
      "  while i<=l do\n" +
      "    local b=" + byteN + "(" + dataN + ",o+i-1)\n" +
      "    out[i]=" + charN + "(((b-" + xk + "-i)%256+256)%256)\n" +
      "    i=i+1\n" +
      "  end\n" +
      "  local s=" + concN + "(out)\n" +
      "  " + cacheN + "[id]=s\n" +
      "  return s\n" +
      "end\n";
    return { lua: lua, fnName: dFn };
  }

  /* ------------------------------------------------------- junk decoys --- */
  var JUNK_DECOY_STRINGS = ["lm", "guard", "stage", "vm", "layer", "sig", "probe", "env", "key", "salt", "iv", "hmac", "digest", "seed", "round", "nonce"];
  function makeJunk(rng, alloc, count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var a = alloc(), b = alloc();
      switch (Math.floor(rng.next() * 6)) {
        case 0: out.push("local " + a + "=" + numLit(rng, rng.int(100, 999999))); break;
        case 1: out.push("local " + a + "=" + b + "%" + numLit(rng, rng.int(7, 4096))); break;
        case 2: out.push("local " + a + "=function(x_) return ((x_ or 0)+" + numLit(rng, rng.int(3, 8191)) + ")%" + numLit(rng, rng.int(97, 65521)) + " end"); break;
        case 3: out.push("if " + a + "==" + numLit(rng, rng.int(1, 99999)) + " then local " + b + "=true else local " + b + "=false end"); break;
        case 4: out.push("local " + a + "," + b + "=" + numLit(rng, rng.int(2, 9999)) + "," + numLit(rng, rng.int(2, 9999))); break;
        default: out.push("local " + a + "='" + rng.pick(JUNK_DECOY_STRINGS) + rng.int(1000, 9999) + "'"); break;
      }
    }
    return out.join("\n");
  }

  /* ------------------------------------------------------------- CFF ----- */
  function wrapCFF(payloadText, rng, alloc, opts) {
    var fn = alloc(), st = alloc(), a1 = alloc(), a2 = alloc();
    var nJunk = opts.controlFlow ? rng.int(2, 4) : 1;
    var states = [];
    var S_PAYLOAD = rng.int(101, 899), S_EXIT = 0;
    var cur = S_PAYLOAD;
    for (var k = 0; k < nJunk; k++) {
      var s;
      do { s = rng.int(101, 899); } while (s === S_PAYLOAD || states.indexOf(s) >= 0);
      states.push(s);
    }
    var S_INIT = states.length ? states[0] : S_PAYLOAD;
    var lines = [];
    lines.push("local function " + fn + "(...)");
    lines.push("local " + st + "=" + numLit(rng, S_INIT));
    lines.push("local " + a1 + "," + a2 + "=0,0");
    lines.push("while " + st + "~=" + S_EXIT + " do");
    lines.push("if " + st + "==" + numLit(rng, S_PAYLOAD) + " then");
    lines.push(payloadText);
    lines.push(st + "=" + S_EXIT);
    var next = S_PAYLOAD;
    for (var k2 = states.length - 1; k2 >= 0; k2--) {
      var sN = states[k2];
      lines.push("elseif " + st + "==" + numLit(rng, sN) + " then");
      lines.push(a1 + "=" + numLit(rng, rng.int(11, 7900)) + " " + a2 + "=(" + a1 + "%" + numLit(rng, rng.int(7, 499)) + ")+" + numLit(rng, rng.int(2, 97)));
      lines.push(st + "=" + numLit(rng, next));
      next = sN;
    }
    lines.push("else");
    lines.push(st + "=" + S_EXIT);
    lines.push("end");
    lines.push("end");
    lines.push("return ...");
    lines.push("end");
    lines.push("return " + fn + "(...)");
    return lines.join("\n");
  }

  /* ====================================================== transports ===== */
  function textEncoder() {
    if (typeof TextEncoder !== "undefined") return new TextEncoder();
    return { encode: function (s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff; return a; } };
  }
  function djb2Bytes(bytes) {
    var h = 5381;
    for (var i = 0; i < bytes.length; i++) h = (h * 33 + bytes[i]) % 4294967296;
    return h >>> 0;
  }

  function rleEncode(bytes) {
    var n = bytes.length;
    var out = [];
    var i = 0;
    while (i < n) {
      var run = 1;
      while (run < 129 && i + run < n && bytes[i + run] === bytes[i]) run++;
      if (run >= 3) { out.push(128 + run - 2, bytes[i]); i += run; continue; }
      var lit = [];
      while (i < n && lit.length < 128) {
        var r2 = 1;
        while (r2 < 3 && i + r2 < n && bytes[i + r2] === bytes[i]) r2++;
        if (r2 >= 3 && lit.length > 0) break;
        lit.push(bytes[i]); i++;
      }
      out.push(lit.length - 1);
      for (var q = 0; q < lit.length; q++) out.push(lit[q]);
    }
    return new Uint8Array(out);
  }

  function makeXorKeys(rng) {
    function key() {
      var len = rng.int(19, 53), a = [];
      for (var i = 0; i < len; i++) a.push(rng.int(1, 255));
      return a;
    }
    return [key(), key(), key(), key()];
  }

  function xor4Crypt(bytes, keys) {
    var k1 = keys[0], k2 = keys[1], k3 = keys[2], k4 = keys[3];
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[i];
      b ^= k1[i % k1.length];
      b ^= k2[i % k2.length];
      b ^= k3[i % k3.length];
      b ^= k4[i % k4.length];
      bytes[i] = b & 0xff;
    }
  }

  function rc4Crypt(bytes, key) {
    var S = new Uint8Array(256);
    for (var i = 0; i < 256; i++) S[i] = i;
    var j = 0;
    for (var i2 = 0; i2 < 256; i2++) {
      j = (j + S[i2] + key[i2 % key.length]) % 256;
      var t = S[i2]; S[i2] = S[j]; S[j] = t;
    }
    var a = 0, b = 0;
    for (var p = 0; p < bytes.length; p++) {
      a = (a + 1) % 256;
      b = (b + S[a]) % 256;
      var t2 = S[a]; S[a] = S[b]; S[b] = t2;
      bytes[p] = (bytes[p] ^ S[(S[a] + S[b]) % 256]) & 0xff;
    }
  }

  var PERM_BLOCK = 8192;
  function permuteBlocks(bytes, seed) {
    var n = bytes.length;
    var src = bytes.slice(); /* copy! subarray() is a view and would corrupt in-place */
    for (var base = 0; base < n; base += PERM_BLOCK) {
      var L = Math.min(PERM_BLOCK, n - base);
      var blk = base / PERM_BLOCK;
      var perm = new Array(L);
      for (var i = 0; i < L; i++) perm[i] = i + 1; /* 1-based */
      var A = (seed * 31 + blk * 7919) % 65536;
      var B = (seed * 17 + blk * 104729) % 4096;
      for (var ii = L; ii >= 2; ii--) {
        A = (A * 25173 + 13849) % 65536;
        B = (B * 5673 + 11) % 4096;
        var r = A * 4096 + B;
        var j = (r % ii) + 1;
        var t = perm[ii - 1]; perm[ii - 1] = perm[j - 1]; perm[j - 1] = t;
      }
      for (var k = 1; k <= L; k++) bytes[base + perm[k - 1] - 1] = src[base + k - 1];
    }
  }

  /* ============================================== loader emission ======== */
  var B85_CHUNK_BYTES = 4096;
  function emitLoader(o) {
    /* o: { rng, alloc, chunks, order, keys, rc4key, seed, alphabet, vm, oeld, sig, opts, brand } */
    var rng = o.rng, alloc = o.alloc, opts = o.opts;
    var N = {};
    var NEED = ["rg", "by", "chr", "cc", "fl", "xr", "up", "ld", "al", "am", "d85", "dt", "om",
      "ka", "kb", "kc", "kd", "rk", "sd", "sg", "t0", "dtc", "cht", "s1", "s", "rj", "ra", "rb",
      "parts", "buf", "bn", "pb", "rst", "rc", "xc", "bs", "tt", "base", "L", "P", "bi", "pa",
      "pb2", "j", "b", "q", "i", "plain", "fn", "er", "trip", "sc", "wm", "y", "cn", "h", "pg",
      "st", "isr", "t1", "a1", "o1"];
    for (var i = 0; i < NEED.length; i++) N[NEED[i]] = alloc();
    var L = [];
    function w(s) { L.push(s); }

    if (o.brand) w(BRAND_LINE);
    w("local " + N.rg + "=rawget or function(t,k) return t[k] end");
    w("local " + N.by + "=(string and string.byte) or " + N.rg + '(_G,"string.byte")');
    w("local " + N.chr + "=(string and string.char) or " + N.rg + '(_G,"string.char")');
    w("local " + N.cc + "=(table and table.concat) or " + N.rg + '(_G,"table.concat")');
    w("local " + N.fl + "=(math and math.floor) or " + N.rg + '(_G,"math.floor")');
    w("local " + N.xr + "=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b) local r,p=0,1 for _=1,8 do local x,y=a%2,b%2 if x~=y then r=r+p end a=(a-x)/2 b=(b-y)/2 p=p*2 end return r end");
    w("local " + N.up + "=(table and (table.unpack or unpack)) or unpack");
    w("local " + N.ld + "=(function() if type(loadstring)==\"function\" then return loadstring end if type(load)==\"function\" then return load end local ok,g=pcall(function() if getgenv then return getgenv() end end) if ok and type(g)==\"table\" then local f=" + N.rg + '(g,"loadstring") or ' + N.rg + '(g,"load") if type(f)=="function" then return f end end if _G then local f=' + N.rg + '(_G,"loadstring") or ' + N.rg + '(_G,"load") if type(f)=="function" then return f end end return nil end)()');
    w("if not " + N.ld + " then error(\"[LuaMore] unable to initialize loader\",0) end");
    w("local " + N.al + '="' + o.alphabet + '"');
    w("local " + N.am + "={}");
    w("do local ii=1 while ii<=85 do " + N.am + "[" + N.al + ":sub(ii,ii)]=ii-1 ii=ii+1 end end");
    /* base85 decoder -> string */
    w("local function " + N.d85 + "(s)");
    w("local o={} local p=0 local nn=#s local fq=nn-(nn%5) local i=1");
    w("while i<=fq do");
    w("local v=" + N.am + "[s:sub(i,i)]*52200625+" + N.am + "[s:sub(i+1,i+1)]*614125+" + N.am + "[s:sub(i+2,i+2)]*7225+" + N.am + "[s:sub(i+3,i+3)]*85+" + N.am + "[s:sub(i+4,i+4)]");
    w("p=p+1 o[p]=" + N.chr + "(" + N.fl + "(v/16777216)%256)");
    w("p=p+1 o[p]=" + N.chr + "(" + N.fl + "(v/65536)%256)");
    w("p=p+1 o[p]=" + N.chr + "(" + N.fl + "(v/256)%256)");
    w("p=p+1 o[p]=" + N.chr + "(v%256) i=i+5 end");
    w("local rm=nn-fq if rm>1 then");
    w("local t=s:sub(fq+1).." + N.al + ":sub(85,85):rep(5-rm)");
    w("local v=" + N.am + "[t:sub(1,1)]*52200625+" + N.am + "[t:sub(2,2)]*614125+" + N.am + "[t:sub(3,3)]*7225+" + N.am + "[t:sub(4,4)]*85+" + N.am + "[t:sub(5,5)]");
    w("local bb=rm-1 if bb>=1 then p=p+1 o[p]=" + N.chr + "(" + N.fl + "(v/16777216)%256) end");
    w("if bb>=2 then p=p+1 o[p]=" + N.chr + "(" + N.fl + "(v/65536)%256) end");
    w("if bb>=3 then p=p+1 o[p]=" + N.chr + "(" + N.fl + "(v/256)%256) end end");
    w("local w2={} local q=1 local st=1 while st<=p do local en=st+511 if en>p then en=p end");
    w("w2[q]=" + N.cc + '(o,"",st,en) q=q+1 st=en+1 end');
    w("return " + N.cc + "(w2) end");

    /* ---- outer shell (oeld): watermark + stdlib invariants ---- */
    if (o.oeld) {
      var WMV = "Protected using LuaMore Obfuscator https://luamore.app/";
      w("do");
      w("local " + N.y + "={l={u={a={m={o={r={e={[\"obfuscator\"]=\"" + WMV + "\"}}}}}}}}");
      w("local function " + N.wm + "()");
      w("return " + N.y + " and " + N.y + ".l and " + N.y + ".l.u and " + N.y + ".l.u.a and " + N.y + ".l.u.a.m and " + N.y + ".l.u.a.m.o and " + N.y + ".l.u.a.m.o.r and " + N.y + ".l.u.a.m.o.r.e and " + N.y + ".l.u.a.m.o.r.e[\"obfuscator\"]==\"" + WMV + "\"");
      w("end");
      w("if not " + N.wm + "() then return end");
      w("if " + N.fl + "(3.9)~=3 or " + N.fl + "(9.5)~=9 then return end");
      w("if " + N.by + "(\"A\")~=65 or " + N.chr + "(65)~=\"A\" then return end");
      w("if " + N.cc + "({\"L\",\"M\"})~=\"LM\" then return end");
      w("local " + N.cn + "=88");
      w("if " + N.cn + "~=" + N.cn + " or " + N.cn + "*0~=0 or " + N.cn + "<0 then return end");
      w("end");
    }

    /* ---- innermost shield (vm): integrity + anti-hook + anti-env-log ---- */
    if (o.vm) {
      w("local " + N.trip + "=0");
      w("local " + N.sc + "=0");
      w("if " + N.fl + "(3.9)~=3 or " + N.fl + "(9.5)~=9 or " + N.fl + "(-0.5)~=-1 then " + N.trip + "=2 end");
      w("if " + N.by + "(\"A\")~=65 or " + N.chr + "(65)~=\"A\" or " + N.by + "(\"Z\")~=90 then " + N.trip + "=2 end");
      w("if " + N.cc + "({\"L\",\"M\"})~=\"LM\" then " + N.trip + "=2 end");
      w("do local ct={} ct[" + numLit(rng, 5931) + "]=" + numLit(rng, 5931) + " if rawget and rawget(ct," + numLit(rng, 5931) + ")~=" + numLit(rng, 5931) + " then " + N.trip + "=2 end end");
      w("if pcall(error,\"\\0\",0) then " + N.trip + "=2 end");
      w("if pcall(function() error(\"x\",0) end) then " + N.trip + "=2 end");
      /* anti-hook: environment metamethod traps + active debug hook */
      w("if type(getfenv)==\"function\" then");
      w("local ok,env=pcall(getfenv,1)");
      w("if ok and type(env)==\"table\" then");
      w("local okm,mt=pcall(getmetatable,env)");
      w("if okm and type(mt)==\"table\" and type(mt.__newindex)==\"function\" then " + N.sc + "=" + N.sc + "+2 end");
      w("end end");
      w("if debug and type(debug.gethook)==\"function\" then");
      w("local okh,hf,hm=pcall(debug.gethook)");
      w("if okh and type(hf)==\"function\" and hm and hm~=\"\" then " + N.sc + "=" + N.sc + "+2 end");
      w("end");
      /* --- Roblox environment probes (anti env-log / mock detection) --- */
      w("local " + N.isr + "=false");
      w("if type(typeof)==\"function\" then local orr,rr=pcall(typeof,game) if orr and rr==\"Instance\" then " + N.isr + "=true end end");
      w("if " + N.isr + " then");
      w("local P=pcall");
      /* P1: GetPlayerFromCharacter(workspace) + LocalPlayer fingerprints */
      w("do local ok,WS=P(function() return game:GetService(\"Players\") end)");
      w("if ok and WS then");
      w("local o1,r1=P(WS.GetPlayerFromCharacter,WS,workspace)");
      w("if o1 and r1~=nil then " + N.trip + "=2 end");
      w("local o2,LP=P(function() return WS.LocalPlayer end)");
      w("if o2 and LP~=nil then");
      w("local ou,uid=P(function() return LP.UserId end)");
      w("local on,nm=P(function() return LP.Name end)");
      w("if (ou and uid==" + numLit(rng, 123456789) + ") or (on and nm==\"vole7vin\") then " + N.trip + "=2 end");
      w("end end end");
      /* mock place fingerprints */
      w("do local op,pid=P(function() return game.PlaceId end)");
      w("if op and pid==" + numLit(rng, 8916037983) + " then " + N.trip + "=2 end");
      w("local og,gid=P(function() return game.GameId end)");
      w("if og and gid==" + numLit(rng, 8916037983) + " then " + N.trip + "=2 end end");
      /* P2: GuiService */
      w("do local ok,GS=P(function() return game:GetService(\"GuiService\") end)");
      w("if ok and GS then");
      w("local o1,orig=P(function() return GS.SelectedObject end)");
      w("if o1 then");
      w("local o2=P(function() GS.SelectedObject=nil end)");
      w("if o2 then");
      w("local o3,cur=P(function() return GS.SelectedObject end)");
      w("if o3 and cur~=nil then " + N.sc + "=" + N.sc + "+1 end");
      w("end");
      w("local o4=P(function() GS.SelectedObject=Instance.new(\"Part\") end)");
      w("if o4 then " + N.trip + "=2 end");
      w("if orig~=nil then P(function() GS.SelectedObject=orig end) end");
      w("end end end");
      /* P3: TweenService invalid goal */
      w("do local ok,TS=P(function() return game:GetService(\"TweenService\") end)");
      w("if ok and TS then");
      w("local o=P(function() return TS:Create(Instance.new(\"Part\"),TweenInfo.new(1),{Position=\"detected fr?\",CFrame=true}) end)");
      w("if o then " + N.trip + "=2 end end end");
      /* P4: DataStore invalid name */
      w("do local ok,DS=P(function() return game:GetService(\"DataStoreService\") end)");
      w("if ok and DS then");
      w("local o=P(DS.GetDataStore,DS,\"logger_trap//invalid@chars\",\"scope\")");
      w("if o then " + N.trip + "=2 end end end");
      /* P5: StarterPlayerScripts shape */
      w("do local ok,SP=P(function() return game:GetService(\"StarterPlayer\") end)");
      w("if ok and SP then");
      w("local o2,SPS=P(function() return SP:FindFirstChild(\"StarterPlayerScripts\") end)");
      w("if o2 and SPS==nil then " + N.sc + "=" + N.sc + "+1");
      w("elseif o2 and SPS then");
      w("local okc,kids=P(function() return SPS:GetChildren() end)");
      w("if okc and type(kids)==\"table\" and #kids<" + numLit(rng, 2) + " then " + N.sc + "=" + N.sc + "+1 end");
      w("end end end");
      /* P6: ProximityPrompt synchronous fire (mock only, no wait => no false positives) */
      w("do local ok,PS=P(function() return game:GetService(\"ProximityPromptService\") end)");
      w("if ok and PS then");
      w("local shown=false local cn2");
      w("local okc=P(function() cn2=PS.PromptShown:Connect(function() shown=true end) end)");
      w("if okc and cn2 then");
      w("local okp=P(function() local pp=Instance.new(\"Part\") pp.Parent=workspace local pr=Instance.new(\"ProximityPrompt\") pr.Parent=pp pp:Destroy() end)");
      w("if okp and shown then " + N.sc + "=" + N.sc + "+1 end");
      w("P(function() cn2:Disconnect() end)");
      w("end end end");
      /* P7: Teams "Neutral" shape */
      w("do local ok,TM=P(function() return game:GetService(\"Teams\") end)");
      w("if ok and TM then");
      w("local o,nt=P(function() return TM:FindFirstChild(\"Neutral\") end)");
      w("if o and nt then");
      w("local o2,tc=P(function() return nt.TeamColor end)");
      w("if o2 and tc and tostring(tc)~=\"Medium stone grey\" then " + N.sc + "=" + N.sc + "+1 end");
      w("end end end");
      /* P8: GroupService (web call; only when probeLevel=full) */
      if (opts.envProbeLevel !== "fast") {
        w("do local ok,Lp=P(function() return game:GetService(\"Players\").LocalPlayer end)");
        w("if ok and Lp then");
        w("local okg,GS2=P(function() return game:GetService(\"GroupService\") end)");
        w("if okg and GS2 then");
        w("local ou,uid=P(function() return Lp.UserId end)");
        w("if ou and uid then");
        w("local og,gr=P(GS2.GetGroupsAsync,GS2,uid)");
        w("if og and type(gr)==\"table\" and #gr<1 then " + N.sc + "=" + N.sc + "+1 end");
        w("end end end end");
      }
      /* studio vs live split for legacy sandbox fingerprints */
      w("local studio=false");
      w("do local ors,RS2=P(function() return game:GetService(\"RunService\") end)");
      w("if ors and RS2 then local os2,isSt=P(function() return RS2:IsStudio() end) if os2 and isSt then studio=true end end end");
      if (opts.blockStudio) {
        w("if studio then " + N.sc + "=" + N.sc + "+3 end");
      }
      w("if not studio then");
      w("do local oj,jid=P(function() return game.JobId end)");
      w("if oj and jid==\"00000000-0000-0000-0000-000000000000\" then " + N.sc + "=" + N.sc + "+2 end");
      w("local okws,WS3=P(function() return game:GetService(\"Workspace\") end)");
      w("if okws and WS3 then");
      w("local ow,wx=P(function() return WS3:IsA(\"WorldRoot\") end)");
      w("if ow and wx==false then " + N.trip + "=2 end");
      w("local of,fn=P(function() return WS3:GetFullName() end)");
      w("if of and type(fn)==\"string\" and fn:sub(1,5)==\"Game.\" then " + N.trip + "=2 end");
      w("end end");
      w("do local ol,LI=P(function() return game:GetService(\"Lighting\") end)");
      w("if ol and LI then");
      w("local oa,la=P(function() return LI.GeographicLatitude end)");
      w("local ob,fg=P(function() return LI.FogEnd end)");
      w("if oa and ob and la==" + (41.7) + " and fg==" + numLit(rng, 100000) + " then " + N.sc + "=" + N.sc + "+2 end");
      w("end end");
      w("do local osd,SO=P(function() return game:GetService(\"SoundService\") end)");
      w("if osd and SO then");
      w("local od,df=P(function() return SO.DistanceFactor end)");
      w("local or2,rs2=P(function() return SO.RolloffScale end)");
      w("if od and or2 and df==" + (3.33) + " and rs2==1 then " + N.sc + "=" + N.sc + "+2 end");
      w("end end");
      w("end");
      w("end");
    }

    /* ---- data tables ----
       dt: chunks in PHYSICAL (shuffled) order — a positional array.
       om: logical->physical index map, so the loader reassembles the
       stream in logical order. The source stays scrambled; the decode
       does not. (This is the v11 scatter done correctly.) */
    var phys = o.order; /* phys[i] = logical chunk index at physical position i */
    var omIdx = new Array(phys.length);
    for (var pi = 0; pi < phys.length; pi++) omIdx[phys[pi]] = pi;
    var dt = ["local " + N.dt + "={"];
    for (var di = 0; di < phys.length; di++) {
      dt.push("\"" + o.chunks[phys[di]] + "\",");
    }
    dt.push("}");
    w(dt.join(""));
    var om = omIdx.map(function (v) { return numLit(rng, v); }).join(",");
    w("local " + N.om + "={" + om + "}");
    function keyTab(name, arr) { w("local " + name + "={" + arr.join(",") + "}"); }
    keyTab(N.ka, o.keys[0]); keyTab(N.kb, o.keys[1]); keyTab(N.kc, o.keys[2]); keyTab(N.kd, o.keys[3]);
    keyTab(N.rk, o.rc4key);
    w("local " + N.sd + "=" + numLit(rng, o.seed));
    if (o.vm && o.sig != null) w("local " + N.sg + "=" + numLit(rng, o.sig));

    /* ---- assemble + decode ---- */
    if (o.vm) w("local " + N.t0 + "=(os and os.clock) and os.clock() or 0");
    w("local " + N.cht + "={}");
    w("do local k=0 while k<#" + N.om + " do " + N.cht + "[k+1]=" + N.d85 + "(" + N.dt + "[" + N.om + "[k+1]+1]) k=k+1 end end");
    w("local " + N.s1 + "=" + N.cc + "(" + N.cht + ")");
    if (o.vm) {
      w("local " + N.dtc + "=((os and os.clock) and os.clock() or " + N.t0 + ")-" + N.t0);
      w("if " + N.dtc + ">(45+#" + N.s1 + "/65536*10) then " + N.sc + "=" + N.sc + "+2 end");
      w("if " + N.sc + ">=3 and " + N.trip + "==0 then " + N.trip + "=1 end");
      w("if " + N.trip + "~=0 then do local i2=1 while i2<=#" + N.rk + " do " + N.rk + "[i2]=(" + N.rk + "[i2]+i2*7)%256 i2=i2+1 end end end");
    }
    /* rc4 */
    w("local " + N.s + "={}");
    w("do local i=0 while i<=255 do " + N.s + "[i]=i i=i+1 end end");
    w("local " + N.rj + "=0");
    w("do local i=0 while i<=255 do " + N.rj + "=(" + N.rj + "+" + N.s + "[i]+" + N.rk + "[(i%#" + N.rk + ")+1])%256 " + N.s + "[i]," + N.s + "[" + N.rj + "]=" + N.s + "[" + N.rj + "]," + N.s + "[i] i=i+1 end end");
    w("local " + N.ra + "," + N.rb + "=0,0");
    /* output buffers */
    w("local " + N.parts + "={} local " + N.buf + "={} local " + N.bn + "=0");
    w("local function " + N.pb + "(b)");
    w(N.bn + "=" + N.bn + "+1");
    w(N.buf + "[" + N.bn + "]=" + N.chr + "(b)");
    w("if " + N.bn + ">=2048 then " + N.parts + "[#" + N.parts + "+1]=" + N.cc + "(" + N.buf + ',"",1,' + N.bn + ") " + N.bn + "=0 end");
    w("end");
    /* rle state */
    w("local " + N.rst + "=0 local " + N.rc + "=0");
    w("local " + N.xc + "=0");
    /* block loop */
    w("local " + N.bs + "=" + PERM_BLOCK);
    w("local " + N.tt + "=#" + N.s1);
    w("local " + N.base + "=0");
    w("while " + N.base + "<" + N.tt + " do");
    w("local " + N.L + "=" + N.tt + "-" + N.base);
    w("if " + N.L + ">" + N.bs + " then " + N.L + "=" + N.bs + " end");
    w("local " + N.P + "={}");
    w("do local i=1 while i<=" + N.L + " do " + N.P + "[i]=i i=i+1 end end");
    w("local " + N.bi + "=" + N.base + "/" + N.bs);
    w("local " + N.pa + "=(" + N.sd + "*31+" + N.bi + "*7919)%65536");
    w("local " + N.pb2 + "=(" + N.sd + "*17+" + N.bi + "*104729)%4096");
    w("local i=" + N.L);
    w("while i>=2 do");
    w(N.pa + "=(" + N.pa + "*25173+13849)%65536");
    w(N.pb2 + "=(" + N.pb2 + "*5673+11)%4096");
    w("local r=" + N.pa + "*4096+" + N.pb2);
    w("local j=r%i+1");
    w(N.P + "[i]," + N.P + "[j]=" + N.P + "[j]," + N.P + "[i]");
    w("i=i-1 end");
    w("local j=1");
    w("while j<=" + N.L + " do");
    w("local b=" + N.by + "(" + N.s1 + "," + N.base + "+" + N.P + "[j])");
    w(N.ra + "=(" + N.ra + "+1)%256");
    w(N.rb + "=(" + N.rb + "+" + N.s + "[" + N.ra + "])%256");
    w(N.s + "[" + N.ra + "]," + N.s + "[" + N.rb + "]=" + N.s + "[" + N.rb + "]," + N.s + "[" + N.ra + "]");
    w("b=" + N.xr + "(b," + N.s + "[(" + N.s + "[" + N.ra + "]+" + N.s + "[" + N.rb + "])%256])");
    w(N.xc + "=" + N.xc + "+1");
    w("b=" + N.xr + "(b," + N.ka + "[((" + N.xc + "-1)%#" + N.ka + ")+1])");
    w("b=" + N.xr + "(b," + N.kb + "[((" + N.xc + "-1)%#" + N.kb + ")+1])");
    w("b=" + N.xr + "(b," + N.kc + "[((" + N.xc + "-1)%#" + N.kc + ")+1])");
    w("b=" + N.xr + "(b," + N.kd + "[((" + N.xc + "-1)%#" + N.kd + ")+1])");
    w("if " + N.rst + "==0 then");
    w("if b>=128 then " + N.rst + "=1 " + N.rc + "=b-128+2");
    w("else " + N.rst + "=3 " + N.rc + "=b+1 end");
    w("elseif " + N.rst + "==1 then");
    w("local q=1 while q<=" + N.rc + " do " + N.pb + "(b) q=q+1 end");
    w(N.rst + "=0");
    w("else");
    w(N.pb + "(b)");
    w(N.rc + "=" + N.rc + "-1");
    w("if " + N.rc + "<=0 then " + N.rst + "=0 end");
    w("end");
    w("j=j+1 end");
    w(N.base + "=" + N.base + "+" + N.L);
    w("end");
    w("if " + N.bn + ">0 then " + N.parts + "[#" + N.parts + "+1]=" + N.cc + "(" + N.buf + ',"",1,' + N.bn + ") end");
    w("local " + N.plain + "=" + N.cc + "(" + N.parts + ")");
    if (o.vm && o.sig != null) {
      w("do local h=5381 local i=1 local nn=#" + N.plain);
      w("while i<=nn do h=(h*33+" + N.by + "(" + N.plain + ",i))%4294967296 i=i+1 end");
      w("if h~=" + N.sg + " then return end end");
    }
    w("local " + N.fn + "," + N.er + "=" + N.ld + "(" + N.plain + ',\"=LM\")');
    w("if not " + N.fn + " then error(\"[LuaMore] execution failure: \"..tostring(" + N.er + "),0) end");
    w("return " + N.fn + "(...)");
    return L.join("\n");
  }

  var __payloadCapture = [];
  function transportLayer(payloadText, rng, o) {
    var enc = textEncoder();
    var bytes = enc.encode(payloadText);
    if (API.__capture) __payloadCapture.push(payloadText);
    var __layerCapture = API.__captureLayers = API.__captureLayers || [];
    /* RLE -> XOR4 -> RC4 -> block permute */
    bytes = rleEncode(bytes);
    var __dbg = API.__captureStages = API.__captureStages || [];
    if (API.__capture) __dbg.push({ stage: "rle", bytes: bytes.slice() });
    var keys = makeXorKeys(rng);
    xor4Crypt(bytes, keys);
    if (API.__capture) __dbg.push({ stage: "xor", keys: keys, bytes: bytes.slice() });
    var rc4key = [];
    for (var i = 0; i < rng.int(32, 48); i++) rc4key.push(rng.int(1, 255));
    rc4Crypt(bytes, rc4key);
    if (API.__capture) __dbg.push({ stage: "rc4", key: rc4key, bytes: bytes.slice() });
    var seed = rng.int(1, 65535);
    permuteBlocks(bytes, seed);
    if (API.__capture) __dbg.push({ stage: "perm", seed: seed, bytes: bytes.slice() });
    /* chunk + scatter */
    var chunks = [];
    for (var c = 0; c < bytes.length; c += B85_CHUNK_BYTES) {
      chunks.push(b85EncodeBytes(bytes.subarray(c, Math.min(c + B85_CHUNK_BYTES, bytes.length)), o.alphabet));
    }
    var order = [];
    for (var k = 0; k < chunks.length; k++) order.push(k);
    rng.shuffle(order);
    var alloc = NameAllocator(rng);
    if (API.__capture) __layerCapture.push({ chunks: chunks, order: order, keys: keys, rc4key: rc4key, seed: seed, alphabet: o.alphabet });
    return emitLoader({
      rng: rng, alloc: alloc.next.bind(alloc), chunks: chunks, order: order,
      keys: keys, rc4key: rc4key, seed: seed, alphabet: o.alphabet,
      vm: !!o.vm, oeld: !!o.oeld, sig: o.sig != null ? o.sig : null,
      opts: o.opts, brand: !!o.brand
    });
  }

  /* ========================================================= pipeline ==== */
  var MAX_SOURCE_BYTES = 512 * 1024 * 1024;   /* hard cap: 512 MB */
  var TOKEN_PASS_LIMIT = 4 * 1024 * 1024;     /* renamer/pool/junk only below 4 MB */
  var JUNK_LIMIT = 4 * 1024 * 1024;
  var POOL_LIMIT = 2 * 1024 * 1024;           /* pooled string data cap */

  var DEFAULTS = {
    vmDepth: 0,               /* 0 = auto (source-size aware), else 1..6 */
    stringEncryption: true,
    renameLocals: true,
    junkCode: true,
    controlFlow: true,
    antiTamper: true,         /* outer shell invariants + watermark */
    antiHook: true,           /* env metamethod traps + debug hook detection */
    antiEnvLog: true,         /* roblox mock/env-log probes (P1..P8 + fingerprints) */
    antiDump: true,           /* payload djb2 signature verify */
    blockStudio: false,       /* trip when RunService:IsStudio() */
    envProbeLevel: "full",    /* "full" includes the GroupService web probe */
    seed: null                /* deterministic builds when set */
  };
  var OPTION_KEYS = Object.keys(DEFAULTS);

  function validateOptions(userOpts) {
    var o = {};
    var u = userOpts || {};
    if (typeof u !== "object") throw new Error("options must be an object");
    for (var k in u) {
      if (OPTION_KEYS.indexOf(k) < 0) throw new Error("unknown option: " + k + " (valid: " + OPTION_KEYS.join(", ") + ")");
    }
    for (var i = 0; i < OPTION_KEYS.length; i++) {
      var key = OPTION_KEYS[i];
      o[key] = u[key] === undefined ? DEFAULTS[key] : u[key];
    }
    var bools = ["stringEncryption", "renameLocals", "junkCode", "controlFlow", "antiTamper",
      "antiHook", "antiEnvLog", "antiDump", "blockStudio"];
    for (var b = 0; b < bools.length; b++) {
      if (typeof o[bools[b]] !== "boolean") throw new Error("option " + bools[b] + " must be a boolean");
    }
    if (o.vmDepth !== 0 && (typeof o.vmDepth !== "number" || o.vmDepth < 1 || o.vmDepth > 6 || Math.floor(o.vmDepth) !== o.vmDepth)) {
      throw new Error("option vmDepth must be 0 (auto) or an integer 1-6");
    }
    if (o.envProbeLevel !== "full" && o.envProbeLevel !== "fast") throw new Error('option envProbeLevel must be "full" or "fast"');
    if (o.seed !== null && (typeof o.seed !== "number" || o.seed < 0 || o.seed > 4294967295)) {
      throw new Error("option seed must be null or an integer 0-4294967295");
    }
    return o;
  }

  function autoDepth(n) {
    if (n < 64 * 1024) return 4;
    if (n < 1024 * 1024) return 3;
    if (n < 8 * 1024 * 1024) return 2;
    return 1;
  }

  function assembleOutput(toks, sig, poolInfo, poolFnName, rng, stmtStarts, junkOpts) {
    var out = [];
    /* junk cadence: one decoy per N chunk-level statements (cap via junkOpts.count) */
    var nStmts = stmtStarts.length;
    var junkEvery = (junkOpts && junkOpts.count > 0 && nStmts > 1)
      ? Math.max(1, Math.floor((nStmts - 1) / junkOpts.count)) : 0;
    var boundarySet = new Set();
    for (var s = 1; s < nStmts; s++) boundarySet.add(stmtStarts[s]);
    var boundariesPassed = 0;
    var sigIdx = -1;
    /* pre-pass: mark prev significant token type for sugar-call wrapping */
    var prevSig = null;
    for (var i = 0; i < sig.length; i++) {
      var st = sig[i];
      st.prevSig = prevSig;
      prevSig = st;
    }
    for (var t = 0; t < toks.length; t++) {
      var tok = toks[t];
      if (tok.t === "SPACE") { out.push(" "); continue; }
      if (tok.t === "COMMENT") continue;
      sigIdx++;
      if (junkEvery > 0 && boundarySet.has(sigIdx)) {
        boundariesPassed++;
        if (boundariesPassed % junkEvery === 0 && junkOpts.made < junkOpts.count) {
          out.push("\n" + junkOpts.next() + "\n");
        }
      }
      if (tok.poolIdx != null && poolFnName) {
        var pv = tok.prevSig;
        var wrap = pv && (pv.t === "NAME" || (pv.t === "PUNCT" && (pv.v === ")" || pv.v === "]" || pv.v === "}")));
        var call = poolFnName + "(" + numLit(rng, tok.poolIdx) + ")";
        out.push(wrap ? "(" + call + ")" : call);
        continue;
      }
      out.push(tok.newRaw != null ? tok.newRaw : tok.raw);
    }
    return out.join("");
  }

  function nowMs() {
    return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  }

  function entropyOf(str) {
    var s = str.length > 262144 ? str.substr(0, 262144) : str;
    if (!s.length) return 0;
    var freq = {};
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      freq[c] = (freq[c] || 0) + 1;
    }
    var e = 0;
    for (var k in freq) {
      var p = freq[k] / s.length;
      e -= p * Math.log2(p);
    }
    return Math.round(e * 10000) / 10000;
  }

  function obfuscate(source, userOpts) {
    if (typeof source !== "string") throw new Error("source must be a string");
    if (!source.length) throw new Error("source is empty");
    var t0 = nowMs();
    var opts = validateOptions(userOpts);
    var onProgress = (userOpts && typeof userOpts.onProgress === "function") ? userOpts.onProgress : null;
    function prog(stage, f) { if (onProgress) { try { onProgress(stage, f); } catch (e) {} } }
    var enc = textEncoder();
    var srcBytes = enc.encode(source);
    if (srcBytes.length > MAX_SOURCE_BYTES) {
      throw new Error("source is " + (srcBytes.length / 1048576).toFixed(1) + " MB — the hard cap is 512 MB (browser memory is the practical limit)");
    }
    var notes = [];
    if (srcBytes.length > 64 * 1024 * 1024) notes.push("very large build (>64 MB) — expect the executor to take a while decoding");
    var rng = makeRng(opts.seed == null ? undefined : opts.seed);
    /* engine build seed (reported for reproducible builds) */
    var buildSeed = opts.seed == null ? ((Math.random() * 0xffffffff) >>> 0) : opts.seed;
    if (opts.seed == null) rng = makeRng(buildSeed);

    prog("analyze", 0.05);
    var payloadText = source;
    var usedIdents = new Set(["_G"]);
    var statsExtras = { renamed: 0, stringsEncrypted: 0, junkInserted: 0, tokenPasses: false };
    var tokenPassOk = (opts.stringEncryption || opts.renameLocals || opts.junkCode) && srcBytes.length <= TOKEN_PASS_LIMIT;

    if (tokenPassOk) {
      statsExtras.tokenPasses = true;
      var toks = lex(source);
      var sig = [];
      for (var i = 0; i < toks.length; i++) {
        var tt = toks[i].t;
        if (tt !== "SPACE" && tt !== "COMMENT" && tt !== "EOF") sig.push(toks[i]);
        if (tt === "NAME" || tt === "KEYWORD") usedIdents.add(toks[i].v);
      }
      var scanInfo = null;
      if (opts.renameLocals) {
        scanInfo = safeRename(toks, sig, rng, notes);
        if (scanInfo) statsExtras.renamed = scanInfo.renamed;
      }
      var poolInfo = null;
      if (opts.stringEncryption) {
        poolInfo = poolStrings(sig, rng, notes);
        var poolBytes = 0;
        if (poolInfo.pool) for (var pi = 0; pi < poolInfo.pool.length; pi++) poolBytes += poolInfo.pool[pi].length;
        if (poolBytes > POOL_LIMIT) { poolInfo = null; notes.push("string pool exceeded 2 MB — strings left inline"); }
      }
      if (poolInfo && poolInfo.count) statsExtras.stringsEncrypted = poolInfo.count;
      var alloc = function () { return genName(rng, usedIdents); };
      var poolFnName = null, poolLua = "";
      if (poolInfo && poolInfo.count) {
        var pre = makePoolPrelude(poolInfo.pool, rng, alloc, b85Alphabet(rng));
        poolFnName = pre.fnName;
        poolLua = pre.lua;
      }
      /* junk needs the scanner's statement boundaries */
      var junkGen = null;
      if (opts.junkCode && scanInfo && srcBytes.length <= JUNK_LIMIT) {
        var jused = usedIdents;
        var jalloc = function () { return genName(rng, jused); };
        var cap = Math.min(120, Math.max(8, Math.floor(stmtCount(scanInfo) / 2)));
        junkGen = {
          count: cap,
          made: 0,
          next: function () { junkGen.made++; return makeJunk(rng, jalloc, 1); }
        };
      } else if (opts.junkCode && !scanInfo) {
        notes.push("junk decoys skipped (parser-lite could not map this file safely)");
      }
      payloadText = assembleOutput(toks, sig, poolInfo, poolFnName, rng, scanInfo ? scanInfo.scanner.stmtStarts : [], junkGen);
      if (junkGen) statsExtras.junkInserted = junkGen.made;
      if (poolFnName) payloadText = poolLua + "\n" + payloadText;
    } else {
      if (srcBytes.length > TOKEN_PASS_LIMIT) notes.push("source > 4 MB — renaming/string-pool/junk skipped (transport-only mode)");
    }

    prog("flatten", 0.3);
    var used2 = new Set(usedIdents);
    var alloc2 = function () { return genName(rng, used2); };
    var wrapped = wrapCFF(payloadText, rng, alloc2, opts);
    if (statsExtras.junkInserted == null) statsExtras.junkInserted = 0;

    prog("transport", 0.45);
    var depth = opts.vmDepth === 0 ? autoDepth(srcBytes.length) : opts.vmDepth;
    if (srcBytes.length > 32 * 1024 * 1024 && depth > 1) { depth = 1; notes.push("depth auto-reduced to 1 (>32 MB source)"); }
    else if (srcBytes.length > 8 * 1024 * 1024 && depth > 2) { depth = 2; notes.push("depth auto-reduced to 2 (>8 MB source)"); }
    var payloadBytes = enc.encode(wrapped);
    var sigHash = opts.antiDump ? djb2Bytes(payloadBytes) : null;
    var cur = wrapped;
    var layerSizes = [];
    for (var layer = 0; layer < depth; layer++) {
      cur = transportLayer(cur, rng, {
        alphabet: b85Alphabet(rng), vm: layer === 0 && (opts.antiEnvLog || opts.antiHook || opts.antiDump),
        sig: layer === 0 ? sigHash : null, opts: opts
      });
      layerSizes.push(cur.length);
      prog("transport", 0.45 + 0.4 * ((layer + 1) / depth));
    }
    prog("shell", 0.92);
    cur = transportLayer(cur, rng, { alphabet: b85Alphabet(rng), oeld: opts.antiTamper, opts: opts, brand: true });
    layerSizes.push(cur.length);

    var timeMs = nowMs() - t0;
    prog("done", 1);
    return {
      code: cur,
      stats: {
        engine: "LuaMore VM v" + VERSION,
        originalBytes: srcBytes.length,
        outputBytes: enc.encode(cur).length,
        layers: depth,
        layerSizes: layerSizes,
        entropy: entropyOf(cur),
        timeMs: Math.round(timeMs),
        buildSeed: buildSeed,
        renamedLocals: statsExtras.renamed,
        stringsEncrypted: statsExtras.stringsEncrypted,
        junkDecoys: statsExtras.junkInserted || 0,
        tokenPasses: statsExtras.tokenPasses,
        options: opts,
        notes: notes
      }
    };
  }
  function stmtCount(scanInfo) { return scanInfo.scanner.stmtStarts.length; }

  /* legacy v11-compatible surface */
  function mapLegacy(o) {
    var u = o || {};
    var out = {};
    if (u.dualVm !== undefined) out.vmDepth = u.dualVm ? Math.max(2, u.vmDepth || 2) : (u.vmDepth || 1);
    if (u.vmDepth !== undefined) out.vmDepth = u.vmDepth;
    if (u.loaderVMDepth !== undefined) out.vmDepth = u.loaderVMDepth;
    if (u.antiTamper !== undefined) out.antiTamper = u.antiTamper;
    if (u.oeldAntiTamper !== undefined) out.antiTamper = u.oeldAntiTamper;
    if (u.antiLogger !== undefined) { out.antiHook = u.antiLogger; out.antiEnvLog = u.antiLogger; }
    if (u.controlFlowFlattening !== undefined) out.controlFlow = u.controlFlowFlattening;
    if (u.encryptStrings !== undefined) out.stringEncryption = u.encryptStrings;
    if (u.junkCode !== undefined) out.junkCode = u.junkCode;
    if (u.renameLocals !== undefined) out.renameLocals = u.renameLocals;
    if (u.seed !== undefined) out.seed = u.seed;
    return out;
  }

  var API = {
    version: VERSION,
    obfuscate: obfuscate,
    obfuscateLua: function (src) { return obfuscate(src, {}).code; },
    obfuscateLuaWithOptions: function (src, o) { return obfuscate(src, mapLegacy(o)).code; },
    analyzeObfuscation: function (src, o) {
      var r = obfuscate(src, mapLegacy(o));
      return {
        code: r.code,
        size: r.stats.outputBytes,
        originalSize: r.stats.originalBytes,
        entropy: r.stats.entropy,
        layers: r.stats.layers,
        mode: r.stats.layers >= 2 ? "Nested Polymorphic VM v12" : "Hardened VM v12",
        stats: r.stats
      };
    },
    calculateEntropy: entropyOf,
    DEFAULT_OPTIONS: DEFAULTS,
    LIMITS: {
      maxSourceBytes: MAX_SOURCE_BYTES,
      tokenPassLimit: TOKEN_PASS_LIMIT,
      junkLimit: JUNK_LIMIT,
      poolLimit: POOL_LIMIT
    }
  };

  API.__capture = false;
  Object.defineProperty(API, "__payloads", { get: function () { return __payloadCapture; } });

  /* test/debug surface (used by the differential suite) */
  API.__internals = { rleEncode: rleEncode, xor4Crypt: xor4Crypt, rc4Crypt: rc4Crypt,
    permuteBlocks: permuteBlocks, b85EncodeBytes: b85EncodeBytes, b85Alphabet: b85Alphabet,
    makeRng: makeRng, textEncoder: textEncoder, djb2Bytes: djb2Bytes, lex: lex, Scanner: Scanner };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  var g = typeof globalThis !== "undefined" ? globalThis : (typeof self !== "undefined" ? self : global);
  g.LM12 = API;
  g.LMObfuscator = API; /* v11 compat name */
})(typeof globalThis !== "undefined" ? globalThis : this);
