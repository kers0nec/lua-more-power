// LuaMore VM v6 — quad-nested VM, RLE compress, 4xor + RC4, dual FNV-1a/djb2
// sign, env proxy, hardened anti-env-logger + anti-hook (hookfunction,
// hookmetamethod, getrawmetatable, getgc, getreg, decompile, dumpstring, ...).
//
// Build pipeline (per layer, applied 3× nested):
//   1. Source bytes
//   2. RLE-lite compression                                (compress)
//   3. 4-key rotating XOR                                  (encrypt A)
//   4. RC4 stream cipher, dynamic key                      (encrypt B)
//   5. Keyed Fisher-Yates permutation                      (shuffle)
//   6. Fragmented, shuffled chunk table                    (transport)
//   7. FNV-1a + djb2 dual signature                        (sign)
//   8. Bootstrap w/ flattened dispatcher (shuffled opcodes)(VM)
//   9. Nested twice more → VM(VM(VM(payload)))            (stacked VM)
//  10. Bootstrap minified (whitespace/comments stripped)   (minify)
//
// Runtime protections:
//   - Dual anti-tamper: FNV-1a AND djb2 checksums both verified. Any single
//     byte patch breaks execution at two independent phases.
//   - Anti-env-logger (hardened): pristine `rawget` snapshots, __index/
//     __newindex stripping via `debug.setmetatable`, logger-key scrubbing.
//   - Anti-debug: aborts on active hooks, detects hookfunction presence.
//   - Anti-decompile: pseudo-bytecode dispatcher, opaque predicates, infinite
//     loop traps, Unicode-homoglyph string literals, hidden identifiers via
//     `string.char` concatenation, minified whitespace.
//
// When any tamper / integrity / anti-decompile guard trips, the VM aborts and
// surfaces this single taunt message instead of a useful error — so an attacker
// who patched a byte, hooked an env logger, or is probing the VM learns nothing.

const TAMPER_MSG = "you cant deobfuscate luamore dumbass ";

/** Hard input budget. Each VM layer re-emits the payload ~4× as `\ddd`
 *  escapes, so past ~2 MB of source the intermediate strings push the
 *  worker past its memory limit. Fail fast instead of OOMing mid-build. */
const MAX_SOURCE_BYTES = 2_000_000;

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}
function randByte(): number {
  return 1 + rand(254);
}

const HOMOGLYPHS = [
  "\u0430",
  "\u0435",
  "\u03bf",
  "\u0440",
  "\u0441",
  "\u0445",
  "\u0501",
  "\u04bb",
  "\u051b",
];
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
function homoglyphStr(): string {
  let s = "";
  const n = 4 + rand(8);
  for (let i = 0; i < n; i++) s += HOMOGLYPHS[rand(HOMOGLYPHS.length)];
  const utf8 = new TextEncoder().encode(s);
  let out = '"';
  for (const b of utf8) out += "\\" + b;
  return out + '"';
}

/** FNV-1a 32-bit (multiplication split to stay under 2^53). */
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

/** djb2 32-bit — second independent signature. Runs alongside FNV-1a so a
 *  patch that compensates one hash won't survive the other. */
function djb2(bytes: Uint8Array | number[]): number {
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) {
    h = (h * 33 + bytes[i]) >>> 0;
  }
  return h >>> 0;
}

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

function num(n: number): string {
  if (n < 8) return String(n);
  const a = 1 + rand(n - 1);
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

/** RLE-lite compression: emits packets of either a literal run (0..127 bytes)
 *  or a repeat run (2..129 copies of one byte). Format:
 *    byte tag: high bit 0 → literal, low 7 bits = count-1 (1..128 literals)
 *              high bit 1 → repeat,  low 7 bits = count-2 (2..129 copies) + byte
 *  Simple, safe, and the inverse fits in ~8 lines of Lua. */
function compress(src: Uint8Array): number[] {
  const out: number[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    // detect run
    let run = 1;
    while (run < 129 && i + run < n && src[i + run] === src[i]) run++;
    if (run >= 3) {
      out.push(0x80 | (run - 2));
      out.push(src[i]);
      i += run;
    } else {
      // literal batch until next run of >=3
      const start = i;
      let lit = 0;
      while (i < n && lit < 128) {
        let r = 1;
        while (r < 3 && i + r < n && src[i + r] === src[i]) r++;
        if (r >= 3) break;
        i++;
        lit++;
      }
      out.push(lit - 1); // 0..127 → 1..128 literals
      for (let k = 0; k < lit; k++) out.push(src[start + k]);
    }
  }
  return out;
}

/** 4-round rotating XOR + RC4 with dynamic keys. */
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
    [S[i], S[j]] = [S[j], S[i]];
  }
  let a = 0,
    b2 = 0;
  const ct: number[] = [];
  for (let i = 0; i < xored.length; i++) {
    a = (a + 1) & 0xff;
    b2 = (b2 + S[a]) & 0xff;
    [S[a], S[b2]] = [S[b2], S[a]];
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
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const out = new Array<number>(src.length);
  for (let i = 0; i < src.length; i++) out[idx[i]] = src[i];
  return { out, seed };
}

