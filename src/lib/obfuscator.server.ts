// LuaMore Obfuscation Engine v12
// Quad-layer encryption: RLE Compression + 4-Key Dynamic Rotating XOR + RC4 Stream Cipher + Keyed PRNG Permutation
// Dual-integrity: FNV-1a 32-bit + djb2 32-bit checksums
// Execution VM: Flattened state-machine dispatcher with randomized opcodes
// Compatible with all Roblox executors (Synapse, Wave, KRNL, Solara, Fluxus, Delta, Codex, Arceus X, Hydrogen, Celery, Swift) and standard Lua 5.1/LuaJIT.

const TAMPER_MSG = "LuaMore integrity check failed";
const MAX_SOURCE_BYTES = 5_000_000;

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
    const len = 6 + rand(6);
    for (let i = 0; i < len; i++) s += chars[rand(chars.length)];
    if (!used.has(s)) {
      used.add(s);
      return s;
    }
  }
}

/** FNV-1a 32-bit (unsigned) */
function fnv1a(bytes: Uint8Array | number[]): number {
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
function djb2(bytes: Uint8Array | number[]): number {
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) {
    h = (((h * 33) >>> 0) + bytes[i]) >>> 0;
  }
  return h >>> 0;
}

function encodeEscaped(enc: Uint8Array | number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < enc.length; i++) {
    parts.push(`\\${String(enc[i]).padStart(3, "0")}`);
  }
  return parts.join("");
}

function fragment(arr: number[], parts: number): { idx: number; data: number[] }[] {
  const size = Math.max(1, Math.ceil(arr.length / parts));
  const out: { idx: number; data: number[] }[] = [];
  for (let i = 0, k = 0; i < arr.length; i += size, k++) {
    out.push({ idx: k, data: arr.slice(i, i + size) });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function num(n: number): string {
  if (n < 8) return String(n);
  const a = 1 + rand(Math.max(1, n - 1));
  const b = n - a;
  const op = rand(2);
  if (op === 0) return `(${a}+${b})`;
  return `(${n + a}-${a})`;
}

function hiddenStr(s: string): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) parts.push(`string.char(${s.charCodeAt(i)})`);
  return parts.join("..");
}

/** RLE compression */
function compress(src: Uint8Array): number[] {
  const out: number[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    let run = 1;
    while (run < 129 && i + run < n && src[i + run] === src[i]) run++;
    if (run >= 3) {
      out.push(0x80 | (run - 2));
      out.push(src[i]);
      i += run;
    } else {
      const start = i;
      let lit = 0;
      while (i < n && lit < 128) {
        let r = 1;
        while (r < 3 && i + r < n && src[i + r] === src[i]) r++;
        if (r >= 3) break;
        i++;
        lit++;
      }
      out.push(lit - 1);
      for (let k = 0; k < lit; k++) out.push(src[start + k]);
    }
  }
  return out;
}

