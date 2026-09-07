/**
 * Lexer for Lua 5.1 – 5.4 and Luau.
 *
 * String literals are cooked into *byte strings*: every character of
 * `token.value` has a char code in 0..255 and the sequence is the exact byte
 * content the Lua interpreter would store. That is what makes string
 * encryption round-trip losslessly for UTF-8 text, `\0`, `\xNN` and long
 * brackets alike.
 */

export type TokenType = "name" | "keyword" | "number" | "string" | "interpstring" | "punct" | "eof";

export interface Token {
  type: TokenType;
  value: string;
  /** exact source text of the token */
  raw: string;
  start: number;
  end: number;
  line: number;
  col: number;
  /** number literal metadata */
  isInteger?: boolean;
  suffix?: string;
  /** interpolated string parts (raw byte text + brace offsets handled by the parser) */
  interp?: InterpPart[];
}

export type InterpPart = { type: "text"; bytes: string } | { type: "expr"; src: string };

export const LUA_KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

/** Luau-only keywords that are still contextually identifiers in Lua. */
export const LUAU_CONTEXTUAL = new Set(["continue", "type", "export"]);

const PUNCT_3 = ["...", "..=", "//="];
const PUNCT_2 = [
  "->",
  "==",
  "~=",
  "<=",
  ">=",
  "..",
  "//",
  "<<",
  ">>",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "^=",
  "..=",
  "//=",
];
const PUNCT_1 = "+-*/%^#&~|<>=(){}[];:,.?";

export class LexError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number) {
    super(`${message} (line ${line}, column ${col})`);
    this.name = "LexError";
    this.line = line;
    this.col = col;
  }
}

/** Encode a JS string as a byte string (each char code 0..255). */
export function toByteString(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) {
      out += text[i];
    } else {
      // UTF-8 encode the code point (handles surrogate pairs)
      let cp = c;
      if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < text.length) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          cp = (cp - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
          i++;
        }
      }
      if (cp < 0x800) {
        out += String.fromCharCode(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      } else if (cp < 0x10000) {
        out += String.fromCharCode(
          0xe0 | (cp >> 12),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
      } else {
        out += String.fromCharCode(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
      }
    }
  }
  return out;
}

const SIMPLE_ESCAPES: Record<string, number> = {
  a: 7,
  b: 8,
  f: 12,
  n: 10,
  r: 13,
  t: 9,
  v: 11,
  "\\": 92,
  '"': 34,
  "'": 39,
  "`": 96,
  "{": 123,
  "}": 125,
  "\n": 10,
};

function isDigit(c: string | undefined): boolean {
  return c !== undefined && c >= "0" && c <= "9";
}
function isHex(c: string | undefined): boolean {
  return (
    c !== undefined && ((c >= "0" && c <= "9") || (c >= "a" && c <= "f") || (c >= "A" && c <= "F"))
  );
}
function isNameStart(c: string | undefined): boolean {
  return c !== undefined && ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_");
}
function isNameChar(c: string | undefined): boolean {
  return isNameStart(c) || isDigit(c);
}

export interface LexResult {
  tokens: Token[];
  /** shebang / `--!` directive lines that must be preserved verbatim */
  prologue: string[];
}

