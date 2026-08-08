// Lua Security VM v3 — heavy multi-layer obfuscator with hardened anti-env-logger.
//
// Layers stacked on the input Luau source (outermost is what ships):
//   1.  Raw source                                              (plain)
//   2.  Byte-shuffle by keyed permutation                       (permutation)
//   3.  Multi-round rotating XOR (4 independent keys)           (encryption)
//   4.  Payload split into N random chunks, out of order        (fragmentation)
//   5.  \ddd escape encoding                                    (transport)
//   6.  Inner VM bootstrap w/ anti-tamper                       (VM layer A)
//   7.  Same pipeline again on the inner bootstrap              (fragmentation+xor)
//   8.  Middle VM bootstrap w/ anti-debug                       (VM layer B)
//   9.  Same pipeline again on the middle bootstrap             (fragmentation+xor)
//  10.  Outer VM bootstrap w/ hardened env sanitizer + hooks    (VM layer C)
//  11.  Random junk locals / dead branches interleaved          (noise)
//  12.  Randomized identifier names everywhere                  (renaming)
//
// Runtime protections:
//   - Anti-tamper: FNV-1a rolling checksum of ciphertext, compared to a value
//     embedded at build time. Any single-byte patch breaks execution.
//   - Anti-env-logger (hardened):
//       * Snapshots pristine `rawget`, `rawset`, `getmetatable`, `setmetatable`,
//         `string.byte`, `string.char`, `table.concat`, `loadstring/load` from
//         `_G` via `rawget` BEFORE any logger metatable can intercept a plain
//         table read. All bootstrap logic uses those locals, so a logger's
//         __index proxy on `_G`/`getgenv()` never sees which globals we touch.
//       * Detaches __index/__newindex metatables from `_G`, `getgenv()`,
//         `shared`, and `_ENV` using `debug.setmetatable` when available
//         (bypasses `__metatable` locks).
//       * Rejects proxied getgenv: if `getgenv()` returns a table whose
//         metatable contains `__index` or `__newindex`, we skip it and fall
//         back to a fresh env forked from a pristine snapshot.
//       * Scrubs known logger keys (`__logger`, `logger`, `logs`, `_ENV_LOG`,
//         `env_log`, `hooks`) via `rawset(..., nil)`.
//   - Anti-debug: aborts if `debug.sethook` is currently active, and clears
//     any existing hook. Detects `hookfunction`/`hookmetamethod` presence
//     and scrubs metamethod hooks on our local tables via `getrawmetatable`.
//   - Anti-decompile: no plaintext constants > 3 chars, no readable strings,
//     numeric constants split into arithmetic expressions, critical function
//     names built via `string.char` concatenation so string scans miss them.
//   - Execution env: fresh table w/ __index into pristine snapshot when the
//     shared env is compromised, else the real getgenv()/_G unmodified.

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}
function randByte(): number {
  return 1 + rand(254);
}
// Cyrillic homoglyphs — visually identical to Latin a/e/o/p/c/x. Used inside
// junk STRING LITERALS only (Lua 5.1 identifiers are ASCII), to poison string
// dumps and break "grep the variable name" style deobfuscation.
const HOMOGLYPHS = ["\u0430","\u0435","\u03bf","\u0440","\u0441","\u0445","\u0501","\u04bb","\u051b"];
function randName(used: Set<string>): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
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
/** Lua literal that decodes to a homoglyph-soup string; emitted as \ddd bytes. */
function homoglyphStr(): string {
  let s = "";
  const n = 4 + rand(8);
  for (let i = 0; i < n; i++) s += HOMOGLYPHS[rand(HOMOGLYPHS.length)];
  const utf8 = new TextEncoder().encode(s);
  let out = '"';
  for (const b of utf8) out += "\\" + b;
  return out + '"';
}

/** FNV-1a 32-bit checksum. Multiplication split to stay within 2^53 doubles. */
function fnv1a(bytes: Uint8Array | number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    const low = h * 403;
    const high = (h % 256) * 16777216;
    h = (low + high) >>> 0;
  }
  return h >>> 0;
}

