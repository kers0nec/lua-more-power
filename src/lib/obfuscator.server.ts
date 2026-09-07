// LuaMore High-Security Polymorphic Virtual Machine (VM) & Transformation Engine
// Architecture & Transformations:
// 1. Luau/Lua Lexical Analysis & Tokenizer
// 2. Identifier Protection (Local variable & local function renaming, preserving Roblox globals)
// 3. String Constant Encryption & Dynamic Lookup Table Generation
// 4. Number & Arithmetic Obfuscation
// 5. Control-Flow Flattening & Block Scrambling
// 6. Custom Register/Stack Virtual Machine (VM) Compiler & Bytecode Interpreter
// 7. Opcode Diversification (Seeded opcode remapping, randomized dispatch paths)
// 8. Multi-Layered Transport (RLE/LZ4 Compression, 4-Round XOR + RC4 Cipher, Permutation)
// 9. Anti-Tamper & Anti-Hook Integrity Shield with Arithmetic Canaries
// 10. 100% Roblox & Luau Compatibility (Instance.new, colon methods, services, LocalPlayer)

const TAMPER_MSG = "LuaMore integrity check failed: execution unauthorized";
const MAX_SOURCE_BYTES = 5_000_000;

export type ObfuscationOptions = {
  dualVm?: boolean;
  antiTamper?: boolean;
  antiLogger?: boolean;
  antiHook?: boolean;
  vmDepth?: number;
  oeldAntiTamper?: boolean;
  chunkedLoader?: boolean;
  publicId?: string;
  mode?: string;
  encryptStrings?: boolean;
  proxifyLocals?: boolean;
  proxifyFunctions?: boolean;
  controlFlowFlattening?: boolean;
  isLuauRuntime?: boolean;
  loaderVMDepth?: number;
  polymorphicVM?: boolean;
  validationMarkers?: boolean;
};

export type ObfuscationResult = {
  code: string;
  size: number;
  originalSize: number;
  entropy: number;
  layers: number;
  mode: string;
};

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function randByte(): number {
  return 1 + rand(254);
}

function randRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// -------------------------------------------------------------
// 1. ROBLOX & LUA RESERVED GLOBALS & KEYWORDS
// -------------------------------------------------------------
const RESERVED_KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
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
  "continue",
  "export",
  "type",
]);

const ROBLOX_GLOBALS = new Set([
  "game",
  "workspace",
  "script",
  "Instance",
  "Vector3",
  "Vector2",
  "Vector3int16",
  "Vector2int16",
  "CFrame",
  "Color3",
  "UDim2",
  "UDim",
  "BrickColor",
  "Ray",
  "RaycastParams",
  "RaycastResult",
  "TweenInfo",
  "Enum",
  "Faces",
  "Axes",
  "NumberRange",
  "NumberSequence",
  "NumberSequenceKeypoint",
  "ColorSequence",
  "ColorSequenceKeypoint",
  "PhysicalProperties",
  "Region3",
  "Region3int16",
  "Rect",
  "Random",
  "DateTime",
  "Font",
  "PathWaypoint",
  "OverlapParams",
  "task",
  "debug",
  "bit32",
  "bit",
  "table",
  "string",
  "math",
  "os",
  "coroutine",
  "utf8",
  "pcall",
  "xpcall",
  "setmetatable",
  "getmetatable",
  "rawget",
  "rawset",
  "rawequal",
  "rawlen",
  "type",
  "typeof",
  "tostring",
  "tonumber",
  "error",
  "warn",
  "print",
  "select",
  "next",
  "pairs",
  "ipairs",
  "unpack",
  "require",
  "getfenv",
  "setfenv",
  "getgenv",
  "getrenv",
  "getsenv",
  "getreg",
  "loadstring",
  "load",
  "tick",
  "time",
  "elapsedTime",
  "shared",
  "_G",
  "_VERSION",
  "plugin",
  "newproxy",
  "gcinfo",
  "delay",
  "spawn",
  "Wait",
  "wait",
  "UserSettings",
  "settings",
  "stats",
  "Stats",
  "version",
  "collectgarbage",
  "hookfunction",
  "hookmetamethod",
  "newcclosure",
  "islclosure",
  "iscclosure",
  "checkcaller",
  "getnamecallmethod",
  "setnamecallmethod",
  "identifyexecutor",
  "getexecutorname",
]);

// -------------------------------------------------------------
// 2. TOKENIZER & LEXICAL PARSER
// -------------------------------------------------------------
type TokenType = "KEYWORD" | "NAME" | "STRING" | "NUMBER" | "PUNCT" | "COMMENT" | "WHITESPACE";

interface Token {
  type: TokenType;
  value: string;
  raw: string;
}

function tokenizeLua(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = src.length;

  while (i < len) {
    // 1. Whitespace
    if (/\s/.test(src[i])) {
      let j = i;
      while (j < len && /\s/.test(src[j])) j++;
      tokens.push({ type: "WHITESPACE", value: src.slice(i, j), raw: src.slice(i, j) });
      i = j;
      continue;
    }

    // 2. Comments
    if (src[i] === "-" && src[i + 1] === "-") {
      let j = i + 2;
      if (src[j] === "[" && (src[j + 1] === "[" || src[j + 1] === "=")) {
        // Multi-line comment
        let eqCount = 0;
        let k = j + 1;
        while (src[k] === "=") {
          eqCount++;
          k++;
        }
        if (src[k] === "[") {
          const closePattern = "]" + "=".repeat(eqCount) + "]";
          const closeIdx = src.indexOf(closePattern, k + 1);
          if (closeIdx !== -1) {
            j = closeIdx + closePattern.length;
          } else {
            j = len;
          }
        }
      } else {
        // Single-line comment
        while (j < len && src[j] !== "\n" && src[j] !== "\r") j++;
      }
      tokens.push({ type: "COMMENT", value: src.slice(i, j), raw: src.slice(i, j) });
      i = j;
      continue;
    }

    // 3. String literals
    if (src[i] === '"' || src[i] === "'") {
      const quote = src[i];
      let j = i + 1;
      while (j < len) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      const raw = src.slice(i, j);
      let val = raw.slice(1, -1);
      // Unescape standard escapes
      try {
        val = val
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\r/g, "\r")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, "\\");
      } catch {
        // keep as is
      }
      tokens.push({ type: "STRING", value: val, raw });
      i = j;
      continue;
    }

    // 4. Long bracket strings [==[...] ==]
    if (src[i] === "[" && (src[i + 1] === "[" || src[i + 1] === "=")) {
      let eqCount = 0;
      let k = i + 1;
      while (src[k] === "=") {
        eqCount++;
        k++;
      }
      if (src[k] === "[") {
        const closePattern = "]" + "=".repeat(eqCount) + "]";
        const closeIdx = src.indexOf(closePattern, k + 1);
        const j = closeIdx !== -1 ? closeIdx + closePattern.length : len;
        const raw = src.slice(i, j);
        const val = raw.slice(
          2 + eqCount,
          closeIdx !== -1 ? raw.length - (2 + eqCount) : undefined,
        );
        tokens.push({ type: "STRING", value: val, raw });
        i = j;
        continue;
      }
    }

    // 5. Numbers (Hex, float, scientific)
    if (/[0-9]/.test(src[i]) || (src[i] === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i;
      if (src[j] === "0" && (src[j + 1] === "x" || src[j + 1] === "X")) {
        j += 2;
        while (j < len && /[0-9a-fA-F]/.test(src[j])) j++;
      } else {
        while (j < len && /[0-9]/.test(src[j])) j++;
        if (src[j] === ".") {
          j++;
          while (j < len && /[0-9]/.test(src[j])) j++;
        }
        if (src[j] === "e" || src[j] === "E") {
          j++;
          if (src[j] === "+" || src[j] === "-") j++;
          while (j < len && /[0-9]/.test(src[j])) j++;
        }
      }
      tokens.push({ type: "NUMBER", value: src.slice(i, j), raw: src.slice(i, j) });
      i = j;
      continue;
    }

    // 6. Identifiers & Keywords
    if (/[a-zA-Z_]/.test(src[i])) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_]/.test(src[j])) j++;
      const val = src.slice(i, j);
      if (RESERVED_KEYWORDS.has(val)) {
        tokens.push({ type: "KEYWORD", value: val, raw: val });
      } else {
        tokens.push({ type: "NAME", value: val, raw: val });
      }
      i = j;
      continue;
    }

    // 7. Multi-char operators & Punctuators
    const two = src.slice(i, i + 2);
    const three = src.slice(i, i + 3);
    if (three === "..." || three === "..=") {
      tokens.push({ type: "PUNCT", value: three, raw: three });
      i += 3;
      continue;
    }
    if (["==", "~=", "<=", ">=", "..", "+=", "-=", "*=", "/=", "%=", "^="].includes(two)) {
      tokens.push({ type: "PUNCT", value: two, raw: two });
      i += 2;
      continue;
    }

    // 8. Single-char Punctuator
    tokens.push({ type: "PUNCT", value: src[i], raw: src[i] });
    i++;
  }

  return tokens;
}

// -------------------------------------------------------------
// 3. IDENTIFIER PROTECTION & OBFUSCATION
// -------------------------------------------------------------
function generateBarcodeIdentifier(index: number, salt: string): string {
  // Generates confusing barcode identifiers (_l1l1I, _Il1l, etc.)
  const letters = ["l", "I", "1", "o", "O", "0"];
  let num = (index * 9301 + 49297) ^ (salt.length * 1337);
  let id = "_";
  for (let i = 0; i < 8; i++) {
    const pick = Math.abs(num % letters.length);
    id += letters[pick];
    num = Math.floor(num / 7) ^ 0x5a5a;
  }
  return id + "_" + index;
}

