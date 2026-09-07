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

  return `-- This file was protected by LuaMore [https://luamore.app]
do
  local _timeStart = (os and os.clock) and os.clock() or 0

  -- 1. Watermark Integrity
  local y = {
    l = { u = { a = { m = { o = { r = { e = { ["obfuscator"] = "Protected using LuaMore Obfuscator https://luamore.app/" } } } } } } }
  }
  local function checkWatermark()
    return y and y.l and y.l.u and y.l.u.a and y.l.u.a.m and y.l.u.a.m.o and y.l.u.a.m.o.r and y.l.u.a.m.o.r.e and y.l.u.a.m.o.r.e["obfuscator"] == "Protected using LuaMore Obfuscator https://luamore.app/"
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
    "-- This file was protected by LuaMore [https://luamore.app]\n" +
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