/** 4-round rotating XOR + RC4 cipher with dynamic keys */
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
  const l1 = 17 + rand(16),
    l2 = 23 + rand(16),
    l3 = 31 + rand(16),
    l4 = 37 + rand(16);
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
  let s = seed % 2147483648;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
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
  ciphertext: number[],
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
    FRAGS = randName(used);
  const CT = randName(used),
    K1 = randName(used),
    K2 = randName(used);
  const K3 = randName(used),
    K4 = randName(used),
    RC4K = randName(used);
  const PERM = randName(used),
    XOR = randName(used),
    DEC = randName(used);
  const SRC = randName(used),
    FN = randName(used),
    ERR = randName(used);
  const SUM = randName(used),
    SIG = randName(used),
    I = randName(used);
  const J = randName(used),
    T = randName(used),
    IDX = randName(used);
  const S = randName(used),
    NXT = randName(used),
    OUT = randName(used);
  const B = randName(used),
    L1 = randName(used),
    L2 = randName(used);
  const L3 = randName(used),
    L4 = randName(used),
    RL = randName(used);
  const SBOX = randName(used),
    AA = randName(used),
    BB = randName(used);
  const STATE = randName(used),
    RG = randName(used);
  const SBYTE = randName(used),
    SCHAR = randName(used);
  const TCONCAT = randName(used),
    LOAD = randName(used);
  const PLAIN = randName(used),
    TAG = randName(used),
    CNT = randName(used);
  const BV = randName(used),
    P = randName(used);

  const parts = Math.min(8, Math.max(2, Math.floor(ciphertext.length / 800)));
  const frags = fragment(ciphertext, parts);
  const expected = fnv1a(ciphertext);
  const signature = djb2(ciphertext);

  let fragsLua = "{";
  for (const f of frags) fragsLua += `[${num(f.idx)}]="${encodeEscaped(f.data)}",`;
  fragsLua += `n=${num(frags.length)}}`;

  const keyLua = (k: number[]) => "{" + k.map((b) => num(b)).join(",") + "}";

  // Shuffled opcodes
  const opcodes = Array.from({ length: 8 }, () => 100 + rand(900));
  const [S_REASM, S_SUM, S_SIG, S_UNPERM, S_RC4, S_XOR, S_DECOMP, S_LOAD] = opcodes;
  const HALT = 0;

  return `--[[LM/${chunkName}]]
local ${RG}=rawget or function(t,k) return t[k] end
local ${G}=(function()
  local gg=pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg)=="table" then return gg end
  return _G or {}
end)()
local ${SBYTE}=(string and string.byte) or ${RG}(_G, ${hiddenStr("string.byte")})
local ${SCHAR}=(string and string.char) or ${RG}(_G, ${hiddenStr("string.char")})
local ${TCONCAT}=(table and table.concat) or ${RG}(_G, ${hiddenStr("table.concat")})
local ${LOAD}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
  return ${RG}(_G, ${hiddenStr("loadstring")}) or ${RG}(_G, ${hiddenStr("load")})
end)()
${extraGuards}
local ${E}=(function()
  if type(getfenv)=="function" then
    local ok,env=pcall(getfenv,1)
    if ok and type(env)=="table" then return env end
  end
  return ${G}
end)()
local ${FRAGS}=${fragsLua}
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
local ${CT},${OUT},${DEC},${T},${PLAIN},${SRC}={},{},{},{},{},nil
local ${SUM}=2166136261
local ${SIG}=5381
local ${STATE}=${S_REASM}
while ${STATE}~=${HALT} do
  if ${STATE}==${S_REASM} then
    local ${I}=1
    for ${J}=0,${FRAGS}.n-1 do
      local ${S}=${FRAGS}[${J}]
      for ${IDX}=1,#${S} do ${CT}[${I}]=${SBYTE}(${S},${IDX}); ${I}=${I}+1 end
    end
    ${STATE}=${S_SUM}
  elseif ${STATE}==${S_SUM} then
    for ${I}=1,#${CT} do
      ${SUM}=${XOR}(${SUM},${CT}[${I}])
      local _lo=(${SUM}*403)%4294967296
      local _hi=((${SUM}%256)*16777216)%4294967296
      ${SUM}=(_lo+_hi)%4294967296
    end
    if ${SUM}~=${expected} then return error("${TAMPER_MSG}", 0) end
    ${STATE}=${S_SIG}
  elseif ${STATE}==${S_SIG} then
    for ${I}=1,#${CT} do
      ${SIG}=(${SIG}*33+${CT}[${I}])%4294967296
    end
    if ${SIG}~=${signature} then return error("${TAMPER_MSG}", 0) end
    ${STATE}=${S_UNPERM}
  elseif ${STATE}==${S_UNPERM} then
    local ${PERM}=${num(permSeed)}
    local ${NXT}=function()
      ${PERM}=(${PERM}*1103515245+12345)%2147483648
      return ${PERM}
    end
    for ${I}=1,#${CT} do ${T}[${I}]=${I} end
    for ${I}=#${T},2,-1 do
      local ${J}=(${NXT}()%${I})+1
      ${T}[${I}],${T}[${J}]=${T}[${J}],${T}[${I}]
    end
    for ${I}=1,#${CT} do ${OUT}[${I}]=${CT}[${T}[${I}]] end
    ${STATE}=${S_RC4}
  elseif ${STATE}==${S_RC4} then
    local ${SBOX}={}
    for ${I}=0,255 do ${SBOX}[${I}]=${I} end
    local ${J}=0
    for ${I}=0,255 do
      ${J}=(${J}+${SBOX}[${I}]+${RC4K}[(${I}%${RL})+1])%256
      ${SBOX}[${I}],${SBOX}[${J}]=${SBOX}[${J}],${SBOX}[${I}]
    end
    local ${AA},${BB}=0,0
    for ${I}=1,#${OUT} do
      ${AA}=(${AA}+1)%256
      ${BB}=(${BB}+${SBOX}[${AA}])%256
      ${SBOX}[${AA}],${SBOX}[${BB}]=${SBOX}[${BB}],${SBOX}[${AA}]
      ${OUT}[${I}]=${XOR}(${OUT}[${I}],${SBOX}[(${SBOX}[${AA}]+${SBOX}[${BB}])%256])
    end
    ${STATE}=${S_XOR}
  elseif ${STATE}==${S_XOR} then
    for ${I}=1,#${OUT} do
      local ${B}=${OUT}[${I}]
      ${B}=${XOR}(${B},${K1}[((${I}-1)%${L1})+1])
      ${B}=${XOR}(${B},${K2}[((${I}-1)%${L2})+1])
      ${B}=${XOR}(${B},${K3}[((${I}-1)%${L3})+1])
      ${B}=${XOR}(${B},${K4}[((${I}-1)%${L4})+1])
      ${DEC}[${I}]=${B}
    end
    ${STATE}=${S_DECOMP}
  elseif ${STATE}==${S_DECOMP} then
    local ${P},${I}=1,1
    local ${CNT}
    while ${P}<=#${DEC} do
      local ${TAG}=${DEC}[${P}]; ${P}=${P}+1
      if ${TAG}>=128 then
        ${CNT}=(${TAG}-128)+2
        local ${BV}=${DEC}[${P}]; ${P}=${P}+1
        for _=1,${CNT} do ${PLAIN}[${I}]=${SCHAR}(${BV}); ${I}=${I}+1 end
      else
        ${CNT}=${TAG}+1
        for _=1,${CNT} do ${PLAIN}[${I}]=${SCHAR}(${DEC}[${P}]); ${I}=${I}+1; ${P}=${P}+1 end
      end
    end
    ${SRC}=${TCONCAT}(${PLAIN})
    ${STATE}=${S_LOAD}
  elseif ${STATE}==${S_LOAD} then
    local ${FN},${ERR}=${LOAD}(${SRC},"=LuaMore")
    if not ${FN} then return error("[LuaMore Execution Error] "..tostring(${ERR}), 0) end
    if type(setfenv)=="function" then
      pcall(setfenv, ${FN}, ${E})
    end
    local _r=${FN}()
    ${STATE}=${HALT}
    return _r
  else
    ${STATE}=${HALT}
  end
end
`;
}