/** Minify Lua source: strip `--[[...]]` blocks, `-- line` comments, collapse
 *  runs of whitespace outside of strings. Only invoked on our generated
 *  bootstrap, which never contains `"--"` inside string literals. */
function minifyLua(src: string): string {
  // strip block comments
  let s = src.replace(/--\[\[[\s\S]*?\]\]/g, "");
  // strip line comments (bootstrap has no `--` inside strings)
  s = s.replace(/--[^\n]*/g, "");
  // collapse whitespace but preserve string literals
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
      // walk whitespace
      let j = i;
      while (j < s.length && (s[j] === " " || s[j] === "\n" || s[j] === "\t" || s[j] === "\r")) j++;
      const prev = out.length ? out[out.length - 1].slice(-1) : "";
      const nextCh = s[j] ?? "";
      // keep a separator when both sides are identifier/keyword/number chars
      const wordy = (c: string) => /[A-Za-z0-9_]/.test(c);
      if (wordy(prev) && wordy(nextCh)) out.push(" ");
      i = j;
      continue;
    }
    // push a whole non-whitespace run in one go (memory-safe for multi-MB
    // payloads — per-char pushing OOM'd the worker on large sources)
    let j = i;
    while (j < s.length && s[j] !== " " && s[j] !== "\n" && s[j] !== "\t" && s[j] !== "\r" && s[j] !== '"' && s[j] !== "'") j++;
    out.push(s.slice(i, j));
    i = j;
  }
  return out.join("");
}

/** One VM bootstrap with a flattened dispatcher whose opcode IDs are shuffled
 *  each build. Phases: reassemble → FNV integrity → djb2 signature →
 *  unpermute → RC4-undo → 4xor-undo → decompress → load. */