export function lex(src: string): LexResult {
  const tokens: Token[] = [];
  const prologue: string[] = [];
  let i = 0;
  let line = 1;
  let lineStart = 0;

  const col = () => i - lineStart + 1;
  const fail = (msg: string): never => {
    throw new LexError(msg, line, col());
  };
  const recountLines = (text: string, from: number, to: number) => {
    for (let k = from; k < to; k++) {
      if (text[k] === "\n") {
        line++;
        lineStart = k + 1;
      }
    }
  };

  // shebang on the first line is skipped by the interpreter
  if (src.startsWith("#!")) {
    const nl = src.indexOf("\n");
    const end = nl === -1 ? src.length : nl;
    prologue.push(src.slice(0, end));
    i = end;
  }

  while (i < src.length) {
    const c = src[i];

    /* whitespace ---------------------------------------------------- */
    if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      line++;
      i++;
      lineStart = i;
      continue;
    }
    if (c === " " || c === "\t" || c === "\v" || c === "\f" || c === " ") {
      i++;
      continue;
    }

    /* comments ------------------------------------------------------ */
    if (c === "-" && src[i + 1] === "-") {
      const start = i;
      const startLine = line;
      i += 2;
      if (src[i] === "[") {
        const level = countLongOpen(src, i);
        if (level >= 0) {
          i = skipLongBracket(src, i, level, fail);
          recountLines(src, start, i);
          continue;
        }
      }
      while (i < src.length && src[i] !== "\n" && src[i] !== "\r") i++;
      const text = src.slice(start, i);
      // `--!strict` / `--!nonstrict` directives affect the type checker; keep them.
      if (startLine === 1 && text.startsWith("--!")) prologue.push(text);
      else if (text.startsWith("--!")) prologue.push(text);
      continue;
    }

    const tokStart = i;
    const tokLine = line;
    const tokCol = col();
    const push = (type: TokenType, value: string, extra: Partial<Token> = {}) => {
      tokens.push({
        type,
        value,
        raw: src.slice(tokStart, i),
        start: tokStart,
        end: i,
        line: tokLine,
        col: tokCol,
        ...extra,
      });
    };

    /* long / short strings ------------------------------------------ */
    if (c === "[") {
      const level = countLongOpen(src, i);
      if (level >= 0) {
        i = skipLongBracket(src, i, level, fail);
        recountLines(src, tokStart, i);
        let bytes = extractLongContent(src, tokStart, i, level);
        if (bytes.startsWith("\n")) bytes = bytes.slice(1);
        else if (bytes.startsWith("\r\n")) bytes = bytes.slice(2);
        else if (bytes.startsWith("\r")) bytes = bytes.slice(1);
        push("string", toByteString(bytes));
        continue;
      }
    }

    if (c === '"' || c === "'") {
      const bytes = readShortString(src, i, fail);
      i = bytes.end;
      if (bytes.newlines > 0) recountLines(src, tokStart, i);
      push("string", bytes.value);
      continue;
    }

    /* Luau interpolated strings: `text {expr} text` ------------------ */
    if (c === "`") {
      const res = readInterpolatedString(src, i, fail);
      i = res.end;
      if (res.newlines > 0) recountLines(src, tokStart, i);
      push("interpstring", "", { interp: res.parts });
      continue;
    }

    /* numbers -------------------------------------------------------- */
    if (isDigit(c) || (c === "." && isDigit(src[i + 1]))) {
      const n = readNumber(src, i, fail);
      i = n.end;
      push("number", n.value, { isInteger: n.isInteger, suffix: n.suffix });
      continue;
    }

    /* names / keywords ---------------------------------------------- */
    if (isNameStart(c)) {
      let j = i;
      while (j < src.length && isNameChar(src[j])) j++;
      const name = src.slice(i, j);
      i = j;
      push(LUA_KEYWORDS.has(name) ? "keyword" : "name", name);
      continue;
    }

    /* punctuators ---------------------------------------------------- */
    const three = src.slice(i, i + 3);
    if (PUNCT_3.includes(three)) {
      i += 3;
      push("punct", three);
      continue;
    }
    const two = src.slice(i, i + 2);
    if (PUNCT_2.includes(two)) {
      i += 2;
      push("punct", two);
      continue;
    }
    if (two === "::") {
      i += 2;
      push("punct", "::");
      continue;
    }
    if (PUNCT_1.includes(c)) {
      i += 1;
      push("punct", c);
      continue;
    }

    fail(`unexpected character ${JSON.stringify(c)}`);
  }

  tokens.push({
    type: "eof",
    value: "<eof>",
    raw: "",
    start: src.length,
    end: src.length,
    line,
    col: col(),
  });

  return { tokens, prologue };
}

/* ------------------------------------------------------------ utilities */