function wrapLayer(
  rawBytes: Uint8Array,
  chunk: string,
  layerIndex: number,
  isOutermost: boolean,
): string {
  const compressed = compress(rawBytes);
  const enc = encryptLayer(compressed);
  const permSeed = 1000 + rand(900000);
  const perm = permute(enc.ct, permSeed);

  let guards = "";
  if (isOutermost) {
    guards = `
local _probe={}
local _ok=pcall(function()
  setmetatable(_probe,{__index=function(_,k) if k=="lm" then return 731 end end})
  return _probe.lm
end)
if not _ok or _probe.lm~=731 then return error("${TAMPER_MSG}",0) end
`;
  }

  return buildBootstrap(
    perm.out,
    enc.k1,
    enc.k2,
    enc.k3,
    enc.k4,
    enc.rc4,
    perm.seed,
    chunk,
    guards,
  );
}

/** Safe Anti-Tamper prelude that runs cleanly on all Roblox executors & vanilla Lua */
function safeAntiTamper(): string {
  const nonceA = 1 + rand(0xfffff);
  const nonceB = 1 + rand(0xfffff);
  const expected = (nonceA * 33 + nonceB) % 2147483647;

  return `--[[ LuaMore Protection Engine ]]
do
  local _die = function() return error("${TAMPER_MSG}", 0) end
  if type(string) ~= "table" or type(table) ~= "table" or type(math) ~= "table" then _die() end
  if type(string.byte) ~= "function" or type(string.char) ~= "function" or type(table.concat) ~= "function" then _die() end
  if type(pcall) ~= "function" then _die() end
  if string.byte(string.char(76, 77), 1) ~= 76 then _die() end
  if table.concat({"L", "M", ""}) ~= "LM" then _die() end
  if math.floor(9.75) ~= 9 or math.abs(-3) ~= 3 then _die() end
  if (${nonceA} * 33 + ${nonceB}) % 2147483647 ~= ${expected} then _die() end
end
`;
}