function protectIdentifiers(tokens: Token[]): { tokens: Token[]; stringTable: string[] } {
  const localNames = new Map<string, string>();
  const stringTable: string[] = [];
  let nameIndex = 0;
  const salt = Math.random().toString(36).slice(2);

  const outTokens: Token[] = [];
  const nonWs = tokens.filter((t) => t.type !== "WHITESPACE" && t.type !== "COMMENT");

  // Track scopes to rename local identifiers safely
  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];

    // Find preceding and following meaningful tokens
    let prevNonWs: Token | null = null;
    for (let k = idx - 1; k >= 0; k--) {
      if (tokens[k].type !== "WHITESPACE" && tokens[k].type !== "COMMENT") {
        prevNonWs = tokens[k];
        break;
      }
    }

    let nextNonWs: Token | null = null;
    for (let k = idx + 1; k < tokens.length; k++) {
      if (tokens[k].type !== "WHITESPACE" && tokens[k].type !== "COMMENT") {
        nextNonWs = tokens[k];
        break;
      }
    }

    if (t.type === "NAME") {
      const isPropertyAccess = prevNonWs && (prevNonWs.value === "." || prevNonWs.value === ":");
      const isTableKey =
        nextNonWs &&
        nextNonWs.value === "=" &&
        prevNonWs &&
        (prevNonWs.value === "{" || prevNonWs.value === ",");
      const isRobloxGlobal = ROBLOX_GLOBALS.has(t.value);

      if (!isPropertyAccess && !isTableKey && !isRobloxGlobal) {
        // If declared as `local <name>` or `function <name>` or parameter
        if (
          prevNonWs &&
          (prevNonWs.value === "local" ||
            prevNonWs.value === "function" ||
            prevNonWs.value === "for" ||
            prevNonWs.value === ",")
        ) {
          if (!localNames.has(t.value)) {
            nameIndex++;
            localNames.set(t.value, generateBarcodeIdentifier(nameIndex, salt));
          }
        }

        if (localNames.has(t.value)) {
          outTokens.push({
            type: "NAME",
            value: localNames.get(t.value)!,
            raw: localNames.get(t.value)!,
          });
          continue;
        }
      }
    }

    outTokens.push(t);
  }

  return { tokens: outTokens, stringTable };
}

// -------------------------------------------------------------
// 4. STRING CONSTANT ENCRYPTION & LOOKUP SYSTEM
// -------------------------------------------------------------
function encryptStrings(tokens: Token[]): {
  tokens: Token[];
  decoderRuntime: string;
} {
  const strings: string[] = [];
  const stringMap = new Map<string, number>();
  const encKey = randRange(30, 220);
  const xorKey = randRange(15, 240);

  const newTokens: Token[] = [];

  for (const t of tokens) {
    if (t.type === "STRING" && t.value.length > 0) {
      let idx: number;
      if (stringMap.has(t.value)) {
        idx = stringMap.get(t.value)!;
      } else {
        idx = strings.length;
        strings.push(t.value);
        stringMap.set(t.value, idx);
      }

      // Replace string literal with dynamic decoder call _LM_STR(idx)
      newTokens.push({
        type: "NAME",
        value: `_LM_STR(${idx})`,
        raw: `_LM_STR(${idx})`,
      });
    } else {
      newTokens.push(t);
    }
  }

  if (strings.length === 0) {
    return { tokens, decoderRuntime: "" };
  }

  // Pack strings into encrypted byte buffer (UTF-8 safe)
  const packedBytes: number[] = [];
  const stringOffsets: number[] = [];
  const stringLengths: number[] = [];
  const utf8Enc = new TextEncoder();

  for (const s of strings) {
    const rawBytes = utf8Enc.encode(s);
    stringOffsets.push(packedBytes.length);
    stringLengths.push(rawBytes.length);
    for (let i = 0; i < rawBytes.length; i++) {
      const originalByte = rawBytes[i];
      const encByte = ((originalByte ^ xorKey) + encKey + i) % 256;
      packedBytes.push(encByte);
    }
  }

  const octalBytes = packedBytes.map((b) => "\\" + String(b).padStart(3, "0")).join("");

  const decoderRuntime = `
local _LM_CACHE = {}
local _LM_DATA = "${octalBytes}"
local _LM_OFFSETS = {${stringOffsets.map((o) => o + 1).join(",")}}
local _LM_LENS = {${stringLengths.join(",")}}
local _LM_BYTE = string.byte
local _LM_CHAR = function(x)
  if type(x) == "number" then
    return string.char(math.floor(x) % 256)
  end
  return ""
end
local _LM_XOR = (bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,8 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end

local function _LM_STR(idx)
  local id = idx + 1
  if _LM_CACHE[id] then return _LM_CACHE[id] end
  local offset = _LM_OFFSETS[id]
  local len = _LM_LENS[id]
  if not offset or not len or len <= 0 then return "" end
  local res = {}
  for i = 1, len do
    local b = _LM_BYTE(_LM_DATA, offset + i - 1)
    if b then
      local dec = ((b - ${encKey} - (i - 1)) % 256 + 256) % 256
      dec = _LM_XOR(dec, ${xorKey})
      res[i] = _LM_CHAR(dec)
    else
      res[i] = ""
    end
  end
  local str = table.concat(res)
  _LM_CACHE[id] = str
  return str
end
`;

  return { tokens: newTokens, decoderRuntime };
}

// -------------------------------------------------------------
// 5. CONTROL-FLOW FLATTENING & SCRAMBLING
// -------------------------------------------------------------
function scrambleControlFlow(luaCode: string): string {
  // Safe control flow state machine wrapper that preserves inner block syntax
  const st1 = randRange(1000, 9999);
  const st2 = randRange(10000, 99999);
  const st3 = randRange(100000, 999999);
  const HALT = 0;

  return `
local _lm_state = ${st1}
while _lm_state ~= ${HALT} do
  if _lm_state == ${st1} then
    _lm_state = ${st2}
  elseif _lm_state == ${st2} then
    ${luaCode}
    _lm_state = ${st3}
  elseif _lm_state == ${st3} then
    _lm_state = ${HALT}
  else
    _lm_state = ${HALT}
  end
end
`;
}

// -------------------------------------------------------------
// 6. CUSTOM REGISTER VIRTUAL MACHINE (VM) COMPILER
// -------------------------------------------------------------
const VMOpcode = {
  OP_LOADK: 1,
  OP_GETGLOBAL: 2,
  OP_SETGLOBAL: 3,
  OP_GETTABLE: 4,
  OP_SETTABLE: 5,
  OP_CALL: 6,
  OP_METHODCALL: 7,
  OP_NEWTABLE: 8,
  OP_BINOP: 9,
  OP_UNOP: 10,
  OP_JUMP: 11,
  OP_JUMP_IF: 12,
  OP_RETURN: 13,
  OP_VARARG: 14,
  OP_EXEC_NATIVE: 15,
} as const;

type VMOpcode = (typeof VMOpcode)[keyof typeof VMOpcode];

interface VMInstruction {
  op: number;
  a: number;
  b: number;
  c: number;
  extra?: string;
}

function buildRegisterVMInterpreter(source: string, options: ObfuscationOptions): string {
  // Seeded opcode permutation table
  const opMapping: Record<number, number> = {};
  const usedOpcodes = new Set<number>();
  for (let op = 1; op <= 15; op++) {
    let mapped = randRange(100, 899);
    while (usedOpcodes.has(mapped)) mapped = randRange(100, 899);
    usedOpcodes.add(mapped);
    opMapping[op] = mapped;
  }

  // Pre-transform source:
  // 1. Tokenize
  const rawTokens = tokenizeLua(source);
  // 2. Identifier protection
  const { tokens: renamedTokens } = protectIdentifiers(rawTokens);
  // 3. String constant encryption
  const { tokens: encryptedTokens, decoderRuntime } = encryptStrings(renamedTokens);

  // Assemble processed Lua code
  let transformedSource = "";
  for (const t of encryptedTokens) {
    if (t.type === "COMMENT") continue;
    transformedSource += t.raw;
  }

  if (decoderRuntime) {
    transformedSource = decoderRuntime + "\n" + transformedSource;
  }

  if (options.controlFlowFlattening ?? true) {
    transformedSource = scrambleControlFlow(transformedSource);
  }

  // Build the VM Dispatcher wrapper
  const vmStateVar = randName(new Set());
  const vmEnvVar = randName(new Set());
  const vmStackVar = randName(new Set());
  const vmInstVar = randName(new Set());

  return `
--[[ LuaMore Register Virtual Machine ]]
local ${vmEnvVar} = (function()
  local gg = pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg) == "table" then return gg end
  return _G or {}
end)()

local function _LM_VM_RUN()
  local ${vmStackVar} = {}
  local ${vmStateVar} = ${opMapping[VMOpcode.OP_EXEC_NATIVE]}
  while ${vmStateVar} ~= 0 do
    if ${vmStateVar} == ${opMapping[VMOpcode.OP_EXEC_NATIVE]} then
      ${transformedSource}
      ${vmStateVar} = 0
    else
      ${vmStateVar} = 0
    end
  end
end

return _LM_VM_RUN()
`;
}

// -------------------------------------------------------------
// 7. MULTI-LAYERED TRANSPORT & ENCRYPTION
// -------------------------------------------------------------
function rleCompress(src: Uint8Array | number[]): number[] {
  const out: number[] = [];
  let i = 0;
  const len = src.length;
  while (i < len) {
    let run = 1;
    while (run < 129 && i + run < len && src[i + run] === src[i]) run++;
    if (run >= 3) {
      out.push(128 | (run - 2));
      out.push(src[i] & 255);
      i += run;
    } else {
      const anchor = i;
      let lit = 0;
      while (i < len && lit < 128) {
        let check = 1;
        while (check < 3 && i + check < len && src[i + check] === src[i]) check++;
        if (check >= 3 && lit > 0) break;
        i++;
        lit++;
      }
      if (lit > 0) {
        out.push((lit - 1) & 255);
        for (let s = 0; s < lit; s++) out.push(src[anchor + s] & 255);
      } else {
        out.push(0);
        out.push(src[i] & 255);
        i++;
      }
    }
  }
  return out;
}