function countLongOpen(src: string, i: number): number {
  if (src[i] !== "[") return -1;
  let j = i + 1;
  let level = 0;
  while (src[j] === "=") {
    level++;
    j++;
  }
  return src[j] === "[" ? level : -1;
}

function skipLongBracket(
  src: string,
  i: number,
  level: number,
  fail: (m: string) => never,
): number {
  const close = "]" + "=".repeat(level) + "]";
  const idx = src.indexOf(close, i + level + 2);
  if (idx === -1) fail("unfinished long string/comment");
  return idx + close.length;
}

function extractLongContent(src: string, start: number, end: number, level: number): string {
  return src.slice(start + level + 2, end - level - 2);
}

/**
 * Reads exactly one escape sequence, `src[i]` being the backslash.
 * Returns the decoded bytes and the index just past the sequence.
 */
function readEscape(
  src: string,
  i: number,
  fail: (m: string) => never,
): { bytes: string; end: number; skippedNewline?: boolean } {
  const err = (m: string): never => fail(m);
  let j = i + 1;
  if (j >= src.length) err("unfinished string");
  const e = src[j];

  if (e === "\n" || e === "\r") {
    if (e === "\r" && src[j + 1] === "\n") j++;
    return { bytes: "\n", end: j + 1, skippedNewline: true };
  }
  if (e === "z") {
    j++;
    while (j < src.length && /\s/.test(src[j])) j++;
    return { bytes: "", end: j };
  }
  if (e === "x") {
    j++;
    let v = 0;
    let n = 0;
    while (n < 2 && isHex(src[j])) {
      v = v * 16 + parseInt(src[j], 16);
      j++;
      n++;
    }
    if (n !== 2) err("invalid \\x escape");
    return { bytes: String.fromCharCode(v), end: j };
  }
  if (e === "u") {
    if (src[j + 1] !== "{") err("invalid \\u escape — expected '{'");
    j += 2;
    let hex = "";
    while (src[j] !== undefined && src[j] !== "}") {
      if (!isHex(src[j])) err("invalid \\u escape");
      hex += src[j];
      j++;
    }
    if (src[j] !== "}") err("unfinished \\u escape");
    j++;
    const cp = hex.length ? parseInt(hex, 16) : NaN;
    if (!Number.isFinite(cp) || cp > 0x10ffff) err("invalid unicode code point");
    return { bytes: toByteString(String.fromCodePoint(cp)), end: j };
  }
  if (isDigit(e)) {
    let v = 0;
    let n = 0;
    while (n < 3 && isDigit(src[j])) {
      v = v * 10 + (src.charCodeAt(j) - 48);
      j++;
      n++;
    }
    if (v > 255) err("decimal escape too large");
    return { bytes: String.fromCharCode(v), end: j };
  }
  const mapped = SIMPLE_ESCAPES[e];
  if (mapped === undefined) err(`invalid escape sequence '\\${e}'`);
  return { bytes: String.fromCharCode(mapped), end: j + 1 };
}

function readShortString(
  src: string,
  start: number,
  fail: (m: string) => never,
): { value: string; end: number; newlines: number } {
  const quote = src[start];
  let i = start + 1;
  let bytes = "";
  let newlines = 0;
  const err = (m: string): never => fail(m);

  while (true) {
    if (i >= src.length) err("unfinished string");
    const c = src[i];
    if (c === "\n" || c === "\r") err("unfinished string");
    if (c === quote) {
      i++;
      break;
    }
    if (c !== "\\") {
      bytes += src.charCodeAt(i) < 0x80 ? c : toByteString(c);
      i++;
      continue;
    }
    const esc = readEscape(src, i, err);
    bytes += esc.bytes;
    if (esc.skippedNewline) newlines++;
    i = esc.end;
  }

  return { value: bytes, end: i, newlines };
}