export type ObfuscationOptions = {
  dualVm?: boolean;
  antiTamper?: boolean;
  encryptStrings?: boolean;
  proxifyLocals?: boolean;
  proxifyFunctions?: boolean;
  controlFlowFlattening?: boolean;
  isLuauRuntime?: boolean;
  loaderVMDepth?: number; // 1-5, overrides dualVm when provided
  /** Wrap the final payload in an additional Base64 + polymorphic VM bytecode + XOR stage. */
  polymorphicVM?: boolean;
  /** Extra entropy for the polymorphic XOR keystream. Public ID / mode are mixed in. */
  context?: { publicId?: string; mode?: string };
};

/** Simple djb2-mod-2^24 hash, safe in Lua 5.1 doubles and mirrored below. */
function djb2Mod(bytes: number[]): number {
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) {
    h = ((h * 33) + bytes[i]) % 0x1000000;
  }
  return h;
}


/** ---------------- Polymorphic VM outer stage (Base64 + bytecode + XOR) ---------------- */
const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function b64encode(bytes: number[]): string {
  let out = "";
  const n = bytes.length;
  for (let i = 0; i < n; i += 3) {
    const b1 = bytes[i] & 0xff;
    const b2 = i + 1 < n ? bytes[i + 1] & 0xff : 0;
    const b3 = i + 2 < n ? bytes[i + 2] & 0xff : 0;
    const c1 = b1 >> 2;
    const c2 = ((b1 & 3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 15) << 2) | (b3 >> 6);
    const c4 = b3 & 63;
    out += B64_ALPHABET[c1] + B64_ALPHABET[c2];
    out += i + 1 < n ? B64_ALPHABET[c3] : "=";
    out += i + 2 < n ? B64_ALPHABET[c4] : "=";
  }
  return out;
}

/**
 * Polymorphic VM stage:
 *  - Payload bytes XORed with rotating multi-byte key + index-derived rotor.
 *  - Compiled to a bytecode of (op, arg) pairs. Opcode IDs are randomized per
 *    build (polymorphic). Real ops: EMIT, NOP, SKIP2, XORADV.
 *  - Bytecode is Base64-encoded for safe transport.
 *  - A tiny Lua dispatcher decodes Base64, walks bytes, reconstructs the
 *    payload string, then loadstring()s it.
 */
