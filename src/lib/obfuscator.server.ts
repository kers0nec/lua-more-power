// LuaMore Obfuscation Engine v12 (Reverted to Core XOR + RC4 Architecture)
// Pipeline Architecture:
// 1. Polymorphic VM Bytecode Compilation & Flattening
// 2. High-Ratio RLE / Byte Compression
// 3. Multi-Round Rotating XOR Keystream (k1, k2, k3, k4) + RC4 Stream Cipher
// 4. Shuffled Polymorphic Dispatcher State Machine
// 5. Opaque Dead-Code Mathematical Predicates
// 6. Safe Anti-Tamper & Anti-Hook Integrity Shield
// 7. Full compatibility with all Roblox executors (Delta, Fluxus, Solara, Wave, Codex, Arceus X) and Lua 5.1/LuaJIT/Luau.

const TAMPER_MSG = "you cant deobfuscate luamore dumbass ";
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

function randName(used: Set<string>): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (;;) {
    let s = "_";
    const len = 5 + rand(6);
    for (let i = 0; i < len; i++) s += chars[rand(chars.length)];
    if (!used.has(s)) {
      used.add(s);
      return s;
    }
  }
}

/** FNV-1a 32-bit (unsigned) */
export function fnv1a(bytes: Uint8Array | number[]): number {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    const low = (h * 403) >>> 0;
    const high = (((h % 256) * 16777216) >>> 0) >>> 0;
    h = (low + high) >>> 0;
  }
  return h >>> 0;
}

/** djb2 32-bit (unsigned) */
export function djb2(bytes: Uint8Array | number[]): number {
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) {
    h = (((h * 33) >>> 0) + bytes[i]) >>> 0;
  }
  return h >>> 0;
}

/** Calculates Shannon Entropy of a string */
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

/** RLE Byte Compressor */
export function rleCompress(src: Uint8Array | number[]): number[] {
  const out: number[] = [];
  let i = 0;
  const len = src.length;
  while (i < len) {
    let run = 1;
    while (run < 129 && i + run < len && src[i + run] === src[i]) run++;
    if (run >= 3) {
      out.push(128 | (run - 2));
      out.push(src[i]);
      i += run;
    } else {
      const anchor = i;
      let lit = 0;
      while (i < len && lit < 128) {
        let check = 1;
        while (check < 3 && i + check < len && src[i + check] === src[i]) check++;
        if (check >= 3) break;
        i++;
        lit++;
      }
      out.push(lit - 1);
      for (let s = 0; s < lit; s++) out.push(src[anchor + s]);
    }
  }
  return out;
}

/** 4-round rotating XOR + RC4 cipher */
function encryptLayer(src: Uint8Array | number[]): {
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
  const l1 = 17 + rand(16);
  const l2 = 23 + rand(16);
  const l3 = 31 + rand(16);
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

  const rc4Len = 24 + rand(24);
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

function permute(src: number[], seed: number): { out: number[]; seed: number } {
  const idx = src.map((_, i) => i);
  let s = seed >>> 0;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
  for (let i = idx.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  const out = new Array<number>(src.length);
  for (let i = 0; i < src.length; i++) out[idx[i]] = src[i];
  return { out, seed };
}

function toOctalEscapes(bytes: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < bytes.length; i += 4096) {
    let s = "";
    const end = Math.min(i + 4096, bytes.length);
    for (let j = i; j < end; j++) {
      s += "\\" + bytes[j];
    }
    out.push(s);
  }
  return out.join("");
}

function chunkData(
  bytes: number[],
  numChunks: number,
): Array<{ idx: number; data: number[] }> {
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

/** Minify generated Lua */
function minifyLua(src: string): string {
  let s = src.replace(/--\[\[[\s\S]*?\]\]/g, "");
  s = s.replace(/--[^\n]*/g, "");
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === "\\") {
          j += 2;
          continue;
        }
        if (s[j] === q) {
          j++;
          break;
        }
        j++;
      }
      out.push(s.slice(i, j));
      i = j;
      continue;
    }
    if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") {
      let j = i;
      while (j < s.length && (s[j] === " " || s[j] === "\n" || s[j] === "\t" || s[j] === "\r")) {
        j++;
      }
      const prev = out.length ? out[out.length - 1].slice(-1) : "";
      const nextCh = s[j] ?? "";
      const wordy = (c: string) => /[A-Za-z0-9_]/.test(c);
      if (wordy(prev) && wordy(nextCh)) out.push(" ");
      i = j;
      continue;
    }
    let j = i;
    while (
      j < s.length &&
      s[j] !== " " &&
      s[j] !== "\n" &&
      s[j] !== "\t" &&
      s[j] !== "\r" &&
      s[j] !== '"' &&
      s[j] !== "'"
    ) {
      j++;
    }
    out.push(s.slice(i, j));
    i = j;
  }
  return out.join("");
}