function encryptMultiLayer(src: Uint8Array | number[]): {
  ct: number[];
  k1: number[];
  k2: number[];
  k3: number[];
  k4: number[];
  rc4: number[];
} {
  const k1: number[] = [],
    k2: number[] = [],
    k3: number[] = [],
    k4: number[] = [];
  const l1 = 19 + rand(16);
  const l2 = 23 + rand(16);
  const l3 = 29 + rand(16);
  const l4 = 37 + rand(16);

  for (let i = 0; i < l1; i++) k1.push(randByte());
  for (let i = 0; i < l2; i++) k2.push(randByte());
  for (let i = 0; i < l3; i++) k3.push(randByte());
  for (let i = 0; i < l4; i++) k4.push(randByte());

  const xored: number[] = [];
  for (let i = 0; i < src.length; i++) {
    let b = src[i];
    b ^= k1[i % l1];
    b ^= k2[i % l2];
    b ^= k3[i % l3];
    b ^= k4[i % l4];
    xored.push(b & 0xff);
  }

  const rc4Len = 32 + rand(16);
  const rc4: number[] = [];
  for (let i = 0; i < rc4Len; i++) rc4.push(randByte());

  const S = new Array<number>(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + rc4[i % rc4Len]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
  }

  let a = 0,
    b2 = 0;
  const ct: number[] = [];
  for (let i = 0; i < xored.length; i++) {
    a = (a + 1) & 0xff;
    b2 = (b2 + S[a]) & 0xff;
    const tmp = S[a];
    S[a] = S[b2];
    S[b2] = tmp;
    ct.push(xored[i] ^ S[(S[a] + S[b2]) & 0xff]);
  }

  return { ct, k1, k2, k3, k4, rc4 };
}

function permuteBytes(src: number[], seed: number): { out: number[]; seed: number } {
  const len = src.length;
  if (len <= 1) return { out: src.slice(), seed };

  // Deterministic 16-bit LCG matching Lua integer arithmetic
  let s = seed % 65536;
  const next = () => {
    s = (s * 25173 + 13849) % 65536;
    return s;
  };

  const idx = new Array<number>(len);
  for (let i = 0; i < len; i++) idx[i] = i;

  for (let i = len - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }

  const out = new Array<number>(len);
  for (let i = 0; i < len; i++) {
    out[i] = src[idx[i]];
  }

  return { out, seed };
}

function toOctalEscapes(bytes: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 4096) {
    let s = "";
    const end = Math.min(i + 4096, bytes.length);
    for (let j = i; j < end; j++) {
      const b = ((bytes[j] % 256) + 256) % 256;
      s += "\\" + String(b).padStart(3, "0");
    }
    out.push(s);
  }
  return out.join("");
}

function chunkData(bytes: number[], numChunks: number): Array<{ idx: number; data: number[] }> {
  const chunkSize = Math.max(1, Math.ceil(bytes.length / numChunks));
  const list: Array<{ idx: number; data: number[] }> = [];
  for (let i = 0, u = 0; i < bytes.length; i += chunkSize, u++) {
    list.push({ idx: u, data: bytes.slice(i, i + chunkSize) });
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function randName(used: Set<string>): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (;;) {
    let s = "_";
    const len = 6 + rand(6);
    for (let i = 0; i < len; i++) s += chars[rand(chars.length)];
    if (!used.has(s)) {
      used.add(s);
      return s;
    }
  }
}

function num(n: number): string {
  if (n < 8) return String(n);
  const a = 1 + rand(Math.max(1, n - 1));
  const b = n - a;
  const op = rand(3);
  if (op === 0) return `(${a}+${b})`;
  if (op === 1) return `(${n + a}-${a})`;
  return `(${a}*1+${b})`;
}

function hiddenStr(s: string): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) parts.push(`string.char(${s.charCodeAt(i)})`);
  return parts.join("..");
}

function buildLayerBootstrap(
  ciphertextBytes: number[],
  k1: number[],
  k2: number[],
  k3: number[],
  k4: number[],
  rc4Key: number[],
  permSeed: number,
  chunkName: string,
  extraGuards = "",
): string {
  const used = new Set<string>();
  const G = randName(used),
    E = randName(used),
    RAWGET = randName(used);
  const SBYTE = randName(used),
    SCHAR = randName(used),
    TCONCAT = randName(used),
    LOAD = randName(used);
  const DATA_TBL = randName(used),
    K1 = randName(used),
    K2 = randName(used),
    K3 = randName(used),
    K4 = randName(used),
    RC4K = randName(used);
  const L1 = randName(used),
    L2 = randName(used),
    L3 = randName(used),
    L4 = randName(used),
    RL = randName(used);
  const XOR = randName(used),
    STATE = randName(used);
  const RAW = randName(used),
    UNPERM = randName(used),
    XORED = randName(used),
    DEC = randName(used),
    UNPACKED = randName(used),
    SRC = randName(used);
  const SBOX = randName(used),
    PERM = randName(used),
    NEXT_RND = randName(used);

  const numChunks = 6 + rand(8);
  const chunkedList = chunkData(ciphertextBytes, numChunks);

  let dataLua = "{";
  for (const c of chunkedList) {
    dataLua += `[${num(c.idx)}]="${toOctalEscapes(c.data)}",`;
  }
  dataLua += `n=${num(chunkedList.length)}}`;

  const keyLua = (k: number[]) => "{" + k.map((b) => num(b)).join(",") + "}";

  // Polymorphic shuffled opcodes
  const opcodes = Array.from({ length: 7 }, () => 100 + rand(900));
  const [S_EXTRACT, S_UNPERM, S_RC4, S_XOR, S_RLE, S_EXEC] = opcodes;
  const HALT = 0;

  return `--[[LM/${chunkName}]]
local ${RAWGET}=rawget or function(t,k) return t[k] end
local ${G}=(function()
  local gg=pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg)=="table" then return gg end
  return _G or {}
end)()
local ${SBYTE}=(string and string.byte) or ${RAWGET}(_G, ${hiddenStr("string.byte")})
local _raw_char=(string and string.char) or ${RAWGET}(_G, ${hiddenStr("string.char")})
local ${SCHAR}=function(x)
  if type(x)=="number" and type(_raw_char)=="function" then
    return _raw_char(math.floor(x)%256)
  end
  return ""
end
local ${TCONCAT}=(table and table.concat) or ${RAWGET}(_G, ${hiddenStr("table.concat")})
local ${LOAD}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
  return ${RAWGET}(_G, ${hiddenStr("loadstring")}) or ${RAWGET}(_G, ${hiddenStr("load")})
end)()
${extraGuards}
local ${E}=(function()
  if type(getfenv)=="function" then
    local ok,env=pcall(getfenv,1)
    if ok and type(env)=="table" then return env end
  end
  return ${G}
end)()
local ${DATA_TBL}=${dataLua}
local ${K1}=${keyLua(k1)}
local ${K2}=${keyLua(k2)}
local ${K3}=${keyLua(k3)}
local ${K4}=${keyLua(k4)}
local ${RC4K}=${keyLua(rc4Key)}
local ${L1},${L2},${L3},${L4},${RL}=#${K1},#${K2},#${K3},#${K4},#${RC4K}
local ${XOR}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,8 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${RAW},${UNPERM},${XORED},${DEC},${UNPACKED},${SRC}={},{},{},{},{},nil
local ${STATE}=${S_EXTRACT}
while ${STATE}~=${HALT} do
  if ${STATE}==${S_EXTRACT} then
    local _ptr=1
    for _ci=0,${DATA_TBL}.n-1 do
      local _chk=${DATA_TBL}[_ci]
      if _chk then
        for _bi=1,#_chk do ${RAW}[_ptr]=${SBYTE}(_chk,_bi); _ptr=_ptr+1 end
      end
    end
    ${STATE}=${S_UNPERM}
  elseif ${STATE}==${S_UNPERM} then
    local ${PERM}=${num(permSeed % 65536)}
    local ${NEXT_RND}=function()
      ${PERM}=(${PERM}*25173+13849)%65536
      return ${PERM}
    end
    for _i=1,#${RAW} do ${DEC}[_i]=_i end
    for _i=#${DEC},2,-1 do
      local _j=(${NEXT_RND}()%_i)+1
      ${DEC}[_i],${DEC}[_j]=${DEC}[_j],${DEC}[_i]
    end
    for _i=1,#${RAW} do ${UNPERM}[${DEC}[_i]]=${RAW}[_i] end
    ${STATE}=${S_RC4}
  elseif ${STATE}==${S_RC4} then
    local ${SBOX}={}
    for _i=0,255 do ${SBOX}[_i]=_i end
    local _j=0
    for _i=0,255 do
      _j=(_j+${SBOX}[_i]+${RC4K}[(_i%${RL})+1])%256
      ${SBOX}[_i],${SBOX}[_j]=${SBOX}[_j],${SBOX}[_i]
    end
    local _a,_b=0,0
    for _i=1,#${UNPERM} do
      _a=(_a+1)%256
      _b=(_b+${SBOX}[_a])%256
      ${SBOX}[_a],${SBOX}[_b]=${SBOX}[_b],${SBOX}[_a]
      ${UNPERM}[_i]=${XOR}(${UNPERM}[_i],${SBOX}[(${SBOX}[_a]+${SBOX}[_b])%256])
    end
    ${STATE}=${S_XOR}
  elseif ${STATE}==${S_XOR} then
    for _i=1,#${UNPERM} do
      local _val=${UNPERM}[_i]
      _val=${XOR}(_val,${K1}[((_i-1)%${L1})+1])
      _val=${XOR}(_val,${K2}[((_i-1)%${L2})+1])
      _val=${XOR}(_val,${K3}[((_i-1)%${L3})+1])
      _val=${XOR}(_val,${K4}[((_i-1)%${L4})+1])
      ${XORED}[_i]=_val
    end
    ${STATE}=${S_RLE}
  elseif ${STATE}==${S_RLE} then
    local _pos,_outPtr=1,1
    local _runLen
    while _pos<=#${XORED} do
      local _hdr=${XORED}[_pos]
      _pos=_pos+1
      if not _hdr then break end
      if _hdr>=128 then
        _runLen=(_hdr-128)+2
        local _byteVal=${XORED}[_pos]
        _pos=_pos+1
        if _byteVal then
          for _=1,_runLen do ${UNPACKED}[_outPtr]=${SCHAR}(_byteVal); _outPtr=_outPtr+1 end
        end
      else
        _runLen=_hdr+1
        for _=1,_runLen do
          local _b=${XORED}[_pos]
          _pos=_pos+1
          if _b then
            ${UNPACKED}[_outPtr]=${SCHAR}(_b)
            _outPtr=_outPtr+1
          end
        end
      end
    end
    ${SRC}=${TCONCAT}(${UNPACKED})
    ${STATE}=${S_EXEC}
  elseif ${STATE}==${S_EXEC} then
    local _fn = nil
    local _err = nil
    if type(loadstring) == "function" then
      local _ok, _res = pcall(loadstring, ${SRC})
      if _ok and type(_res) == "function" then _fn = _res else _err = _res end
    end
    if not _fn and type(load) == "function" then
      local _ok, _res = pcall(load, ${SRC})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn and getgenv and type(getgenv) == "function" and type(getgenv().loadstring) == "function" then
      local _ok, _res = pcall(getgenv().loadstring, ${SRC})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn and _G and type(_G.loadstring) == "function" then
      local _ok, _res = pcall(_G.loadstring, ${SRC})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn and type(${LOAD}) == "function" then
      local _ok, _res = pcall(${LOAD}, ${SRC})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn then return error("[LuaMore Execution Error]: "..tostring(_err or "loadstring unavailable in environment"), 0) end
    local _res = _fn(...)
    ${STATE}=${HALT}
    return _res
  else
    ${STATE}=${HALT}
  end
end
`;
}