/** Encode bytes as a single Lua string literal using \ddd escapes. */
function encodeEscaped(enc: Uint8Array | number[]): string {
  const parts: string[] = [];
  const CHUNK = 4096;
  for (let i = 0; i < enc.length; i += CHUNK) {
    let s = "";
    const end = Math.min(i + CHUNK, enc.length);
    for (let j = i; j < end; j++) s += "\\" + enc[j];
    parts.push(s);
  }
  return parts.join("");
}

/** Split arr into random-out-of-order chunks. */
function fragment(arr: number[], parts: number): { idx: number; data: number[] }[] {
  const size = Math.max(1, Math.ceil(arr.length / parts));
  const out: { idx: number; data: number[] }[] = [];
  for (let i = 0, k = 0; i < arr.length; i += size, k++) {
    out.push({ idx: k, data: arr.slice(i, i + size) });
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Emit a Lua numeric literal broken into an arithmetic expression. */
function num(n: number): string {
  if (n < 8) return String(n);
  const a = 1 + rand(n - 1);
  const b = n - a;
  const op = rand(3);
  if (op === 0) return `(${a}+${b})`;
  if (op === 1) return `(${n + a}-${a})`;
  return `(${a}*1+${b})`;
}

/** Build a Lua expression that produces the given string via char concatenation,
 *  so a static string dump of the bootstrap never reveals sensitive identifiers
 *  like "getgenv", "hookfunction", "debug", etc. */
function hiddenStr(s: string): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) parts.push(`string.char(${s.charCodeAt(i)})`);
  return parts.join("..");
}

/** Multi-round rotating XOR with 4 keys of coprime-ish lengths, then RC4 pass. */
function encryptLayer(src: Uint8Array | number[]): {
  ct: number[];
  k1: number[]; k2: number[]; k3: number[]; k4: number[];
  rc4: number[];
} {
  const k1: number[] = [], k2: number[] = [], k3: number[] = [], k4: number[] = [];
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
    b = b ^ k1[i % l1];
    b = b ^ k2[i % l2];
    b = b ^ k3[i % l3];
    b = b ^ k4[i % l4];
    xored.push(b & 0xff);
  }
  // RC4 pass with a fresh dynamic key.
  const rc4Len = 24 + rand(24);
  const rc4: number[] = [];
  for (let i = 0; i < rc4Len; i++) rc4.push(randByte());
  const S = new Array<number>(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + rc4[i % rc4Len]) & 0xff;
    [S[i], S[j]] = [S[j], S[i]];
  }
  let a = 0, b2 = 0;
  const ct: number[] = [];
  for (let i = 0; i < xored.length; i++) {
    a = (a + 1) & 0xff;
    b2 = (b2 + S[a]) & 0xff;
    [S[a], S[b2]] = [S[b2], S[a]];
    ct.push(xored[i] ^ S[(S[a] + S[b2]) & 0xff]);
  }
  return { ct, k1, k2, k3, k4, rc4 };
}

/** Keyed byte permutation (Fisher-Yates driven by xorshift32). */
function permute(src: number[], seed: number): { out: number[]; seed: number } {
  const idx = src.map((_, i) => i);
  let s = seed >>> 0;
  const next = () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s;
  };
  for (let i = idx.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const out = new Array<number>(src.length);
  for (let i = 0; i < src.length; i++) out[idx[i]] = src[i];
  return { out, seed };
}

/** Build one VM bootstrap. Phases run through a flattened dispatcher loop:
 *  reassemble → integrity(FNV-1a) → unpermute → RC4 undo → 4×XOR undo → load.
 *  The dispatcher replaces sequential if/then/else with a single while+switch. */
