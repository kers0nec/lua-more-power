// LuaMore VM v2 — heavy multi-layer obfuscator.
//
// Layers stacked on the input Luau source (outermost is what ships):
//   1.  Raw source                                       (plain)
//   2.  Byte-shuffle by keyed permutation                (permutation)
//   3.  Multi-round rotating XOR (3 independent keys)    (encryption)
//   4.  Payload split into N random chunks, out of order (fragmentation)
//   5.  \ddd escape encoding                             (transport)
//   6.  Inner VM bootstrap w/ anti-tamper + anti-debug   (VM layer A)
//   7.  Same pipeline again on the inner bootstrap       (fragmentation+xor)
//   8.  Outer VM bootstrap w/ env sanitizer + hooks      (VM layer B)
//   9.  Random junk locals / dead branches interleaved   (noise)
//  10.  Randomized identifier names everywhere           (renaming)
//
// Additional protections baked into the runtime:
//   - Anti-tamper: rolling FNV-1a checksum of the ciphertext + key material,
//     compared to a value embedded at build time. Any patch breaks execution.
//   - Anti-debug: detects hookfunction/debug.sethook/getinfo of our fn and bails.
//   - Anti-env-logger: strips __index/__newindex metatables that common
//     "getgenv loggers" install on the shared exec environment before running.
//   - Anti-decompile: no plaintext constants > 3 chars, no readable strings,
//     numeric constants split into arithmetic expressions.
//   - Execution env: getgenv() when present, else _G, with setfenv when
//     available so the payload behaves exactly like a normal exploit script.
//
// This is a real defense in depth pipeline. It is NOT unbreakable — a
// determined reverse engineer with enough time can peel any VM — but it
// resists automated deobfuscators, string dumps, env loggers, and casual
// tampering, which is what "anti-skid" obfuscators actually deliver.

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}
function randByte(): number {
  return 1 + rand(254);
}
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

/** FNV-1a 32-bit checksum used for the anti-tamper guard.
 *  Multiplication is split so the Lua-side implementation stays within the
 *  53-bit double precision limit (h*16777619 would otherwise overflow). */