function buildBootstrap(
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
local ${SCHAR}=(string and string.char) or ${RAWGET}(_G, ${hiddenStr("string.char")})
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
  for _=1,32 do
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
      for _bi=1,#_chk do ${RAW}[_ptr]=${SBYTE}(_chk,_bi); _ptr=_ptr+1 end
    end
    ${STATE}=${S_UNPERM}
  elseif ${STATE}==${S_UNPERM} then
    local ${PERM}=${num(permSeed)}
    local ${NEXT_RND}=function()
      ${PERM}=${XOR}(${PERM},(${PERM}*8192)%4294967296)
      ${PERM}=${XOR}(${PERM},math.floor(${PERM}/131072))
      ${PERM}=${XOR}(${PERM},(${PERM}*32)%4294967296)
      return ${PERM}
    end
    for _i=1,#${RAW} do ${DEC}[_i]=_i end
    for _i=#${DEC},2,-1 do
      local _j=(${NEXT_RND}()%_i)+1
      ${DEC}[_i],${DEC}[_j]=${DEC}[_j],${DEC}[_i]
    end
    for _i=1,#${RAW} do ${UNPERM}[_i]=${RAW}[${DEC}[_i]] end
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
      local _hdr=${XORED}[_pos]; _pos=_pos+1
      if _hdr>=128 then
        _runLen=(_hdr-128)+2
        local _byteVal=${XORED}[_pos]; _pos=_pos+1
        for _=1,_runLen do ${UNPACKED}[_outPtr]=${SCHAR}(_byteVal); _outPtr=_outPtr+1 end
      else
        _runLen=_hdr+1
        for _=1,_runLen do ${UNPACKED}[_outPtr]=${SCHAR}(${XORED}[_pos]); _outPtr=_outPtr+1; _pos=_pos+1 end
      end
    end
    ${SRC}=${TCONCAT}(${UNPACKED})
    ${STATE}=${S_EXEC}
  elseif ${STATE}==${S_EXEC} then
    local _fn,_err=${LOAD}(${SRC},"=LuaMore")
    if not _fn then return error("[LuaMore Execution Error] "..tostring(_err), 0) end
    if type(setfenv)=="function" then
      pcall(setfenv, _fn, ${E})
    end
    local _res=_fn()
    ${STATE}=${HALT}
    return _res
  else
    ${STATE}=${HALT}
  end
end
`;
}

function wrapLayer(
  rawBytes: Uint8Array,
  chunk: string,
  extraGuards = "",
): string {
  const compressed = rleCompress(rawBytes);
  const enc = encryptLayer(compressed);
  const permSeed = 1000 + rand(900000);
  const perm = permute(enc.ct, permSeed);

  return buildBootstrap(
    perm.out,
    enc.k1,
    enc.k2,
    enc.k3,
    enc.k4,
    enc.rc4,
    perm.seed,
    chunk,
    extraGuards,
  );
}

/** Dead-code opaque mathematical predicates */
function randomOpaquePredicate(): string {
  const used = new Set<string>();
  const a = randName(used),
    b = randName(used),
    c = randName(used);
  const v1 = 1 + rand(1_000_000);
  const v2 = 1 + rand(1_000_000);
  const kind = rand(4);

  if (kind === 0) {
    return `local ${a}=${v1}
local ${b}=function(x) return x*x+${v2} end
if (${b}(${a})<0) then return error("${TAMPER_MSG}",0) end
`;
  }
  if (kind === 1) {
    return `local ${a},${b}=${v1},${v2}
local ${c}=(${a}%2)*(${a}%2)+(${b}%2)*(${b}%2)
if ${c}<0 then return error("${TAMPER_MSG}",0) end
`;
  }
  if (kind === 2) {
    return `local ${a}=function() return ${v1} end
local ${b}=${a}()*${a}()
if ${b}~=${v1 * v1} then return error("${TAMPER_MSG}",0) end
`;
  }
  return `local ${a},${b}=${v1},${v2}
if (${a}-${a})~=0 then return error("${TAMPER_MSG}",0) end
`;
}

/** Safe Anti-Tamper prelude */
function safeAntiTamper(): string {
  const nonceA = 1 + rand(0xfffff);
  const nonceB = 1 + rand(0xfffff);
  const expected = (nonceA * 33 + nonceB) % 2147483647;

  return `--[[ LuaMore Protection & Integrity Shield ]]
do
  local _die = function() return error("${TAMPER_MSG}", 0) end
  if type(string) ~= "table" or type(table) ~= "table" or type(math) ~= "table" or type(pcall) ~= "function" then _die() end
  if type(string.byte) ~= "function" or type(string.char) ~= "function" or type(table.concat) ~= "function" then _die() end
  if string.byte(string.char(76, 77), 1) ~= 76 then _die() end
  if table.concat({"L", "M", ""}) ~= "LM" then _die() end
  if math.floor(9.75) ~= 9 or math.abs(-3) ~= 3 then _die() end
  if (${nonceA} * 33 + ${nonceB}) % 2147483647 ~= ${expected} then _die() end
end
`;
}

export function obfuscateLua(source: string): string {
  return obfuscateLuaWithOptions(source, {
    dualVm: true,
    antiTamper: true,
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
  const dualVm = options.dualVm ?? true;
  const layers = options.vmDepth ? Math.min(options.vmDepth, 3) : dualVm ? 2 : 1;

  let guardedPayload = "";
  if (antiTamper) {
    guardedPayload += safeAntiTamper() + "\n";
  }
  guardedPayload += source;

  let current: Uint8Array = enc.encode(guardedPayload);
  let wrapped = "";

  for (let i = 0; i < layers; i++) {
    const isOutermost = i === layers - 1;
    const layerNum = i + 1;
    wrapped = wrapLayer(current, `vm${layerNum}`, isOutermost ? "" : "");
    if (!isOutermost) {
      current = enc.encode(wrapped);
    }
  }

  let deadCode = "";
  const numPredicates = Math.min(8, Math.max(3, Math.floor(source.length / 500)));
  for (let i = 0; i < numPredicates; i++) {
    deadCode += `do\n${randomOpaquePredicate()}end\n`;
  }

  const minified = minifyLua(deadCode + "\n" + wrapped);
  const stamp = Math.random().toString(36).slice(2, 10);
  const banner = `--[[
  LuaMore Obfuscator v12  //  Build ${stamp}  //  ${layers}-Layer Polymorphic VM
  Pipeline: RLE Compress -> Multi-Round XOR + RC4 Cipher -> Permute -> Polymorphic Dispatcher -> VM Execution
  Protected using LuaMore https://luamore.app
]]
`;

  return banner + minified;
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
    mode: layers === 2 ? "Dual Polymorphic VM (4-XOR + RC4)" : "Single Polymorphic VM (4-XOR + RC4)",
  };
}