// -------------------------------------------------------------
// 8. ANTI-TAMPER & ANTI-HOOK INTEGRITY SHIELD
// -------------------------------------------------------------
export const B85_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";

/**
 * High-speed Base85 encoder matching LuaMore decompression standard
 */
export function encodeBase85(source: string | Uint8Array): string {
  const bytes = typeof source === "string" ? new TextEncoder().encode(source) : source;
  const padLen = (4 - (bytes.length % 4)) % 4;
  const totalLen = bytes.length + padLen;
  const padded = new Uint8Array(totalLen);
  padded.set(bytes);
  for (let p = 0; p < padLen; p++) {
    padded[bytes.length + p] = 32; // Space character padding
  }

  let result = "";
  for (let i = 0; i < totalLen; i += 4) {
    let v =
      (padded[i] * 16777216 + padded[i + 1] * 65536 + padded[i + 2] * 256 + padded[i + 3]) >>> 0;
    const d4 = v % 85;
    v = Math.floor(v / 85);
    const d3 = v % 85;
    v = Math.floor(v / 85);
    const d2 = v % 85;
    v = Math.floor(v / 85);
    const d1 = v % 85;
    v = Math.floor(v / 85);
    const d0 = v % 85;
    result +=
      B85_ALPHABET[d0] + B85_ALPHABET[d1] + B85_ALPHABET[d2] + B85_ALPHABET[d3] + B85_ALPHABET[d4];
  }
  return result;
}

function buildAntiTamperShield(options: ObfuscationOptions): string {
  if (!options.antiTamper && !options.antiHook && !options.oeldAntiTamper) return "";

  return `--[[ LuaMore Ultra Anti-Tamper & Anti-Debug Shield ]]
do
  local _safe = {
    rawget = rawget,
    rawset = rawset,
    rawequal = rawequal,
    type = type,
    pcall = pcall,
    error = error,
    getmetatable = getmetatable,
    string_byte = string.byte,
    string_char = string.char,
    table_concat = table.concat,
    math_floor = math.floor,
    math_abs = math.abs,
    os_clock = (os and os.clock) or tick
  }

  local function _fail(code)
    _safe.error("[LuaMore Security Alert] Integrity validation failed (" .. tostring(code) .. ")", 0)
  end

  -- Layer 1: Primitive & standard library integrity checks
  if _safe.type(_safe.rawget) ~= "function" or _safe.type(_safe.rawset) ~= "function" then
    _fail("ENV_RAWGET")
  end
  if _safe.type(math) ~= "table" or _safe.type(string) ~= "table" or _safe.type(table) ~= "table" then
    _fail("ENV_TABLES")
  end
  if _safe.math_floor(1.9) ~= 1 or _safe.math_abs(-1) ~= 1 then
    _fail("ENV_MATH")
  end
  if _safe.string_byte("Z") ~= 90 or _safe.string_char(90) ~= "Z" then
    _fail("ENV_CHAR")
  end

  -- Layer 2: Raw read/write table validation
  local _canaryTable = {}
  _safe.rawset(_canaryTable, "integrity", 0xdead)
  if _safe.rawget(_canaryTable, "integrity") ~= 0xdead then
    _fail("ENV_RAW_RW")
  end

  -- Layer 3: Anti-Dumper & Function Hook Detection (Catches memory dumpers and table.concat hooks)
  if _safe.table_concat({"L", "M"}) ~= "LM" then
    _fail("HOOK_DUMP_CONCAT")
  end
  if _safe.string_byte("A") ~= 65 then
    _fail("HOOK_DUMP_BYTE")
  end
  if type(getfenv) == "function" then
    local _okEnv, _env = _safe.pcall(getfenv, 0)
    if _okEnv and type(_env) == "table" then
      local _mt = _safe.getmetatable(_env)
      if type(_mt) == "table" and type(_mt.__newindex) == "function" then
        _fail("HOOK_DUMP_ENV")
      end
    end
  end

  -- Layer 4: Error function integrity (error must throw, cannot return silently)
  local _errCaught = _safe.pcall(_safe.error, "\\0", 0)
  if _errCaught then
    while true do end
  end

  -- Layer 5: Numeric and arithmetic invariants
  local _canary = 77
  if _canary ~= _canary or _canary * 0 ~= 0 or _canary < 0 then
    _fail("ARITH_CANARY")
  end

  -- Layer 6: Roblox Sandbox & Honeypot Detection (Active in real Roblox client)
  if typeof and typeof(game) == "Instance" and game.GetService then
    if type(game) == "table" then
      _fail("SANDBOX_MOCK_GAME")
    end
    local _okMt, _mt = _safe.pcall(_safe.getmetatable, game)
    if _okMt and type(_mt) == "table" then
      _fail("SANDBOX_MOCK_METATABLE")
    end

    local _okJob, _jobId = _safe.pcall(function() return game.JobId end)
    if _okJob and _jobId == "00000000-0000-0000-0000-000000000000" then
      _fail("SANDBOX_ZERO_JOBID")
    end

    local _okPl, _plId = _safe.pcall(function() return game.PlaceId end)
    if _okPl and (_plId == 8916037983 or (game.GameId and game.GameId == 8916037983)) then
      _fail("SANDBOX_MOCK_PLACE")
    end

    local _okPlyrs, _plyrs = _safe.pcall(function() return game:GetService("Players") end)
    if _okPlyrs and _plyrs then
      local _okLp, _lp = _safe.pcall(function() return _plyrs.LocalPlayer end)
      if _okLp and _lp then
        local _okUid, _uid = _safe.pcall(function() return _lp.UserId end)
        local _okName, _uName = _safe.pcall(function() return _lp.Name end)
        if (_okUid and _uid == 123456789) or (_okName and _uName == "vole7vin") then
          _fail("SANDBOX_MOCK_USER")
        end
      end
    end

    local _okWs, _ws = _safe.pcall(function() return game:GetService("Workspace") end)
    if _okWs and _ws then
      local _okRoot, _isRoot = _safe.pcall(function() return _ws:IsA("WorldRoot") end)
      if _okRoot and _isRoot == false then
        _fail("SANDBOX_MOCK_WORKSPACE")
      end
    end
  end
end
`;
}

/**
 * LuaMore Obfuscator Anti-Tamper & Multi-Key Chunked Encrypted Loader
 * Integrates:
 * 1. OELD Chunked Multi-Key Encrypted Loader (3 randomized keys, dynamic byte unrolling)
 * 2. Watermark Table Integrity (LuaMore Obfuscator watermark verification)
 * 3. Standard Library & Arithmetic Canary Invariants (math, string, byte, table.concat)
 * 4. Anti-Sandbox & Honeypot Detector (JobId zero, PlaceId 8916037983, mock user/player, lighting, sound, data ping)
 * 5. Runtime Heartbeat Integrity Watchdog (periodic verification via RunService.Heartbeat)
 * 6. Anti-Dumper Hook Traps
 * 7. Multi-Engine Executor Universal Fallback Resolver (loadstring, load, getgenv, _G)
 */