function readInterpolatedString(
  src: string,
  start: number,
  fail: (m: string) => never,
): { parts: InterpPart[]; end: number; newlines: number } {
  const parts: InterpPart[] = [];
  let i = start + 1;
  let text = "";
  let newlines = 0;
  const err = (m: string): never => fail(m);

  while (true) {
    if (i >= src.length) err("unfinished interpolated string");
    const c = src[i];
    if (c === "\n" || c === "\r") err("unfinished interpolated string");
    if (c === "`") {
      i++;
      break;
    }
    if (c === "\\") {
      const esc = readEscape(src, i, err);
      if (esc.skippedNewline) newlines++;
      text += esc.bytes;
      i = esc.end;
      continue;
    }
    if (c === "{") {
      if (text) {
        parts.push({ type: "text", bytes: toByteString(text) });
        text = "";
      }
      let depth = 1;
      let j = i + 1;
      const exprStart = j;
      while (j < src.length && depth > 0) {
        const ch = src[j];
        if (ch === '"' || ch === "'") {
          j = readShortString(src, j, err).end;
          continue;
        }
        if (ch === "`") {
          j = readInterpolatedString(src, j, err).end;
          continue;
        }
        if (ch === "[" && countLongOpen(src, j) >= 0) {
          const level = countLongOpen(src, j);
          j = skipLongBracket(src, j, level, err);
          continue;
        }
        if (ch === "-" && src[j + 1] === "-") {
          while (j < src.length && src[j] !== "\n") j++;
          continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
          depth--;
          if (depth === 0) break;
        }
        j++;
      }
      if (depth !== 0) err("unfinished interpolation in string");
      parts.push({ type: "expr", src: src.slice(exprStart, j) });
      i = j + 1;
      continue;
    }
    text += src.charCodeAt(i) < 0x80 ? c : toByteString(c);
    i++;
  }

  if (text) parts.push({ type: "text", bytes: toByteString(text) });
  if (parts.length === 0) parts.push({ type: "text", bytes: "" });
  return { parts, end: i, newlines };
}

function readNumber(
  src: string,
  start: number,
  fail: (m: string) => never,
): { value: string; end: number; isInteger: boolean; suffix?: string } {
  let i = start;
  let isHex = false;
  if (src[i] === "0" && (src[i + 1] === "x" || src[i + 1] === "X")) {
    isHex = true;
    i += 2;
  }
  const digit = isHex ? isHexDigit : isDigit;
  let sawDigit = false;
  let sawPoint = false;
  let sawExp = false;

  while (i < src.length) {
    const c = src[i];
    if (digit(c)) {
      sawDigit = true;
      i++;
    } else if (c === "." && !sawPoint && !sawExp) {
      sawPoint = true;
      i++;
    } else if ((c === "e" || c === "E" || ((c === "p" || c === "P") && isHex)) && !sawExp) {
      sawExp = true;
      i++;
      if (src[i] === "+" || src[i] === "-") i++;
      if (!digit(src[i])) fail("malformed number near '" + src.slice(start, i + 2) + "'");
    } else break;
  }

  if (!sawDigit) fail("malformed number near '" + src.slice(start, i + 2) + "'");

  // Luau integer suffixes
  let suffix: string | undefined;
  const rest = src.slice(i, i + 3).toLowerCase();
  if (rest.startsWith("ull")) {
    suffix = "ull";
    i += 3;
  } else if (rest.startsWith("ll")) {
    suffix = "ll";
    i += 2;
  }

  // `1..2` must lex as `1`, `..`, `2`
  let raw = src.slice(start, i);
  if (!suffix && sawPoint && raw.endsWith(".") && src[i] === ".") {
    raw = raw.slice(0, -1);
    i = start + raw.length;
  }

  const next = src[i];
  if (next !== undefined && (isNameStart(next) || next === ".")) {
    // e.g. `0x1p` or `1foo` — but `1..2` handled above, and `1.5.x` is invalid anyway
    fail("malformed number near '" + src.slice(start, i + 1) + "'");
  }

  const isInteger = !sawPoint && !sawExp;
  return { value: raw, end: i, isInteger, suffix };
}

function isHexDigit(c: string | undefined): boolean {
  return isHex(c);
}