function polymorphicWrap(payload: string, ctx?: { publicId?: string; mode?: string }): string {
  const enc = new TextEncoder();
  const src = Array.from(enc.encode(payload));

  // Per-build random key
  const keyLen = 24 + rand(16);
  const key: number[] = [];
  for (let i = 0; i < keyLen; i++) key.push(randByte());
  const rot0 = 1 + rand(250);

  // Context-derived byte array (mixes public ID + mode into keystream)
  const ctxSeed = `${ctx?.publicId ?? ""}|${ctx?.mode ?? ""}`;
  const ctxBytes = Array.from(enc.encode(ctxSeed));
  const ctxLen = 32;
  const ctx8: number[] = new Array(ctxLen);
  {
    // Expand context bytes via djb2 rolling hash into ctxLen bytes
    let h = 5381 ^ ctxBytes.length;
    for (let i = 0; i < ctxLen; i++) {
      for (let j = 0; j < 4; j++) {
        const b = ctxBytes.length ? ctxBytes[(i * 4 + j) % ctxBytes.length] : (i + j + 1);
        h = (((h * 33) >>> 0) ^ b) >>> 0;
      }
      ctx8[i] = h & 0xff;
    }
  }

  // Integrity: djb2Mod over source bytes; verified in Lua after decode.
  const integrity = djb2Mod(src);

  const opIds = new Set<number>();
  const pickOp = () => {
    for (;;) {
      const v = 1 + rand(250);
      if (!opIds.has(v)) { opIds.add(v); return v; }
    }
  };
  const OP_EMIT = pickOp();
  const OP_NOP = pickOp();
  const OP_SKIP2 = pickOp();
  const OP_XORADV = pickOp();

  const bc: number[] = [];
  let rot = rot0;
  for (let i = 0; i < src.length; i++) {
    if (rand(11) === 0) bc.push(OP_NOP, randByte());
    if (rand(23) === 0) bc.push(OP_SKIP2, randByte(), randByte(), randByte());
    if (rand(37) === 0) {
      const delta = 1 + rand(200);
      bc.push(OP_XORADV, delta);
      rot = (rot + delta) & 0xff;
    }
    const kb = key[i % keyLen];
    const cb = ctx8[i % ctxLen];
    const rb = (i * rot) & 0xff;
    const c = (src[i] ^ kb ^ cb ^ rb) & 0xff;
    bc.push(OP_EMIT, c);
  }

  const b64 = b64encode(bc);
  const used = new Set<string>();
  const B = randName(used), DEC = randName(used), OUT = randName(used);
  const KEY = randName(used), CTX = randName(used), N = randName(used), I = randName(used);
  const K = randName(used), OP = randName(used), AR = randName(used);
  const XOR = randName(used), FN = randName(used), ERR = randName(used);
  const ROT = randName(used), SRC = randName(used), ALPH = randName(used);
  const IDX = randName(used), C1 = randName(used), C2 = randName(used);
  const C3 = randName(used), C4 = randName(used), J = randName(used);
  const CH = randName(used), LOAD = randName(used), TC = randName(used);
  const SCHAR = randName(used), HV = randName(used), BB = randName(used);
  const keyLua = "{" + key.map((b) => num(b)).join(",") + "}";
  const ctxLua = "{" + ctx8.map((b) => num(b)).join(",") + "}";

  return `--[[LM/poly]]
local ${LOAD}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
end)()
local ${TC}=table.concat
local ${SCHAR}=string.char
local ${XOR}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,32 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${ALPH}="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local ${IDX}={}
for ${I}=1,#${ALPH} do ${IDX}[${ALPH}:sub(${I},${I})]=${I}-1 end
local ${B}=${JSON.stringify(b64)}
local ${DEC}={}
do
  local ${N}=#${B}
  local ${I}=1
  local ${J}=1
  while ${I}<=${N} do
    local ${C1}=${IDX}[${B}:sub(${I},${I})] or 0
    local ${C2}=${IDX}[${B}:sub(${I}+1,${I}+1)] or 0
    local c3s=${B}:sub(${I}+2,${I}+2)
    local c4s=${B}:sub(${I}+3,${I}+3)
    local ${C3}=${IDX}[c3s]
    local ${C4}=${IDX}[c4s]
    ${DEC}[${J}]=(${C1}*4+math.floor(${C2}/16))%256; ${J}=${J}+1
    if c3s~="=" and ${C3} then
      ${DEC}[${J}]=((${C2}%16)*16+math.floor(${C3}/4))%256; ${J}=${J}+1
    end
    if c4s~="=" and ${C4} then
      ${DEC}[${J}]=(((${C3} or 0)%4)*64+${C4})%256; ${J}=${J}+1
    end
    ${I}=${I}+4
  end
end
local ${KEY}=${keyLua}
local ${CTX}=${ctxLua}
local ${OUT}={}
local ${ROT}=${num(rot0)}
local ${K}=0
local ${I}=1
local ${N}=#${DEC}
while ${I}<=${N} do
  local ${OP}=${DEC}[${I}]
  local ${AR}=${DEC}[${I}+1] or 0
  ${I}=${I}+2
  if ${OP}==${num(OP_EMIT)} then
    local kb=${KEY}[(${K}%${keyLen})+1]
    local cb=${CTX}[(${K}%${ctxLen})+1]
    local rb=(${K}*${ROT})%256
    local ${CH}=${XOR}(${XOR}(${XOR}(${AR},kb),cb),rb)
    ${OUT}[#${OUT}+1]=${SCHAR}(${CH})
    ${K}=${K}+1
  elseif ${OP}==${num(OP_SKIP2)} then
    ${I}=${I}+2
  elseif ${OP}==${num(OP_XORADV)} then
    ${ROT}=(${ROT}+${AR})%256
  end
end
local ${SRC}=${TC}(${OUT})
-- Loader-side integrity check (djb2 mod 2^24)
local ${HV}=5381
for ${I}=1,#${SRC} do
  ${BB}=${SRC}:byte(${I})
  ${HV}=(${HV}*33 + ${BB}) % 16777216
end
if ${HV} ~= ${num(integrity)} then return error("[LuaMore] payload integrity check failed",0) end
if not ${LOAD} then return error("[LuaMore] no loader",0) end
local ${FN},${ERR}=${LOAD}(${SRC},"=LuaMore/poly")
if not ${FN} then return error("[LuaMore Execution Error] "..tostring(${ERR}),0) end
return ${FN}()
`;
}