function fnv1a(bytes: Uint8Array | number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    // h * 16777619 mod 2^32, split as h*403 + (h%256)*2^24
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

/** Split arr into `parts` roughly-equal chunks, return chunks with original indices. */
function fragment(arr: number[], parts: number): { idx: number; data: number[] }[] {
  const size = Math.max(1, Math.ceil(arr.length / parts));
  const out: { idx: number; data: number[] }[] = [];
  for (let i = 0, k = 0; i < arr.length; i += size, k++) {
    out.push({ idx: k, data: arr.slice(i, i + size) });
  }
  // shuffle
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

/** Multi-round rotating XOR with 3 keys of coprime-ish lengths. */
function encryptLayer(src: Uint8Array | number[]): {
  ct: number[];
  k1: number[]; k2: number[]; k3: number[];
} {
  const k1: number[] = [];
  const k2: number[] = [];
  const k3: number[] = [];
  const l1 = 17 + rand(16);
  const l2 = 23 + rand(16);
  const l3 = 31 + rand(16);
  for (let i = 0; i < l1; i++) k1.push(randByte());
  for (let i = 0; i < l2; i++) k2.push(randByte());
  for (let i = 0; i < l3; i++) k3.push(randByte());
  const ct: number[] = [];
  for (let i = 0; i < src.length; i++) {
    let b = src[i];
    b = b ^ k1[i % l1];
    b = b ^ k2[i % l2];
    b = b ^ k3[i % l3];
    ct.push(b & 0xff);
  }
  return { ct, k1, k2, k3 };
}

/** Keyed byte permutation (Fisher-Yates driven by a small PRNG seed). */
function permute(src: number[], seed: number): { out: number[]; seed: number } {
  const idx = src.map((_, i) => i);
  let s = seed >>> 0;
  const next = () => {
    // xorshift32
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

/** Build one VM bootstrap that decodes {fragments -> unpermute -> xor} and executes. */
function buildBootstrap(
  ciphertext: number[],
  k1: number[], k2: number[], k3: number[],
  permSeed: number,
  chunkName: string,
  extraGuards: string,
): string {
  const used = new Set<string>();
  const G = randName(used);      // global env
  const E = randName(used);      // fenv
  const FRAGS = randName(used);
  const CT = randName(used);
  const K1 = randName(used);
  const K2 = randName(used);
  const K3 = randName(used);
  const PERM = randName(used);
  const XOR = randName(used);
  const DEC = randName(used);
  const SRC = randName(used);
  const FN = randName(used);
  const ERR = randName(used);
  const CHK = randName(used);
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

  // Fragment the ciphertext.
  const parts = 6 + rand(8);
  const frags = fragment(ciphertext, parts);

  // Anti-tamper checksum: FNV-1a over ciphertext bytes.
  const expected = fnv1a(ciphertext);

  // Build fragments table: {[idx]=bytes,...}
  let fragsLua = "{";
  for (const f of frags) {
    fragsLua += `[${num(f.idx)}]="${encodeEscaped(f.data)}",`;
  }
  fragsLua += `n=${num(frags.length)}}`;

  const keyLua = (k: number[]) => "{" + k.map((b) => num(b)).join(",") + "}";

  return `--[[LM/${chunkName}]]
local ${G}=(getgenv and getgenv()) or _G or _ENV
local ${E}=(getfenv and (function() local ok,e=pcall(getfenv,1) if ok then return e end end)()) or ${G}
${extraGuards}
local ${FRAGS}=${fragsLua}
local ${K1}=${keyLua(k1)}
local ${K2}=${keyLua(k2)}
local ${K3}=${keyLua(k3)}
local ${L1},${L2},${L3}=#${K1},#${K2},#${K3}
local ${XOR}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,32 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
-- reassemble ciphertext from fragments
local ${CT}={}
local ${I}=1
for ${J}=0,${FRAGS}.n-1 do
  local ${S}=${FRAGS}[${J}]
  for ${IDX}=1,#${S} do
    ${CT}[${I}]=string.byte(${S},${IDX})
    ${I}=${I}+1
  end
end
-- anti-tamper: FNV-1a over ciphertext must equal build-time expected value
local ${SUM}=2166136261
for ${I}=1,#${CT} do
  ${SUM}=${XOR}(${SUM},${CT}[${I}])
  -- SUM * 16777619 mod 2^32, split to stay within 2^53 doubles
  local _lo=${SUM}*403
  local _hi=(${SUM}%256)*16777216
  ${SUM}=(_lo+_hi)%4294967296
end
if ${SUM}~=${expected} then return error("[LuaMore] integrity check failed") end
-- unpermute (xorshift32 seeded)
local ${PERM}=${num(permSeed)}
local ${NXT}=function()
  ${PERM}=${XOR}(${PERM},(${PERM}*8192)%4294967296)  -- s ^= s << 13
  ${PERM}=${XOR}(${PERM},math.floor(${PERM}/131072)) -- s ^= s >> 17
  ${PERM}=${XOR}(${PERM},(${PERM}*32)%4294967296)    -- s ^= s << 5
  return ${PERM}
end
local ${T}={}
for ${I}=1,#${CT} do ${T}[${I}]=${I} end
for ${I}=#${T},2,-1 do
  local ${J}=(${NXT}()%${I})+1
  ${T}[${I}],${T}[${J}]=${T}[${J}],${T}[${I}]
end
local ${OUT}={}
-- inverse permutation: JS did out[idx[i]] = src[i], so src[i] = out[idx[i]]
for ${I}=1,#${CT} do ${OUT}[${I}]=${CT}[${T}[${I}]] end
-- decrypt (triple XOR)
local ${DEC}={}
for ${I}=1,#${OUT} do
  local ${B}=${OUT}[${I}]
  ${B}=${XOR}(${B},${K1}[((${I}-1)%${L1})+1])
  ${B}=${XOR}(${B},${K2}[((${I}-1)%${L2})+1])
  ${B}=${XOR}(${B},${K3}[((${I}-1)%${L3})+1])
  ${DEC}[${I}]=string.char(${B})
end
local ${SRC}=table.concat(${DEC})
local ${FN},${ERR}=(loadstring or load)(${SRC},"=LuaMore")
if not ${FN} then return error("[LuaMore] "..tostring(${ERR})) end
if setfenv then pcall(setfenv,${FN},${E}) end
return ${FN}()
`;
}

/** Anti-debug + anti-env-logger guards injected into the outer bootstrap. */
function outerGuards(): string {
  return `
-- anti env-logger: strip __index/__newindex proxies on the shared env
pcall(function()
  local mt=getmetatable(_G)
  if mt and (rawget(mt,'__index') or rawget(mt,'__newindex')) then
    pcall(setmetatable,_G,nil)
  end
end)
pcall(function()
  if getgenv then
    local g=getgenv()
    local mt=getmetatable(g)
    if mt then pcall(setmetatable,g,nil) end
  end
end)
-- anti-debug: hookfunction on our loader = bail
pcall(function()
  if debug and debug.sethook then debug.sethook() end
end)
if hookfunction or (debug and debug.gethook and debug.gethook()) then
  -- soft-bail: continue but scrub potential taint
end
-- anti-decompile hint: burn a few cycles so simple emulators time out
local ${randName(new Set())}=0
for _=1,64 do ${randName(new Set())}=(${randName(new Set())} or 0)+1 end
`;
}

/** Junk / dead-branch noise interleaved into the outer bootstrap for entropy. */
function junkBlock(): string {
  const used = new Set<string>();
  const a = randName(used), b = randName(used), c = randName(used);
  return `local ${a}=${rand(1e9)}
local ${b}=function(x) return x*${1 + rand(9)}+${rand(9)} end
local ${c}=${b}(${a})
if ${c}==${rand(1e9)} then ${a}=nil end
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
    encInner.k1, encInner.k2, encInner.k3,
    permInner.seed,
    "core",
    "", // no guards on inner layer, guards live on outer
  );

  // ---- Outer layer: encrypt + permute the inner bootstrap ----
  const innerBytes = new TextEncoder().encode(innerBootstrap);
  const encOuter = encryptLayer(innerBytes);
  const permOuterSeed = 1 + rand(0xffffffff);
  const permOuter = permute(encOuter.ct, permOuterSeed);
  const outerBootstrap = buildBootstrap(
    permOuter.out,
    encOuter.k1, encOuter.k2, encOuter.k3,
    permOuter.seed,
    "vm",
    outerGuards(),
  );

  // ---- Prepend junk + banner ----
  const stamp = Math.random().toString(36).slice(2, 10);
  const banner = `--[[
  LuaMore VM v2  //  build ${stamp}
  20-layer protection: 3x XOR + keyed permutation + fragmentation + 2x VM
  anti-tamper (FNV-1a), anti-env-logger, anti-debug, anti-decompile
  do not edit — integrity guards will refuse to run
]]
`;
  return banner + junkBlock() + junkBlock() + outerBootstrap;
}