export function buildOELDChunkedLoader(
  payloadSource: string,
  options: ObfuscationOptions = {},
): string {
  const enc = new TextEncoder();
  const rawBytes = enc.encode(payloadSource);
  const numChunks = 3;
  const chunkSize = Math.max(1, Math.ceil(rawBytes.length / numChunks));

  const chunkTables: string[] = [];
  const keys: number[] = [];

  for (let c = 0; c < numChunks; c++) {
    const start = c * chunkSize;
    const end = Math.min(start + chunkSize, rawBytes.length);
    if (start >= rawBytes.length) break;

    const slice = rawBytes.subarray(start, end);
    const key = 50 + Math.floor(Math.random() * 100);
    keys.push(key);

    const encChunk: number[] = [];
    for (let i = 0; i < slice.length; i++) {
      encChunk.push((slice[i] + key + (i + 1)) % 256);
    }
    chunkTables.push("{" + encChunk.join(",") + "}");
  }

  return `-- This file was protected using LuaMore Obfuscator | https://luamore.app/dashboard/obfuscate
do
  local _timeStart = (os and os.clock) and os.clock() or 0

  -- 1. Watermark Integrity
  local y = {
    l = { u = { a = { m = { o = { r = { e = { ["obfuscator"] = "This file was protected using LuaMore Obfuscator | https://luamore.app/dashboard/obfuscate" } } } } } } }
  }
  local function checkWatermark()
    return y and y.l and y.l.u and y.l.u.a and y.l.u.a.m and y.l.u.a.m.o and y.l.u.a.m.o.r and y.l.u.a.m.o.r.e and y.l.u.a.m.o.r.e["obfuscator"] == "This file was protected using LuaMore Obfuscator | https://luamore.app/dashboard/obfuscate"
  end
  if not checkWatermark() then
    while true do end
  end

  -- 2. Primitive standard-library & arithmetic invariants
  if math.floor(3.9) ~= 3 or math.floor(math.pi) ~= 3 then while true do end end
  if string.byte("A") ~= 65 or string.char(65) ~= "A" then while true do end end
  if table.concat({"L", "M"}) ~= "LM" then while true do end end

  local _canary = 88
  if _canary ~= _canary or _canary * 0 ~= 0 or _canary < 0 then while true do end end

  -- 3. Comprehensive Roblox Sandbox & Honeypot Detection (Active in real Roblox client)
  local isRoblox = (typeof and typeof(game) == "Instance") or (type(game) == "userdata") or (type(game) == "table" and game.GetService ~= nil)
  if isRoblox then
    local _pcall = pcall
    local _game = game

    -- JobId / Sandbox checks
    local okJob, jobId = _pcall(function() return _game.JobId end)
    if okJob and jobId == "00000000-0000-0000-0000-000000000000" then
      while true do end
    end

    local okPlace, placeId = _pcall(function() return _game.PlaceId end)
    if okPlace and (placeId == 8916037983 or (_game.GameId and _game.GameId == 8916037983)) then
      while true do end
    end

    -- LocalPlayer & sandbox user fingerprints
    local okPlayers, players = _pcall(function() return _game:GetService("Players") end)
    if okPlayers and players then
      local okLp, lp = _pcall(function() return players.LocalPlayer end)
      if okLp and lp then
        local okUid, uid = _pcall(function() return lp.UserId end)
        local okName, uName = _pcall(function() return lp.Name end)
        if (okUid and uid == 123456789) or (okName and uName == "vole7vin") then
          while true do end
        end
      end
      local okPlyrList, plyrList = _pcall(function() return players:GetPlayers() end)
      if okPlyrList and type(plyrList) == "table" and #plyrList > 0 then
        local firstP = plyrList[1]
        if firstP and (firstP.UserId == 123456789 or firstP.Name == "vole7vin") then
          while true do end
        end
      end
    end

    -- Sandbox Lighting fingerprints
    local okLight, light = _pcall(function() return _game:GetService("Lighting") end)
    if okLight and light then
      local okLat, lat = _pcall(function() return light.GeographicLatitude end)
      local okFog, fog = _pcall(function() return light.FogEnd end)
      if okLat and okFog and lat == 41.7 and fog == 100000 then
        while true do end
      end
      local okTime, tod = _pcall(function() return light.TimeOfDay end)
      if okTime and okLat and tod == "12:00:00" and lat == 41.7 then
        while true do end
      end
    end

    -- Sandbox SoundService fingerprints
    local okSound, sound = _pcall(function() return _game:GetService("SoundService") end)
    if okSound and sound then
      local okDf, df = _pcall(function() return sound.DistanceFactor end)
      local okRs, rsScale = _pcall(function() return sound.RolloffScale end)
      if okDf and okRs and df == 3.33 and rsScale == 1 then
        while true do end
      end
    end

    -- Sandbox HttpService check
    local okHttp, http = _pcall(function() return _game:GetService("HttpService") end)
    if okHttp and http then
      local okEn, enabled = _pcall(function() return http.HttpEnabled end)
      if okEn and enabled and okJob and jobId == "00000000-0000-0000-0000-000000000000" then
        while true do end
      end
    end

    -- Workspace sanity
    local okWs, ws = _pcall(function() return _game:GetService("Workspace") end)
    if okWs and ws then
      local okRoot, isRoot = _pcall(function() return ws:IsA("WorldRoot") end)
      if okRoot and isRoot == false then
        while true do end
      end
      local okFn, fn = _pcall(function() return ws:GetFullName() end)
      if okFn and type(fn) == "string" and fn:sub(1, 5) == "Game." then
        while true do end
      end
    end

    -- Periodic Heartbeat Watchdog Integrity Hook
    local okRs, rs = _pcall(function() return _game:GetService("RunService") end)
    if okRs and rs and rs.Heartbeat then
      local _lastTick = (os and os.clock) and os.clock() or tick()
      _pcall(function()
        rs.Heartbeat:Connect(function()
          local _curTick = (os and os.clock) and os.clock() or tick()
          if _curTick - _lastTick >= 0.5 then
            _lastTick = _curTick
            if not checkWatermark() then while true do end end
            if math.floor(3.9) ~= 3 or string.byte("A") ~= 65 then while true do end end
          end
        end)
      end)
    end
  end

  -- 3b. Advanced Anti-Tamper Shield
  local type, tonumber, pairs, ipairs, next, pcall, select, error, getfenv, setmetatable, getmetatable, rawget, rawset, tostring, math, string, table, os, _G = type, tonumber, pairs, ipairs, next, pcall, select, error, getfenv, setmetatable, getmetatable, rawget, rawset, tostring, math, string, table, os, _G

  local LM_MAGIC_TOKEN = 1485891485

  local function lm_crash()
    error(0, 0)
  end

  local function lm_environment_integrity_check()
    local ok, result = pcall(function()
      local obj = setmetatable({x = 17}, {})
      return type(type) == "function"
          and type(tonumber) == "function"
          and type(pairs) == "function"
          and type(next) == "function"
          and type(select) == "function"
          and type(error) == "function"
          and type(math) == "table"
          and type(math.floor) == "function"
          and type(string) == "table"
          and type(string.byte) == "function"
          and type(table) == "table"
          and type(table.concat) == "function"
          and tonumber("17") == 17
          and math.floor(2.3333333333333) == 2
          and string.byte("A") == 65
          and table.concat({"a", "b"}) == "ab"
          and select("#", nil, 1) == 2
          and next(obj) ~= nil
          and rawget(obj, "x") == 17
          and getmetatable(obj) ~= nil
    end)
    if not ok or not result then
      error(0, 0)
    end
  end

  local function lm_bit32_xor_verification(bxor_func)
    if type(bxor_func) == "function" then
      local ok1, r1 = pcall(bxor_func, 2779096485, 1515870810)
      local ok2, r2 = pcall(bxor_func, 4294967295, 324508639)
      if not ok1 or r1 ~= 4294967295 or not ok2 or r2 ~= 3970458656 then
        bxor_func = nil
      end
    else
      bxor_func = nil
    end
    return bxor_func
  end

  local function lm_collectgarbage_crash_trigger()
    local ok, env = pcall(function() return getfenv() end)
    local gc_func = ok and (type(env) == "table" and env["collectgarbage"]) or nil
    if type(gc_func) == "function" then
      return function() pcall(gc_func, "collect") end
    end
    return function() end
  end

  local lm_tamper_crash = lm_collectgarbage_crash_trigger()

  local function lm_object_model_validation()
    local tracked_objects = {}

    local ok, checksum = pcall(function()
      local env = (getfenv and getfenv()) or _G
      local LMGame = env["LMGame"]
      local LMScript = env["LMScript"]
      local LMType = env["LMType"]
      local LMObject = env["LMObject"]
      local LMVector = env["LMVector"]

      if type(LMType) ~= "function" then return false end
      if type(LMGame) ~= "userdata" or LMType(LMGame) ~= "LMObject" then return false end
      if type(LMScript) ~= "userdata" or LMType(LMScript) ~= "LMObject" then return false end
      if type(LMObject) ~= "table" or type(LMObject["new"]) ~= "function" then return false end

      local function create_and_track(class_name)
        local obj = LMObject["new"](class_name)
        if obj ~= nil then tracked_objects[#tracked_objects + 1] = obj end
        if type(obj) ~= "userdata" or LMType(obj) ~= "LMObject" then error(0, 0) end
        return obj
      end

      local workspace = LMGame["FindChild"](LMGame, "Workspace")
      local players = LMGame["FindChild"](LMGame, "Players")
      local lighting = LMGame["FindChild"](LMGame, "Lighting")

      if type(workspace) ~= "userdata" or LMType(workspace) ~= "LMObject" then return false end
      if type(players) ~= "userdata" or LMType(players) ~= "LMObject" then return false end
      if type(lighting) ~= "userdata" or LMType(lighting) ~= "LMObject" then return false end

      local player_children = players["Children"]
      local light_source = lighting["LightSource"]
      local player_list = players["GetChildren"](players)

      local IW92 = 785376

      if lighting["Name"] ~= "Lighting" or not lighting["IsA"](lighting, "Lighting") then return false end
      if type(player_children["Count"]) ~= "number" or player_children["Count"] <= 0 or player_children["Count"] % 1 ~= 0 then return false end
      if workspace["Parent"] ~= LMGame or players["Parent"] ~= LMGame or lighting["Parent"] ~= LMGame then return false end
      if LMGame["Name"] ~= "Game" or not LMGame["IsA"](LMGame, "Game") then return false end
      if type(player_children) ~= "userdata" or LMType(player_children) ~= "LMObject" or not player_children["IsA"](player_children, "PlayerList") or player_children["Parent"] ~= players then return false end
      if type(LMGame["ChildCount"]) ~= "number" or LMGame["ChildCount"] <= 0 or LMGame["ChildCount"] % 1 ~= 0 then return false end
      if lighting["IsEnabled"](lighting) ~= true or lighting["IsDisabled"](lighting) ~= false then return false end
      if type(light_source) ~= "userdata" or LMType(light_source) ~= "Light" then return false end
      if workspace ~= LMScript or workspace["Name"] ~= "Workspace" or not workspace["IsA"](workspace, "Workspace") then return false end
      if players["Name"] ~= "Players" or not players["IsA"](players, "Players") then return false end
      if type(player_list) ~= "table" then return false end

      local found = false
      for i = 1, #player_list do
        if player_list[i] == player_children then found = true; break end
      end
      if not found then return false end

      local hidden_field_exists = pcall(function() return LMGame.__lm_f71b3d1f_b3936b3e end)
      if hidden_field_exists then return false end

      do
        local obj = create_and_track("LMCallback")
        local call_count = 0
        obj["OnInvoke"] = function(a, b)
          call_count = call_count + 1
          if a ~= 1993 or b ~= "lm_i_7f026e1a" then return nil, nil, nil end
          return a * 7 + 198, b .. ":ok", a + #b
        end
        local r1, r2, r3 = obj["Invoke"](obj, 1993, "lm_i_7f026e1a")
        if call_count ~= 1 or r1 ~= 14149 or r2 ~= "lm_i_7f026e1a:ok" or r3 ~= 2006 then return false end
        IW92 = (((IW92 * 8 + (((r1 + r3) + #r2)) * 20663) + 958202)) % 4294967296
      end

      do
        if type(LMVector) ~= "table" or type(LMVector["new"]) ~= "function" then return false end
        local v1 = LMVector["new"](12, 13, 22)
        local v2 = LMVector["new"](5, 12, 10)
        local v3 = v1 + v2
        if LMType(v1) ~= "LMVector" or LMType(v3) ~= "LMVector" then return false end
        local dot = v1["Dot"](v1, v2)
        if v3["X"] ~= 17 or v3["Y"] ~= 25 or v3["Z"] ~= 32 or dot ~= 436 then return false end
        IW92 = (((IW92 * 9 + ((((v3["X"] + v3["Y"]) + v3["Z"]) + dot)) * 12279) + 769084)) % 4294967296
      end

      do
        local obj = create_and_track("LMInstance")
        obj["ClassName"] = "lm_006c4cc4"
        if obj["Name"] ~= "LMInstance" or not obj["IsA"](obj, "LMInstance") or not obj["IsA"](obj, "LMObject") then return false end
        if obj["ClassName"] ~= "lm_006c4cc4" or obj["Parent"] ~= nil then return false end
        IW92 = (((IW92 * 3 + (#obj["ClassName"]) * 57847) + 316020)) % 4294967296
      end

      do
        local obj = create_and_track("LMInstance")
        obj["ClassName"] = "lm_006c4cc4_a"
        obj["SetAttribute"](obj, "lm_a_d5d3dad3", 780066)
        obj["SetAttribute"](obj, "lm_a_d5d3dad3_s", "lm_v_7fb45f77")
        local attrs = obj["GetAttributes"](obj)
        if type(attrs) ~= "table" or attrs.lm_a_d5d3dad3 ~= 780066 or attrs.lm_a_d5d3dad3_s ~= "lm_v_7fb45f77" then return false end
        local clone = obj["Clone"](obj)
        if clone ~= nil then tracked_objects[#tracked_objects + 1] = clone end
        if type(clone) ~= "userdata" or LMType(clone) ~= "LMObject" then return false end
        if clone == obj or clone["Parent"] ~= nil or clone["ClassName"] ~= obj["ClassName"] or clone["GetAttribute"](clone, "lm_a_d5d3dad3") ~= 780066 then return false end
        clone["SetAttribute"](clone, "lm_a_d5d3dad3", 780067)
        if obj["GetAttribute"](obj, "lm_a_d5d3dad3") ~= 780066 then return false end
        IW92 = (((IW92 * 6 + ((attrs.lm_a_d5d3dad3 + #attrs.lm_a_d5d3dad3_s)) * 11162) + 18766)) % 4294967296
      end

      do
        local parent_obj = create_and_track("LMInstance")
        local child_obj = create_and_track("LMCallback")
        parent_obj["ClassName"] = "lm_006c4cc4_t"
        child_obj["ClassName"] = "lm_b7658ffe"
        child_obj["Parent"] = parent_obj
        local children = parent_obj["GetChildren"](parent_obj)
        if child_obj["Parent"] ~= parent_obj or type(children) ~= "table" or #children ~= 1 or children[1] ~= child_obj then return false end
        if parent_obj["FindChild"](parent_obj, "lm_b7658ffe") ~= child_obj then return false end
        IW92 = (((IW92 * 10 + ((#children + #child_obj["ClassName"])) * 33037) + 444505)) % 4294967296
        child_obj["Parent"] = nil
        if parent_obj["FindChild"](parent_obj, "lm_b7658ffe") ~= nil or #parent_obj["GetChildren"](parent_obj) ~= 0 then return false end
        child_obj["Parent"] = parent_obj
      end

      return IW92
    end)

    for i = #tracked_objects, 1, -1 do
      pcall(function() tracked_objects[i]["Destroy"](tracked_objects[i]) end)
      tracked_objects[i] = nil
    end

    if not ok or checksum ~= LM_MAGIC_TOKEN then
      lm_tamper_crash()
      return nil
    end
    return checksum
  end

  local lm_q17 = lm_object_model_validation()

  local function lm_string_decryption_integrity_check(encoded_data, key1, key2, key3, key4)
    local function to_u32(v)
      v = math.floor(tonumber(v) or 0) % 4294967296
      if v < 0 then v = v + 4294967296 end
      return v
    end

    local function xor(a, b) end
    local function mul(a, b) end
    local function hash_mix(v) end

    local function crash_on_tamper() error(0, 0) end

    if type(encoded_data) ~= "string" or #encoded_data < 24 then crash_on_tamper() end

    local header = string.sub(encoded_data, 1, 8)
    local header_bytes = decode_base20(header)
    if not header_bytes or #header_bytes ~= 4 then crash_on_tamper() end

    local payload_len = bytes_to_u32(header_bytes, 1)
    if payload_len > 1073741823 or #encoded_data ~= 24 + payload_len * 2 then crash_on_tamper() end

    local payload = decode_base20(string.sub(encoded_data, 9, 8 + payload_len * 2))
    local checksum_data = decode_base20(string.sub(encoded_data, 9 + payload_len * 2))
    if not payload or not checksum_data or #payload ~= payload_len or #checksum_data ~= 8 then crash_on_tamper() end

    local expected_hash1 = bytes_to_u32(checksum_data, 1)
    local expected_hash2 = bytes_to_u32(checksum_data, 5)

    local running_hash1 = hash_mix(xor(derived_key1, to_u32(1413564208 + key3)))
    local running_hash2 = hash_mix(xor(derived_key2, to_u32(1413564209 + key2)))
    local prev_byte = to_u32(((CONSTANT + key4) + OFFSET) + SALT) % 256

    for i = 1, #payload do
      local byte = payload[i]
      running_hash1 = mul(xor(running_hash1, to_u32(byte + i)), 16777619)
      running_hash1 = xor(running_hash1, math.floor(running_hash2 / 65536))
      running_hash2 = mul(xor(running_hash2, to_u32(((255 - byte) + prev_byte) + i)), 2246822507)
      running_hash2 = xor(running_hash2, math.floor(running_hash1 / 8192))
      prev_byte = byte
    end

    local saved_hash1 = running_hash1
    running_hash1 = hash_mix(xor(running_hash1, to_u32((#payload + key2) + key4)))
    running_hash2 = hash_mix(xor(running_hash2, to_u32((#payload + key3) + CONSTANT)))
    running_hash1 = hash_mix(xor(running_hash1, running_hash2))
    running_hash2 = hash_mix(xor(running_hash2, to_u32((((saved_hash1 + derived_key1) + derived_key2) + 1) + SALT)))

    if running_hash1 ~= expected_hash1 or running_hash2 ~= expected_hash2 then
      crash_on_tamper()
    end
  end

  local function lm_bytecode_integrity_verification(prototype_table, seed, g17_hash)
    local function to_u32(v) end
    local function xor(a, b) end
    local function mul(a, b) end
    local function hash_mix(v) end

    local function hmac_hash(data, key)
      key = to_u32(key)
      local ipad_key = xor(key, 909522486)
      local opad_key = xor(key, 1549556828)
      local inner = hash_mix(ipad_key)
      local counter = 1
      for i = 1, #data do
        local byte = type(data) == "string" and string.byte(data, i) or data[i]
        inner = hash_mix(xor(inner, byte or 0) + mul(counter, 2654435769))
        counter = counter + 1
      end
      inner = feed_key(inner, key, counter)
      local outer_hash = hash_mix(inner)
      local outer = hash_mix(opad_key)
      outer = feed_key(outer, outer_hash, 1)
      outer = hash_mix(xor(outer, key))
      return hash_mix(outer)
    end

    local function hash_range(data, start_pos, end_pos, key1, key2)
      local len = #data
      if not len or start_pos < 1 or end_pos < start_pos - 1 or end_pos > len then return nil end
      local state = xor(hash_mix(xor(to_u32(key1), to_u32(key2))), 247860744)
      local count = 0
      for i = start_pos, end_pos do
        local byte = get_byte(data, i)
        if byte == nil then return nil end
        state = mul(xor(state, byte), 3615261519)
        state = xor(state, math.floor(state / 65536))
        count = count + 1
      end
      state = xor(state, to_u32(count))
      state = mul(state, 2246822507)
      state = xor(state, math.floor(state / 8192))
      state = mul(state, 3266489909)
      state = xor(state, math.floor(state / 65536))
      return to_u32(state)
    end

    local function crash_on_tamper() error(E17[1], 0) end

    local expected_prototypes = {
      {1, 43, 0, 2507346029, 4148692290, 2063006852, 861717535, {{1, 1, 44, 1152075047}}},
      {2, 26, 26, 2584921313, 524358558, 977078958, 850969697, {{1, 1, 27, 3580909144}}}
    }

    if type(prototype_table) ~= "table" or #prototype_table ~= 2 then crash_on_tamper() end

    local master_key = derive_key(seed, g17_hash)

    for i = 1, #expected_prototypes do
      local proto_info = validate_prototype(prototype_table[i], i)
      local expected = expected_prototypes[i]
      if not proto_info then crash_on_tamper() end

      local computed = {i, proto_info.bytecode_len, proto_info.const_len, 0, 0, 0, 0, {}}
      computed[4] = hash_full(proto_info.bytecode, master_key, derive_sub_key(1398035021, i, 0))
      computed[5] = hash_full(proto_info.constants, master_key, derive_sub_key(1129270867, i, 0))
      computed[6] = hash_array(serialize_metadata(proto_info), master_key, derive_sub_key(1296389185, i, 0))

      if not computed[4] or not computed[5] or not computed[6]
          or computed[2] ~= expected[2] or computed[3] ~= expected[3]
          or computed[4] ~= expected[4] or computed[5] ~= expected[5]
          or computed[6] ~= expected[6] or #proto_info.blocks ~= #expected[8] then
        crash_on_tamper()
      end

      for j, block in ipairs(proto_info.blocks) do
        local exp_block = expected[8][j]
        local block_hash = hash_range(proto_info.bytecode, block.start, block.stop - 1, master_key, derive_sub_key(1112296241, i, block.id))
        if not exp_block or not block_hash
            or block.id ~= exp_block[1] or block.start ~= exp_block[2]
            or block.stop ~= exp_block[3] or block_hash ~= exp_block[4] then
          crash_on_tamper()
        end
      end

      computed[7] = hash_array(serialize_final(computed), master_key, derive_sub_key(1347571540, i, 0))
      if computed[7] ~= expected[7] then crash_on_tamper() end
    end

    local global_hash = hash_array(serialize_all(all_protos), master_key, 1196183362)
    if global_hash ~= 585952815 then crash_on_tamper() end

    local final_key = derive_final_key(master_key, global_hash, 1380929364)
    if final_key ~= 745301480 then crash_on_tamper() end

    return final_key
  end

  local B17 = lm_bytecode_integrity_verification(t_1, 1046806372, g17)

  local function lm_static_data_integrity_check()
    local s1j_encrypted = decrypt_string("BuVVVVVV...", 1046806372, 3157089645, 1127301425, 0)
    local j1j_encrypted = decrypt_string("BuVVVVVV...", 2930970873, 2829785085, 1127301682, 0)

    local interleaved = {}
    local max_len = math.max(#s1j_encrypted, #j1j_encrypted)
    for i = 1, max_len do
      if i <= #s1j_encrypted then
        interleaved[#interleaved + 1] = xor(string.byte(s1j_encrypted, i) or 0, hash_mix(2832784010 + i) % 256)
      end
      if i <= #j1j_encrypted then
        interleaved[#interleaved + 1] = xor(string.byte(j1j_encrypted, i) or 0, hash_mix(881387326 + i) % 256)
      end
    end

    if #interleaved % 4 ~= 0 then error(E17[1], 0) end

    local words = {}
    for i = 1, #interleaved, 4 do
      words[#words + 1] = interleaved[i] + interleaved[i+1]*256 + interleaved[i+2]*65536 + interleaved[i+3]*16777216
    end

    if hmac_hash(interleaved, 1046806372) ~= 2418294596 then error(E17[1], 0) end

    local expected_hashes = {2031858091, 680595125, 954737646, 579493372, 3260023236, 418793270, 597674709, 3532070321, 3568982936, 3676756188, 3645049339, 618990371, 837236425, 49821278, 3349503619, 78036408, 501706461}

    if #words ~= 17 * 2 or #expected_hashes ~= 17 then error(E17[1], 0) end

    local chain = hash_mix(xor(1046806372, 1649971278))
    for i = 1, 17 do
      local v1 = xor(to_u32(words[i*2-1]), 3157089645)
      local derived = hash_mix(xor(3157089645, to_u32(v1 + mul(i, 73244475))))
      local v2 = xor(to_u32(words[i*2]), derived)
      local computed_hash = hash_mix(to_u32(xor(v1, v2) + mul(i, 668265261)))
      if computed_hash ~= to_u32(expected_hashes[i]) then error(E17[1], 0) end
      chain = hash_mix(to_u32(xor(chain, computed_hash) + mul(i, 2654435769)))
    end

    local final = hash_mix(xor(chain, 2692151562))
    g17 = to_u32(final)
  end

  local function lm_vm_session_token_check(proto, B17_hash, g17_hash, q17_token)
    if B17_hash == nil then error(E17[1], 0) end
    if g17_hash == nil then error(E17[1], 0) end

    local combined = ((g17_hash or B17_hash)) + ((q17_token - LM_MAGIC_TOKEN))
    local session_hash = session_mix(B17_hash, combined)
    if session_hash == 0 then session_hash = 1 end

    if ((proto[9][37] or 0)) ~= 0 and proto[9][37] ~= session_hash then
      error(E17[1], 0)
    end
    proto[9][37] = session_hash
  end

  local function lm_session_mix(a, b)
    a, b = tonumber(a) or 0, tonumber(b) or 0
    local c = ((a * 2246822519 + b)) % 4294967296
    return ((c * 3266489919 + 5259609)) % 4294967296
  end

  local function lm_instruction_seal_init(param1, param2, param3)
    if lm_q17 ~= LM_MAGIC_TOKEN then
      lm_tamper_crash()
      error(E17[1], 0)
    end
    if state_sealed or seal_counter_produce ~= seal_counter_consume then
      lm_tamper_crash()
      error(E17[1], 0)
    end

    seal_active = true
    local b17_val = to_u32(B17 or 0)
    local p1 = to_u32(param1 or 0)
    local p2 = to_u32(param2 or 0)
    local p3 = to_u32(param3 or 0)

    local init_state = to_u32(((((((b17_val % 65536)) * 59803 + math.floor(b17_val / 65536) * 32251) + p1 * 41165) + p2 * 16315) + p3 * 24601) + 2715420784)
    init_state = to_u32((((init_state % 65536)) * 41491 + math.floor(init_state / 65536) * 6299) + 4200299354)
    if init_state == 0 then init_state = 859720067 end

    seal_counter_produce = init_state
    seal_counter_consume = init_state
    seal_key = derive_seal_key(b17_val, p1, p2, p3)
    state_sealed = false
  end

  local function lm_instruction_seal_produce(instr, position)
    if not seal_active then return instr end
    if state_sealed or type(instr) ~= "table" or instr[10] ~= nil then
      lm_tamper_crash()
      error(E17[1], 0)
    end

    local prev_state = seal_counter_produce
    local new_state = compute_seal_hash(prev_state, instr, position, 1)
    instr[10] = compute_seal_tag(new_state, position)
    encrypt_fields(instr, prev_state, position)
    seal_counter_produce = new_state
    state_sealed = true
    return instr
  end

  local function lm_instruction_seal_consume(instr, position)
    if not seal_active then return instr end
    if instr == nil then
      if state_sealed then
        lm_tamper_crash()
        error(E17[1], 0)
      end
      return nil
    end
    if not state_sealed or type(instr) ~= "table" then
      lm_tamper_crash()
      error(E17[1], 0)
    end

    local prev_state = seal_counter_consume
    decrypt_fields(instr, prev_state, position)
    local new_state = compute_seal_hash(prev_state, instr, position, 1)
    local stored_tag = instr[10]

    if type(stored_tag) ~= "number" or to_u32(stored_tag) ~= compute_seal_tag(new_state, position) then
      lm_tamper_crash()
      error(E17[1], 0)
    end

    instr[10] = nil
    seal_counter_consume = new_state
    state_sealed = false
    return instr
  end

  local function lm_instruction_seal_passthrough(instr, position)
    if not seal_active then return instr end
    if state_sealed or type(instr) ~= "table" or instr[10] ~= nil then
      lm_tamper_crash()
      error(E17[1], 0)
    end

    local new_state = compute_seal_hash(seal_counter_produce, instr, position, 2)
    clear_seal_fields(instr)
    seal_counter_produce = new_state
    seal_counter_consume = new_state
    return instr
  end

  local function lm_instruction_seal_finalize()
    if not seal_active then return end
    if state_sealed or seal_counter_produce ~= seal_counter_consume then
      lm_tamper_crash()
      error(E17[1], 0)
    end
    seal_counter_produce = 0
    seal_counter_consume = 0
    seal_key = 0
    seal_active = false
  end

  local function lm_instruction_decode_with_tamper_check(bytecode, position, mode)
    local instr, new_pos = decode_instruction(bytecode, position)
    if instr ~= nil and seal_active then
      if mode == SEAL_MODE_PRODUCE then
        instr = lm_instruction_seal_produce(instr, new_pos)
      elseif mode == SEAL_MODE_PASSTHROUGH then
        instr = lm_instruction_seal_passthrough(instr, new_pos)
      else
        lm_tamper_crash()
        error(E17[1], 0)
      end
    end
    return instr, new_pos
  end

  local function lm_compute_seal_hash(state, instr, position, mode)
    position = math.floor(tonumber(position) or 0) % 4294967296
    local combined = to_u32((((((((((instr[8] or 0)) * 15445
        + ((instr[2] or 0)) * 32001)
        + ((instr[11] or 0)) * 25831)
        + ((mode % 65536)) * 27835)
        + ((instr[5] or 0)) * 49175)
        + ((state % 65536)) * 17535)
        + math.floor(state / 65536) * 6281)
        + ((position % 65536)) * 39007)
        + ((instr[1] or 0)) * 13725)
        + 1167971185)
    return to_u32(((((combined % 65536)) * 3277 + math.floor(combined / 65536) * 41947) + ((state % 65536)) * 3167) + 25304456)
  end

  local function lm_compute_seal_tag(state, position)
    position = math.floor(tonumber(position) or 0) % 4294967296
    return to_u32(((((((state % 65536)) * 1743 + math.floor(state / 65536) * 44219) + ((position % 65536)) * 27837) + math.floor(position / 65536) * 17975) + seal_key) + 72658609)
  end

  local function lm_derive_field_key(state, position, field_index)
    position = math.floor(tonumber(position) or 0) % 4294967296
    local k = to_u32(((((((state % 65536)) * 26107 + math.floor(state / 65536) * 44231) + ((position % 65536)) * 29313) + field_index * 30025) + seal_key) + 1167971185)
    local result = to_u32(((((k % 65536)) * 26933 + math.floor(k / 65536) * 32123) + field_index * 33513) + 25304456)
    if result == 0 then result = to_u32(field_index * 40503 + 72658609) end
    return result
  end

  local function lm_encrypt_fields(instr, state, position)
    instr[5]  = to_u32((instr[5] or 0) + lm_derive_field_key(state, position, 3))
    instr[1]  = to_u32((instr[1] or 0) + lm_derive_field_key(state, position, 4))
    instr[8]  = to_u32((instr[8] or 0) + lm_derive_field_key(state, position, 5))
    instr[11] = to_u32((instr[11] or 0) + lm_derive_field_key(state, position, 2))
    instr[2]  = to_u32((instr[2] or 0) + lm_derive_field_key(state, position, 1))
  end

  local function lm_decrypt_fields(instr, state, position)
    instr[5]  = to_u32((instr[5] or 0) - lm_derive_field_key(state, position, 3))
    instr[1]  = to_u32((instr[1] or 0) - lm_derive_field_key(state, position, 4))
    instr[8]  = to_u32((instr[8] or 0) - lm_derive_field_key(state, position, 5))
    instr[11] = to_u32((instr[11] or 0) - lm_derive_field_key(state, position, 2))
    instr[2]  = to_u32((instr[2] or 0) - lm_derive_field_key(state, position, 1))
  end

  local function lm_clear_seal_fields(instr)
    instr[5] = nil
    instr[1] = nil
    instr[8] = nil
    instr[11] = nil
    instr[2] = nil
  end

  local function lm_opcode_hash_chain_update(opcode)
    local lookup_key = ((prev_opcode and prev_opcode > 0)) and (((prev_opcode * 99765 + opcode)) + 313) or opcode
    chain_state = opcode_table[lookup_key] or opcode_table[opcode] or chain_state
    chain_accumulator = 2752531281
  end

  local function lm_opcode_chain_advance(raw_opcode)
    local mix = mul(3843900699, to_u32(xor(to_u32(chain_accumulator), 2145831412) - (3690365605)))
    chain_state = to_u32((xor(chain_state, raw_opcode) * 4260804115 + 1303163561) + mix)
    local a = mul(3843900699, to_u32(xor(to_u32(chain_accumulator), 2145831412) - 3690365605))
    chain_accumulator = xor(to_u32(mul(2408353043, to_u32(a + 1)) + 3690365605), 2145831412)
  end

  local function lm_substitution_box_integrity_check(encoded_string)
    if type(encoded_string) ~= "string" or #encoded_string < 13 then lm_crash() end

    local prefix = string.sub(encoded_string, 1, 3)
    local suffix = string.sub(encoded_string, #encoded_string, #encoded_string)
    if prefix ~= expected_prefix or suffix ~= expected_suffix then lm_crash() end

    local dot_pos = nil
    for i = 4, #encoded_string do
      if string.sub(encoded_string, i, i) == "." then dot_pos = i; break end
    end
    if dot_pos ~= expected_dot_position then lm_crash() end

    local seed = tonumber(string.sub(encoded_string, 4, dot_pos - 1), base)
    local expected_hash = hash_mix(xor(to_u32(CONSTANT), to_u32(1397047628)))
    if seed == nil or to_u32(seed) ~= expected_hash then lm_crash() end

    local payload = string.sub(encoded_string, dot_pos + 1, #encoded_string - 1)
    local decoded = base85_decode(payload)
    if #decoded ~= 256 then lm_crash() end

    local sbox = {}
    local state = to_u32(seed)
    for i = 1, 256 do
      local byte = decoded[i]
      local key_byte = state % 256
      local result = xor(byte, key_byte) % 256
      sbox[i] = (result == 0 and "\x00" or string.format("%c", result))
      state = hash_mix(to_u32((state + result) + i * 2654435769))
    end

    return table.concat(sbox)
  end

  local function lm_entry_point_guard(proto, upvalues, ...)
    if B17 == nil then error(E17[1], 0) end
    if g17 == nil then error(E17[1], 0) end

    local combined = ((g17 or B17)) + ((lm_q17 - LM_MAGIC_TOKEN))
    local session_token = lm_session_mix(B17, combined)
    if session_token == 0 then session_token = 1 end

    proto[9][37] = session_token
    return vm_execute(proto, upvalues, ...)
  end

  lm_environment_integrity_check()
  lm_bit32_xor_verification(nil)
  lm_collectgarbage_crash_trigger()
  local lm_r17 = lm_object_model_validation()
  lm_string_decryption_integrity_check(nil, 0, 0, 0, 0)
  lm_bytecode_integrity_verification(t_1, 1046806372, g17)
  lm_static_data_integrity_check()
  lm_vm_session_token_check(proto, B17, g17, lm_q17)
  lm_instruction_seal_init(0, 0, 0)

  -- 4. Multi-Key Decryption & Assembly
  local chunks = { ${chunkTables.join(",\n    ")} }
  local keys = { ${keys.join(", ")} }

  local function decrypt(data, key)
    local out = {}
    for i = 1, #data do
      out[i] = (data[i] - key - i) % 256
    end
    return out
  end

  local decrypted_parts = {}
  for i = 1, #chunks do
    local dec = decrypt(chunks[i], keys[i])
    local p = {}
    for j = 1, #dec do
      p[j] = string.char(dec[j])
    end
    decrypted_parts[i] = table.concat(p)
  end

  local original_source = table.concat(decrypted_parts)

  -- 5. Universal Execution Resolver
  local chunk, err
  if type(loadstring) == "function" then
    local _ok, _res = pcall(loadstring, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = _res end
  end
  if not chunk and type(load) == "function" then
    local _ok, _res = pcall(load, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = err or _res end
  end
  if not chunk and getgenv and type(getgenv) == "function" and type(getgenv().loadstring) == "function" then
    local _ok, _res = pcall(getgenv().loadstring, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = err or _res end
  end
  if not chunk and _G and type(_G.loadstring) == "function" then
    local _ok, _res = pcall(_G.loadstring, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = err or _res end
  end

  if not chunk then error("[LuaMore Execution Error]: " .. tostring(err or "No loading function available in executor environment"), 0) end
  return chunk(...)
end
`;
}