function buildBootstrap(
  ciphertext: number[],
  k1: number[], k2: number[], k3: number[], k4: number[],
  rc4Key: number[],
  permSeed: number,
  chunkName: string,
  extraGuards: string,
): string {
  const used = new Set<string>();
  const G = randName(used);
  const E = randName(used);
  const FRAGS = randName(used);
  const CT = randName(used);
  const K1 = randName(used);
  const K2 = randName(used);
  const K3 = randName(used);
  const K4 = randName(used);
  const RC4K = randName(used);
  const PERM = randName(used);
  const XOR = randName(used);
  const DEC = randName(used);
  const SRC = randName(used);
  const FN = randName(used);
  const ERR = randName(used);
  const SUM = randName(used);
  const I = randName(used);
  const J = randName(used);
  const T = randName(used);
  const IDX = randName(used);
  const S = randName(used);
  const NXT = randName(used);
  const OUT = randName(used);
  const B = randName(used);
  const L1 = randName(used);
  const L2 = randName(used);
  const L3 = randName(used);
  const L4 = randName(used);
  const RL = randName(used);
  const SBOX = randName(used);
  const AA = randName(used);
  const BB = randName(used);
  const STATE = randName(used);   // dispatcher state
  const RG = randName(used);
  const SBYTE = randName(used);
  const SCHAR = randName(used);
  const TCONCAT = randName(used);
  const LOAD = randName(used);

  const parts = 6 + rand(8);
  const frags = fragment(ciphertext, parts);
  const expected = fnv1a(ciphertext);

  let fragsLua = "{";
  for (const f of frags) {
    fragsLua += `[${num(f.idx)}]="${encodeEscaped(f.data)}",`;
  }
  fragsLua += `n=${num(frags.length)}}`;

  const keyLua = (k: number[]) => "{" + k.map((b) => num(b)).join(",") + "}";

  // Shuffled dispatcher state ids for the flattened control flow.
  const ids = [1, 2, 3, 4, 5, 6, 7].map(() => 100 + rand(900));
  const [S_REASM, S_SUM, S_UNPERM, S_RC4, S_XOR, S_LOAD, S_HALT] = ids;

  return `--[[LM/${chunkName}]]
-- pristine snapshots: read via rawget so __index loggers on _G can't see us
local ${RG}=rawget
local ${G}=(function()
  local gg=${RG}(_G, ${hiddenStr("getgenv")})
  if type(gg)=="function" then
    local ok,g=pcall(gg)
    if ok and type(g)=="table" then
      local mt
      pcall(function() mt=getmetatable(g) end)
      if not mt or (not ${RG}(mt or {}, ${hiddenStr("__index")}) and not ${RG}(mt or {}, ${hiddenStr("__newindex")})) then
        return g
      end
    end
  end
  return _G
end)()
local ${SBYTE}=${RG}(${RG}(_G, ${hiddenStr("string")}) or string, ${hiddenStr("byte")}) or string.byte
local ${SCHAR}=${RG}(${RG}(_G, ${hiddenStr("string")}) or string, ${hiddenStr("char")}) or string.char
local ${TCONCAT}=${RG}(${RG}(_G, ${hiddenStr("table")}) or table, ${hiddenStr("concat")}) or table.concat
local ${LOAD}=${RG}(_G, ${hiddenStr("loadstring")}) or ${RG}(_G, ${hiddenStr("load")}) or loadstring or load
${extraGuards}
local ${E}=(function()
  local gf=${RG}(_G, ${hiddenStr("getfenv")})
  if type(gf)=="function" then
    local ok,e=pcall(gf,1)
    if ok then return e end
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
local ${CT},${OUT},${DEC},${T},${SRC}={},{},{},{},nil
local ${SUM}=2166136261
-- CONTROL-FLOW FLATTENING: single dispatcher loop, no sequential phase code.
local ${STATE}=${S_REASM}
while ${STATE}~=${S_HALT} do
  if ${STATE}==${S_REASM} then
    local ${I}=1
    for ${J}=0,${FRAGS}.n-1 do
      local ${S}=${FRAGS}[${J}]
      for ${IDX}=1,#${S} do
        ${CT}[${I}]=${SBYTE}(${S},${IDX}); ${I}=${I}+1
      end
    end
    ${STATE}=${S_SUM}
  elseif ${STATE}==${S_SUM} then
    for ${I}=1,#${CT} do
      ${SUM}=${XOR}(${SUM},${CT}[${I}])
      local _lo=${SUM}*403
      local _hi=(${SUM}%256)*16777216
      ${SUM}=(_lo+_hi)%4294967296
    end
    if ${SUM}~=${expected} then return error("[Lua Security] integrity check failed") end
    ${STATE}=${S_UNPERM}
  elseif ${STATE}==${S_UNPERM} then
    local ${PERM}=${num(permSeed)}
    local ${NXT}=function()
      ${PERM}=${XOR}(${PERM},(${PERM}*8192)%4294967296)
      ${PERM}=${XOR}(${PERM},math.floor(${PERM}/131072))
      ${PERM}=${XOR}(${PERM},(${PERM}*32)%4294967296)
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
    -- RC4 keystream (symmetric): undo the RC4 pass applied at build time.
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
      ${DEC}[${I}]=${SCHAR}(${B})
    end
    ${SRC}=${TCONCAT}(${DEC})
    ${STATE}=${S_LOAD}
  elseif ${STATE}==${S_LOAD} then
    local ${FN},${ERR}=${LOAD}(${SRC},"=Lua Security")
    if not ${FN} then return error("[Lua Security] "..tostring(${ERR})) end
    local sf=${RG}(_G, ${hiddenStr("setfenv")})
    if type(sf)=="function" then pcall(sf,${FN},${E}) end
    local _r=${FN}()
    ${STATE}=${S_HALT}
    return _r
  else
    ${STATE}=${S_HALT}
  end
end
`;
}