export function obfuscateLua(source: string, ctx?: { publicId?: string; mode?: string }): string {
  return obfuscateLuaWithOptions(source, { dualVm: true, antiTamper: true, polymorphicVM: true, context: ctx });
}

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  if (source.length > MAX_SOURCE_BYTES) {
    throw new Error(
      `Source code too large for LuaMore VM — max ${MAX_SOURCE_BYTES / 1_000_000} MB per build`,
    );
  }

  const enc = new TextEncoder();
  const antiTamper = options.antiTamper ?? true;
  let guardedPayload = "";
  if (antiTamper) {
    guardedPayload += safeAntiTamper() + "\n";
  }
  guardedPayload += source;

  const depthRaw = options.loaderVMDepth;
  const depth =
    typeof depthRaw === "number" && depthRaw >= 1 && depthRaw <= 5
      ? Math.floor(depthRaw)
      : (options.dualVm ?? true) ? 2 : 1;
  const layers = depth;

  let current: Uint8Array = enc.encode(guardedPayload);
  let wrapped = "";

  for (let i = 0; i < layers; i++) {
    const isOutermost = i === layers - 1;
    const layerNum = i + 1;
    wrapped = wrapLayer(current, `vm${layerNum}`, layerNum, isOutermost);
    if (!isOutermost) {
      current = enc.encode(wrapped);
    }
  }

  if (options.polymorphicVM) {
    wrapped = polymorphicWrap(wrapped);
  }

  const minified = minifyLua(wrapped);
  const stamp = Math.random().toString(36).slice(2, 10);
  const stageLabel = options.polymorphicVM ? " + Polymorphic Base64/XOR" : "";
  const banner = `--[[
  LuaMore Obfuscator v13  //  Build ${stamp}  //  ${layers}-Layer VM${stageLabel}
  Protected with dynamic 4-key rotating XOR, RC4 stream cipher, dual FNV-1a/djb2 integrity, and optional polymorphic Base64/XOR outer stage.
  https://luamore.app
]]
`;

  return banner + minified;
}