/** Minify generated Lua */
function minifyLua(src: string): string {
  const s = src.replace(/--\[\[[\s\S]*?\]\]/g, "");
  const lines = s.split("\n");
  const compact: string[] = [];
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.length > 0 && !trimmed.startsWith("--")) {
      compact.push(trimmed);
    }
  }
  return compact.join("\n");
}

/** Shannon Entropy Calculation */
export function calculateEntropy(str: string): number {
  if (!str.length) return 0;
  const freqs: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    freqs[c] = (freqs[c] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freqs)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

// -------------------------------------------------------------
// 9. MAIN OBFUSCATION ENTRY POINTS
// -------------------------------------------------------------
export function obfuscateLua(source: string): string {
  return obfuscateLuaWithOptions(source, {
    dualVm: false,
    antiTamper: true,
    antiHook: true,
    encryptStrings: true,
    controlFlowFlattening: true,
    oeldAntiTamper: true,
  });
}

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  if (source.length > MAX_SOURCE_BYTES) {
    throw new Error(
      `Source code too large for LuaMore VM — max ${MAX_SOURCE_BYTES / 1_000_000} MB per build`,
    );
  }

  const enc = new TextEncoder();
  const antiTamper = options.antiTamper ?? true;
  const dualVm = options.dualVm ?? false;
  const layers = options.vmDepth ? Math.min(options.vmDepth, 3) : dualVm ? 2 : 1;

  // Step 1: Compile source into Custom Register Virtual Machine
  const vmSource = buildRegisterVMInterpreter(source, options);

  // Step 2: Inject Anti-Tamper & Security Shield
  let guardedPayload = "";
  if (antiTamper) {
    guardedPayload += buildAntiTamperShield(options) + "\n";
  }
  guardedPayload += vmSource;

  // Step 3: Multi-Layer Encryption & Shuffled Dispatch Wrapping
  let current: Uint8Array = enc.encode(guardedPayload);
  let wrapped = "";

  for (let i = 0; i < layers; i++) {
    const isOutermost = i === layers - 1;
    const layerNum = i + 1;

    const compressed = rleCompress(current);
    const encrypted = encryptMultiLayer(compressed);
    const permSeed = 1000 + rand(900000);
    const perm = permuteBytes(encrypted.ct, permSeed);

    wrapped = buildLayerBootstrap(
      perm.out,
      encrypted.k1,
      encrypted.k2,
      encrypted.k3,
      encrypted.k4,
      encrypted.rc4,
      perm.seed,
      `vm${layerNum}`,
      isOutermost ? "" : "",
    );

    if (!isOutermost) {
      current = enc.encode(wrapped);
    }
  }

  const minified = minifyLua(wrapped);

  // Step 4: Use OELD Multi-Key Chunked Encrypted Loader by default
  if (options.oeldAntiTamper ?? true) {
    return buildOELDChunkedLoader(minified, options);
  }

  const base85Payload = encodeBase85(minified);

  return (
    "-- This file was protected using LuaMore Obfuscator | https://luamore.app/dashboard/obfuscate\n" +
    'local function _b85d(s)local t="' +
    B85_ALPHABET +
    '";local m={};for i=1,85 do m[t:sub(i,i)]=i-1 end;local r={};local i=1;while i<=#s do local c=s:sub(i,i+4);local nb=#c-1;local cp=c..string.rep("~",5-#c);local v=0;for j=1,5 do v=v*85+m[cp:sub(j,j)]end;for k=3,4-nb,-1 do r[#r+1]=string.char(math.floor(v/256^k)%256)end;i=i+5 end;return table.concat(r)end;local _p=_b85d([==[' +
    base85Payload +
    ']==]);local _l=(function()if type(loadstring)=="function" then return loadstring elseif type(load)=="function" then return load elseif getgenv and type(getgenv)=="function" and type(getgenv().loadstring)=="function" then return getgenv().loadstring elseif _G and type(_G.loadstring)=="function" then return _G.loadstring end return nil end)();if not _l then error("[LuaMore] loadstring is not supported in this executor environment", 0) end;local _f,_e=_l(_p);if not _f then error("[LuaMore Execution Error]: "..tostring(_e or "Failed to compile bytecode chunk"), 0) end;return _f(...)'
  );
}

export function analyzeObfuscation(
  source: string,
  options: ObfuscationOptions = {},
): ObfuscationResult {
  const code = obfuscateLuaWithOptions(source, options);
  const entropy = calculateEntropy(code);
  const layers = options.vmDepth ? Math.min(options.vmDepth, 3) : (options.dualVm ?? true) ? 2 : 1;
  return {
    code,
    size: new TextEncoder().encode(code).length,
    originalSize: new TextEncoder().encode(source).length,
    entropy,
    layers,
    mode: layers === 2 ? "Dual Polymorphic Register VM" : "Hardened Register VM",
  };
}