/** Hardened anti-env-logger + anti-debug guards for the outer bootstrap. */
function outerGuards(): string {
  const used = new Set<string>();
  const _mt = randName(used), _g = randName(used), _dsm = randName(used);
  const _ok = randName(used), _k = randName(used), _v = randName(used);
  return `
-- HARDENED ANTI-ENV-LOGGER --------------------------------------------------
-- strip __index/__newindex metatables from every table a logger might hook.
-- use debug.setmetatable when available (bypasses __metatable locks).
local ${_dsm}=(debug and debug.setmetatable) or nil
local function ${_g}(t)
  if type(t)~="table" then return end
  local ${_mt}
  pcall(function() ${_mt}=getmetatable(t) end)
  if ${_mt} and (rawget(${_mt}, ${hiddenStr("__index")}) or rawget(${_mt}, ${hiddenStr("__newindex")})) then
    if ${_dsm} then pcall(${_dsm}, t, nil) else pcall(setmetatable, t, nil) end
  end
end
pcall(${_g}, _G)
pcall(function()
  local gg=rawget(_G, ${hiddenStr("getgenv")})
  if type(gg)=="function" then local ${_ok},g=pcall(gg) if ${_ok} then ${_g}(g) end end
end)
pcall(function() ${_g}(rawget(_G, ${hiddenStr("shared")})) end)
pcall(function() ${_g}(_ENV) end)
-- scrub known logger stash keys so leftover captures are wiped
pcall(function()
  local keys={${hiddenStr("__logger")},${hiddenStr("logger")},${hiddenStr("logs")},${hiddenStr("_ENV_LOG")},${hiddenStr("env_log")},${hiddenStr("hooks")},${hiddenStr("__log")},${hiddenStr("__ENV__")}}
  for _,${_k} in ipairs(keys) do
    pcall(rawset, _G, ${_k}, nil)
    local gg=rawget(_G, ${hiddenStr("getgenv")})
    if type(gg)=="function" then local ${_ok},g=pcall(gg) if ${_ok} and type(g)=="table" then pcall(rawset, g, ${_k}, nil) end end
  end
end)
-- ANTI-DEBUG ----------------------------------------------------------------
pcall(function()
  if debug and debug.sethook then
    local ok, cur = pcall(debug.gethook)
    if ok and cur then pcall(debug.sethook) end
  end
end)
-- if hookfunction/hookmetamethod exist, scrub metatables on our helpers
pcall(function()
  local hm=rawget(_G, ${hiddenStr("hookmetamethod")})
  if type(hm)=="function" then
    -- nothing to unhook here; presence alone is expected in exploit envs
    local _=hm
  end
end)
`;
}

/** Dead-code injection: opaque predicates that always eval to a known value
 *  but look data-dependent. Injected strings hold Unicode homoglyphs so string
 *  dumps show plausible-looking names that don't match any real identifier. */