function buildBootstrap(
  ciphertext: number[],
  k1: number[],
  k2: number[],
  k3: number[],
  k4: number[],
  rc4Key: number[],
  permSeed: number,
  chunkName: string,
  extraGuards: string,
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

  const parts = 6 + rand(8);
  const frags = fragment(ciphertext, parts);
  const expected = fnv1a(ciphertext);
  const signature = djb2(ciphertext);

  let fragsLua = "{";
  for (const f of frags) fragsLua += `[${num(f.idx)}]="${encodeEscaped(f.data)}",`;
  fragsLua += `n=${num(frags.length)}}`;

  const keyLua = (k: number[]) => "{" + k.map((b) => num(b)).join(",") + "}";

  // Shuffle dispatcher opcodes so the same phase gets a different ID each build.
  const opcodes = Array.from({ length: 8 }, () => 100 + rand(900));
  const [S_REASM, S_SUM, S_SIG, S_UNPERM, S_RC4, S_XOR, S_DECOMP, S_LOAD] = opcodes;
  const HALT = 0;

  return `--[[LM/${chunkName}]]
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
  if type(gf)=="function" then local ok,e=pcall(gf,1) if ok then return e end end
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
      local _lo=${SUM}*403
      local _hi=(${SUM}%256)*16777216
      ${SUM}=(_lo+_hi)%4294967296
    end
    if ${SUM}~=${expected} then return error("${TAMPER_MSG}") end
    ${STATE}=${S_SIG}
  elseif ${STATE}==${S_SIG} then
    for ${I}=1,#${CT} do
      ${SIG}=(${SIG}*33+${CT}[${I}])%4294967296
    end
    if ${SIG}~=${signature} then return error("${TAMPER_MSG}") end

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
    if not ${FN} then return error("[LuaMore] "..tostring(${ERR})) end
    local sf=${RG}(_G, ${hiddenStr("setfenv")})
    if type(sf)=="function" then
      local _proxy=setmetatable({}, {
        __index=function(_,k) return ${E}[k] end,
        __newindex=function(_,k,v) ${E}[k]=v end,
        __metatable=false,
      })
      pcall(sf,${FN},_proxy)
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

function outerGuards(): string {
  const used = new Set<string>();
  const _ok = randName(used),
    _value = randName(used),
    _probe = randName(used);
  return `
local ${_probe}={}
local ${_ok},${_value}=pcall(function()
  setmetatable(${_probe},{__index=function(_,k) if k=="lm" then return 731 end end,__metatable=false})
  return ${_probe}.lm
end)
if not ${_ok} or ${_value}~=731 then return error("${TAMPER_MSG}",0) end
`;
}

function junkBlock(): string {
  const used = new Set<string>();
  const a = randName(used),
    b = randName(used),
    c = randName(used),
    d = randName(used),
    e = randName(used);
  const n1 = 1 + rand(1e6),
    n2 = 1 + rand(1e6);
  const kind = rand(8);
  if (kind === 0)
    return `local ${a}=${n1}
local ${b}=function(x) return x*x+${n2} end
local ${c}=${homoglyphStr()}
if (${b}(${a})>=0) then local ${d}=${c} end
if (${b}(${a})+1==0) then return error(${homoglyphStr()}) end
`;
  if (kind === 1)
    return `local ${a},${b}=${n1},${n2}
local ${c}=(${a}%2)*(${a}%2)+(${b}%2)*(${b}%2)
if ${c}<0 then ${a}=${homoglyphStr()} end
local ${d}=${homoglyphStr()}
while false do ${d}=${d}..${d} end
`;
  if (kind === 2)
    return `local ${a}=function() return ${n1} end
local ${b}=${a}()*${a}()
if ${b}~=${n1 * n1} then return error(${homoglyphStr()}) end
local ${c}=${homoglyphStr()}
repeat break until true
`;
  if (kind === 3)
    return `local ${a}={${homoglyphStr()},${homoglyphStr()},${homoglyphStr()}}
local ${b}=#${a}
if ${b}*${b}<0 then ${a}=nil end
local ${c},${d}=${n1},${n2}
if (${c}-${c})~=0 then return error(${homoglyphStr()}) end
`;
  if (kind === 4)
    return `local ${a},${b}=${n1},${n2}
while (${a}*${a}+1)==0 do
  ${b}=${b}+${a}
  while (${b}*${b}+7)<0 do ${a}=${a}*${b}; ${b}=${b}+1 end
  repeat ${a}=${a}+${b} until (${a}*${a})<0
end
`;
  if (kind === 5)
    return `local function ${a}(x) return ${a}(x+1) end
local ${b}=${n1}
if (${b}%2)*(${b}%2)<0 then ${a}(${b}) end
while (${b}-${b})~=0 do ${a}(${b}) end
`;
  if (kind === 6)
    return `local ${a},${b},${c}=${n1},${n2},0
while ${a}<${a} do
  while ${b}<${b} do
    while ${c}<${c} do ${c}=${c}+1 end
    ${b}=${b}+${c}
  end
  ${a}=${a}+${b}
end
repeat ${c}=${c}+1 until (${c}*${c})>=0
`;

  return `local ${a}=${n1}
local ${b}=function()
  while true do ${a}=${a}+1; coroutine.yield(${a}) end
end
if (${a}*${a}+1)==0 then
  local ${c}=coroutine.create(${b})
  while true do coroutine.resume(${c}) end
end
local ${d},${e}=${homoglyphStr()},${homoglyphStr()}
for _=1,0 do ${d}=${d}..${e} end
`;
}

function layerRuntimeGuards(layer: number): string {
  const nonceA = 10_000 + rand(900_000);
  const nonceB = 10_000 + rand(900_000);
  const expected = (nonceA * 33 + nonceB) % 2147483647;
  return `
do
  local _lm_fail=function() return error("${TAMPER_MSG}",0) end
  local _lm_ok,_lm_value
  if type(rawget)~="function" or type(rawset)~="function" or type(pcall)~="function" or type(xpcall)~="function" then _lm_fail() end
  if type(string)~="table" or type(table)~="table" or type(math)~="table" then _lm_fail() end
  if type(string.byte)~="function" or type(string.char)~="function" or type(string.sub)~="function" or type(table.concat)~="function" then _lm_fail() end
  if string.byte(string.char(76,77),1)~=76 or string.sub("LuaMore",1,3)~="Lua" or table.concat({"V","M"})~="VM" then _lm_fail() end
  if math.floor(7.75)~=7 or (${nonceA}*33+${nonceB})%2147483647~=${expected} then _lm_fail() end
  _lm_ok=pcall(error,"LuaMore probe",0); if _lm_ok then _lm_fail() end
  local _lm_probe={}
  local _lm_mt={__index=function(_,k) if k=="layer" then return ${layer} end end,__metatable="LuaMore"}
  setmetatable(_lm_probe,_lm_mt)
  if _lm_probe.layer~=${layer} or getmetatable(_lm_probe)~="LuaMore" then _lm_fail() end
  _lm_ok,_lm_value=pcall(function()
    local gg=rawget(_G,"getgenv")
    if type(gg)=="function" then return gg() end
    return _G
  end)
  if not _lm_ok or type(_lm_value)~="table" then _lm_fail() end
  if debug and type(debug.gethook)=="function" then
    _lm_ok,_lm_value=pcall(debug.gethook)
    if _lm_ok and _lm_value~=nil then _lm_fail() end
  end
end
`;
}

/** compress → encrypt → permute → independently guarded bootstrap. */
function wrapLayer(
  plain: Uint8Array,
  chunk: string,
  layer: number,
  outermost: boolean,
  validationMarkers: boolean,
): string {
  const compressed = compress(plain);
  const enc = encryptLayer(compressed);
  const seed = 1 + rand(0xffffffff);
  const perm = permute(enc.ct, seed);
  const marker = validationMarkers
    ? `if io and io.write then io.write("LUAMORE_VM${layer}_INTEGRITY_PASS\\n") end`
    : "";
  const guards = layerRuntimeGuards(layer) + (outermost ? outerGuards() : "") + marker;
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

/** Pick a VM nesting depth that keeps output within ~12 MB regardless of
 *  input size. Each layer expands the payload ~4× (bytes emitted as `\ddd`
 *  escapes inside the bootstrap), so a raw 6-layer stack blows past 100 MB
 *  once the source crosses ~50 KB. We shrink depth as input grows so any
 *  script — from a one-liner to a full game source — completes without
 *  OOM/timeout. Deep-nested strength is preserved for the tiny snippets
 *  where a deobfuscator has the most to gain. */
function pickLayers(bytes: number): number {
  if (bytes <= 512) return 6;
  if (bytes <= 4_000) return 5;
  if (bytes <= 16_000) return 4;
  if (bytes <= 80_000) return 3;
  if (bytes <= 400_000) return 2;
  return 1;
}

function pickJunk(bytes: number): number {
  if (bytes <= 4_000) return 220 + rand(120);
  if (bytes <= 40_000) return 120 + rand(60);
  if (bytes <= 200_000) return 60 + rand(40);
  if (bytes <= 1_000_000) return 24 + rand(16);
  return 8 + rand(8);
}

/** Compatibility-safe runtime guard prepended to the user script. Payload
 * integrity is enforced over the complete encrypted body by each VM layer;
 * this prelude only verifies primitives needed by the decoder. It never
 * mutates executor globals, yields, creates Instances, or deliberately hangs. */
function luaMoreProtection(userSource: string): string {
  const sample = Array.from(new TextEncoder().encode(userSource.slice(0, 128)));
  const sampleDjb = djb2(sample);
  return `-- LuaMore Protection v2
do
  local _die=function() return error("${TAMPER_MSG}",0) end
  if type(string)~="table" or type(math)~="table" or type(table)~="table" then _die() end
  if type(string.byte)~="function" or type(string.char)~="function" or type(table.concat)~="function" then _die() end
  if type(pcall)~="function" or type(rawget)~="function" or type(setmetatable)~="function" then _die() end
  if string.byte(string.char(76,77),1)~=76 or table.concat({"L","M"})~="LM" or math.floor(9.75)~=9 then _die() end
  local _ok=pcall(error,"LuaMore probe",0); if _ok then _die() end
  local _b={${sample.join(",")}}
  local _h2=5381
  for _i=1,#_b do _h2=(_h2*33+_b[_i])%4294967296 end
  if _h2~=${sampleDjb} then _die() end
end
`;
}

// Rscripts anti-logger / anti-executor trap. Prepended (obfuscated along with
// the user payload) so that every LuaMore build runs these environment checks
// before user code. Roblox-only — it calls `game:GetService`, so it must NOT
// be exercised under the plain-Lua test harness (tests pass `antiLogger:false`).
const LOGGER_TRAP_SOURCE = `-- This File Was Fetched From Galactic https://discord.gg/qy2neXET6W-- [[ Rscripts Risk Notice ]]
-- This script is not verified by rscripts.net. Deal with caution.
--
-- Stay safe:
--   • Never log in on unofficial Roblox sites or lookalike domains.
--   • Real Roblox links use roblox.com (check the .com ending).
--   • Treat fake Roblox login / "claim reward" pages as phishing.
-- [[ End Rscripts Risk Notice ]]
-- 1
local Players = game:GetService("Players")

local ok, player = pcall(function()
    return Players:GetPlayerFromCharacter(workspace)
end)

if ok and player == nil then
else
   print'1' -- inf loop here
end

-- code below runs fine in a exec.
print'pass'

-- 2
local GuiService = game:GetService("GuiService")
local origSelected = GuiService.SelectedObject
GuiService.SelectedObject = nil
task.wait()
if GuiService.SelectedObject ~= nil then
   print'1' -- inf loop
end
local fakePart = Instance.new("Part")
local setOk = pcall(function()
    GuiService.SelectedObject = fakePart
end)
if setOk then
   print'2' -- inf loop
end
GuiService.SelectedObject = origSelected

-- code below runs fine in a exec.
print'pass'

-- 3
local Tween123 = game:GetService("TweenService")
local part21 = Instance.new("Part")
local badGoal23 = {
    Position = "detected fr?",
    CFrame = true,
    Transparency = "how sad T_T"
}
local tweenOk = pcall(function()
    Tween123:Create(part21, TweenInfo.new(1), badGoal23)
end)
if tweenOk then
    print'1'
else
end
local goodTween = Tween123:Create(part21, TweenInfo.new(0.1), {
    Transparency = 1
})
goodTween:Play()
task.wait()
goodTween:Cancel()

-- code below runs fine in a exec.
print'pass'

-- 4
local DS = game:GetService("DataStoreService")
local invalidName = "logger_trap//invalid@chars"
local dsOk, store = pcall(DS.GetDataStore, DS, invalidName, "scope")

if dsOk and store then
    print'1'
end

if not dsOk and not tostring(store):lower():find("invalid") and not tostring(store):find("name") then
else
    print'2'
end

local globalOk = pcall(DS.GetGlobalDataStore, DS)
if not globalOk then
else
    print'3'
end

-- code below runs fine in a exec.
print'pass'

-- 5
local StarterPlayer = game:GetService("StarterPlayer")
local sps = StarterPlayer:FindFirstChild("StarterPlayerScripts")

if not sps then
    print'1' -- inf loop here
end

local childCount = #sps:GetChildren()
if childCount < 2 then
    print'2' -- inf loop here
end

local testScript = Instance.new("LocalScript")
testScript.Source = "sigma boi"
testScript.Parent = sps

local stillThere = sps:FindFirstChild(testScript.Name)
testScript:Destroy()

if not stillThere then
    print'3' -- inf loop here
end

-- code below runs fine in a exec.
print'pass'

-- 6
local PromptService = game:GetService("ProximityPromptService")
local shown, hidden = false, false
local conShown = PromptService.PromptShown:Connect(function() shown = true end)
local conHidden = PromptService.PromptHidden:Connect(function() hidden = true end)
local part = Instance.new("Part")
part.Parent = workspace
local prompt = Instance.new("ProximityPrompt")
prompt.Parent = part
task.wait()
conShown:Disconnect()
conHidden:Disconnect()
prompt:Destroy()
part:Destroy()

if not shown or not hidden then
else
    print'1' -- inf loop here or whatever
end

-- code below runs fine in a exec.
print'pass'

-- 7
local Teams = game:GetService("Teams")
local neutral = Teams:FindFirstChild("Neutral")
if neutral and neutral.TeamColor ~= BrickColor.new("Medium stone grey") then
    print'1' -- inf loop
end

-- code below runs fine in a exec.
print'pass'

-- 8
local GroupService = game:GetService("GroupService")

local ok, groups = pcall(function()
    return GroupService:GetGroupsAsync(game.Players.LocalPlayer.UserId)
end)

if ok and groups then
    if #groups < 1 then
    else
        print'1' -- inf loop
    end
else
    print'2' -- inf loop
end

-- code below runs fine in a exec.
print'pass'
`;

/** Compatibility-safe anti-tamper prelude. Combined with the anti-logger trap
 *  and embedded (obfuscated) ahead of every user payload. Verifies environment
 *  primitives, metatable integrity, hook leakage (hookfunction /
 *  hookmetamethod), active debug hooks, and a per-build opaque nonce. Safe under
 *  plain Lua AND Roblox — unlike the anti-logger trap it never touches `game`,
 *  so the plain-Lua test harness exercises it too. Any guard that trips aborts
 *  with the taunt message. */
function antiTamperPrelude(): string {
  const nonceA = 1 + rand(0xfffff);
  const nonceB = 1 + rand(0xfffff);
  const expected = (nonceA * 33 + nonceB) % 2147483647;
  const nonceC = 1 + rand(0xfffff);
  const nonceD = 1 + rand(0xfffff);
  const expected2 = (nonceC * 131 + nonceD) % 2147483647;
  return `-- LuaMore Anti-Tamper v2 (combined prelude)
do
  local _die=function() return error("${TAMPER_MSG}",0) end
  if type(string)~="table" or type(table)~="table" or type(math)~="table" then _die() end
  if type(string.byte)~="function" or type(string.char)~="function" or type(string.sub)~="function" or type(string.rep)~="function" or type(string.format)~="function" or type(string.len)~="function" then _die() end
  if type(table.concat)~="function" or type(table.insert)~="function" or type(pcall)~="function" or type(xpcall)~="function" then _die() end
  if type(rawget)~="function" or type(rawset)~="function" or type(setmetatable)~="function" or type(getmetatable)~="function" then _die() end
  if type(next)~="function" or type(tostring)~="function" or type(tonumber)~="function" or type(select)~="function" or type(unpack)~="function" then _die() end
  if type(loadstring)~="function" and type(load)~="function" then _die() end
  if string.byte(string.char(76,77),1)~=76 then _die() end
  if string.sub("LuaMore",1,3)~="Lua" then _die() end
  if table.concat({"L","M",""})~="LM" then _die() end
  if string.rep("x",3)~="xxx" or string.len("LuaMore")~=7 or string.format("%d",9)~="9" then _die() end
  if math.floor(9.75)~=9 or math.abs(-3)~=3 or math.max(1,5,3)~=5 or math.min(4,2)~=2 then _die() end
  local _ins={}
  table.insert(_ins,5)
  if _ins[1]~=5 or #_ins~=1 then _die() end
  local _tbl={1,2,3}
  if #_tbl~=3 or _tbl[2]~=2 or _tbl[1]+_tbl[2]~=3 then _die() end
  local _ok=pcall(error,"LuaMore probe",0)
  if _ok then _die() end
  local _probe={}
  local _mt={__index=function(_,k) if k=="LuaMore" then return 92617 end end,__metatable="LuaMore"}
  setmetatable(_probe,_mt)
  if _probe.LuaMore~=92617 or getmetatable(_probe)~="LuaMore" then _die() end
  if (${nonceA}*33+${nonceB})%2147483647~=${expected} then _die() end
  if (${nonceC}*131+${nonceD})%2147483647~=${expected2} then _die() end
  local _opaque=((7*7+3)%11)
  if _opaque~=8 then _die() end
  local _genv=rawget(_G,"getgenv")
  if type(_genv)=="function" then
    local _a,_b=pcall(_genv)
    if not _a or type(_b)~="table" then _die() end
  end
  if type(rawget(_G,"hookfunction"))=="function" then _die() end
  if type(rawget(_G,"hookmetamethod"))=="function" then _die() end
  if type(rawget(_G,"getrawmetatable"))=="function" then _die() end
  local _dbg=rawget(_G,"debug")
  if type(_dbg)=="table" and type(rawget(_dbg,"gethook"))=="function" then
    local _a,_h=pcall(rawget(_dbg,"gethook"))
    if _a and _h~=nil then _die() end
  end
end
`;
}

export function obfuscateLua(source: string): string {
  return obfuscateLuaWithOptions(source, { dualVm: true });
}

export type ObfuscationOptions = {
  dualVm?: boolean;
  validationMarkers?: boolean;
  /** Embed the Rscripts anti-logger / anti-executor trap ahead of user code.
   *  Defaults to true. Roblox-only — set false for the plain-Lua test harness. */
  antiLogger?: boolean;
  /** Embed the LuaMore anti-tamper prelude ahead of user code. Defaults to
   *  true. Compatibility-safe under plain Lua and Roblox. */
  antiTamper?: boolean;
  /** Force a minimum number of nested VM layers (deeper dual-VM). Output grows
   *  ~4× per layer, so only raise this on small scripts. When unset the depth
   *  is auto-selected from input size (see `pickLayers`). Ignored when
   *  `dualVm` is false. */
  vmDepth?: number;
};

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  if (source.length > MAX_SOURCE_BYTES) {
    throw new Error(`source too large for the LuaMore VM — max ${MAX_SOURCE_BYTES / 1_000_000} MB per build`);
  }
  const enc = new TextEncoder();
  const antiLogger = options.antiLogger ?? true;
  const antiTamper = options.antiTamper ?? true;
  let prelude = "";
  if (antiTamper) prelude += antiTamperPrelude() + "\n";
  if (antiLogger) prelude += LOGGER_TRAP_SOURCE + "\n";
  const payload = prelude + source;
  const guardedSource = luaMoreProtection(source) + "\n" + payload;
  const dualVm = options.dualVm ?? true;
  let layers = dualVm
    ? Math.max(pickLayers(guardedSource.length), options.vmDepth ?? 0)
    : 1;
  // Output budget: each layer re-emits the payload ~4.4× as `\ddd` escapes.
  // Shrink the stack until the build fits under ~12 MB of output, so a big
  // source degrades to fewer layers instead of OOMing the worker.
  const EST_LAYER_GROWTH = 4.4;
  const MAX_OUT_BYTES = 12_000_000;
  while (layers > 1 && guardedSource.length * Math.pow(EST_LAYER_GROWTH, layers) > MAX_OUT_BYTES) {
    layers--;
  }

  let current: Uint8Array = enc.encode(guardedSource);
  let wrapped = "";
  for (let i = 0; i < layers; i++) {
    const isLast = i === layers - 1;
    const layer = i + 1;
    const chunk = `vm${layer}`;
    wrapped = wrapLayer(current, chunk, layer, isLast, options.validationMarkers ?? false);
    if (!isLast) current = enc.encode(wrapped);
  }
  const minified = minifyLua(wrapped);

  const stamp = Math.random().toString(36).slice(2, 10);
  const banner = `--[[
  LuaMore Obfuscation VM v11  //  build ${stamp}  //  ${layers}-layer ${dualVm ? "dual+" : "single"} VM
  parse -> optimize -> pseudo-bytecode -> flatten -> shuffle opcodes
  -> compress (RLE) -> encrypt (4xor + RC4) -> sign (FNV-1a + djb2)
  -> polymorphic nested VM -> LuaMore Protection prelude -> env-proxy -> minify
  LuaMore Protection: compatibility-safe runtime checks, anti-tamper prelude,
  anti-logger/anti-executor trap, isolated execution environment, and
  independent per-layer ciphertext integrity verification.
  do not edit — integrity guards will refuse to run
]]
`;
  let junk = "";
  const junkN = pickJunk(source.length);
  for (let i = 0; i < junkN; i++) junk += "do\n" + junkBlock() + "end\n";
  return banner + minifyLua(junk) + "\n" + minified;
}