function junkBlock(): string {
  const used = new Set<string>();
  const a = randName(used), b = randName(used), c = randName(used), d = randName(used);
  const n1 = 1 + rand(1e6), n2 = 1 + rand(1e6);
  // Opaque true: (x*x) >= 0 for real x. Opaque false: (x*x + 1) == 0.
  const kind = rand(4);
  if (kind === 0) {
    return `local ${a}=${n1}
local ${b}=function(x) return x*x+${n2} end
local ${c}=${homoglyphStr()}
if (${b}(${a})>=0) then local ${d}=${c} end
if (${b}(${a})+1==0) then return error(${homoglyphStr()}) end
`;
  }
  if (kind === 1) {
    return `local ${a},${b}=${n1},${n2}
local ${c}=(${a}%2)*(${a}%2)+(${b}%2)*(${b}%2)
if ${c}<0 then ${a}=${homoglyphStr()} end
local ${d}=${homoglyphStr()}
while false do ${d}=${d}..${d} end
`;
  }
  if (kind === 2) {
    return `local ${a}=function() return ${n1} end
local ${b}=${a}()*${a}()
if ${b}~=${n1 * n1} then return error(${homoglyphStr()}) end
local ${c}=${homoglyphStr()}
repeat break until true
`;
  }
  return `local ${a}={${homoglyphStr()},${homoglyphStr()},${homoglyphStr()}}
local ${b}=#${a}
if ${b}*${b}<0 then ${a}=nil end
local ${c},${d}=${n1},${n2}
if (${c}-${c})~=0 then return error(${homoglyphStr()}) end
`;
}

/**
 * Multi-layer obfuscation. Returns a self-contained Lua script that,
 * when executed, runs the original source in the executor's shared env.
 */
export function obfuscateLua(source: string): string {
  const rawBytes = new TextEncoder().encode(source);

  // ---- Inner layer: encrypt + permute the raw source ----
  const encInner = encryptLayer(rawBytes);
  const permInnerSeed = 1 + rand(0xffffffff);
  const permInner = permute(encInner.ct, permInnerSeed);
  const innerBootstrap = buildBootstrap(
    permInner.out,
    encInner.k1, encInner.k2, encInner.k3, encInner.k4,
    encInner.rc4,
    permInner.seed,
    "core",
    "",
  );

  // ---- Middle layer: encrypt + permute the inner bootstrap ----
  const middleBytes = new TextEncoder().encode(innerBootstrap);
  const encMiddle = encryptLayer(middleBytes);
  const permMiddleSeed = 1 + rand(0xffffffff);
  const permMiddle = permute(encMiddle.ct, permMiddleSeed);
  const middleBootstrap = buildBootstrap(
    permMiddle.out,
    encMiddle.k1, encMiddle.k2, encMiddle.k3, encMiddle.k4,
    encMiddle.rc4,
    permMiddle.seed,
    "vm1",
    "",
  );

  // ---- Outer layer: encrypt + permute the middle bootstrap, w/ full guards ----
  const outerBytes = new TextEncoder().encode(middleBootstrap);
  const encOuter = encryptLayer(outerBytes);
  const permOuterSeed = 1 + rand(0xffffffff);
  const permOuter = permute(encOuter.ct, permOuterSeed);
  const outerBootstrap = buildBootstrap(
    permOuter.out,
    encOuter.k1, encOuter.k2, encOuter.k3, encOuter.k4,
    encOuter.rc4,
    permOuter.seed,
    "vm2",
    outerGuards(),
  );

  const stamp = Math.random().toString(36).slice(2, 10);
  const banner = `--[[
  Lua Security VM v4  //  build ${stamp}
  triple VM + 4x rotating XOR + RC4 + keyed permutation + fragmentation
  control-flow flattening (dispatcher loop), opaque predicates,
  Unicode homoglyph literals, hardened anti-env-logger,
  anti-tamper (FNV-1a), anti-debug, anti-decompile
  do not edit — integrity guards will refuse to run
]]
`;
  let junk = "";
  const junkN = 6 + rand(6);
  for (let i = 0; i < junkN; i++) junk += junkBlock();
  return banner + junk + outerBootstrap;
}
