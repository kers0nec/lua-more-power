/**
 * Payload transport: LZSS compression → stream cipher → base-85 with a
 * per-build shuffled alphabet → a self-contained Lua loader.
 *
 * Deliberately dependency-free: the previous engine called Node's `zlib`, which
 * both threw under ESM and produced payloads that could only be decoded inside
 * Roblox. Everything here is plain bytes in, Lua source out, and it runs
 * identically on Lua 5.1–5.4 and Luau.
 */

import type { RNG } from "./rng.ts";

/**
 * Exactly 85 printable characters, none of which need escaping inside a Lua
 * double-quoted string (`"` and `\` are excluded), so the payload can be
 * embedded verbatim.
 */
const BASE85_BASE = (() => {
  const chars: string[] = [];
  for (let c = 33; c <= 126; c++) {
    if (c === 34 || c === 92) continue; // `"` and `\` would need escaping
    chars.push(String.fromCharCode(c));
  }
  return chars.slice(0, 85).join("");
})();

if (BASE85_BASE.length !== 85) {
  throw new Error(`base-85 alphabet must contain exactly 85 characters, got ${BASE85_BASE.length}`);
}
if (new Set(BASE85_BASE.split("")).size !== 85) {
  throw new Error("base-85 alphabet contains duplicate characters");
}

const BANNER_ERROR = "LuaMore payload integrity check failed";
const LOADER_ERROR = "LuaMore requires loadstring or load in this environment";
const LOAD_ERROR = "LuaMore chunk rejected: ";

/* ------------------------------------------------------------------- LZSS */

const WINDOW = 4096;
/**
 * The match distance is stored in 12 bits (8 bits + 4 bits), so the largest
 * representable distance is WINDOW - 1. Letting the matcher pick exactly
 * WINDOW would wrap to 0 and make the decoder copy `out[i] = out[i]` — a nil
 * hole that only shows up on payloads larger than one window.
 */
const MAX_OFFSET = WINDOW - 1;
const MIN_MATCH = 3;
const MAX_MATCH = 18;

export function lzssCompress(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  const n = input.length;
  if (n === 0) return new Uint8Array(0);

  const HASH_SIZE = 1 << 15;
  const head = new Int32Array(HASH_SIZE).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const hash = (i: number): number =>
    ((input[i] << 10) ^ ((input[i + 1] ?? 0) << 5) ^ (input[i + 2] ?? 0)) & (HASH_SIZE - 1);

  const insert = (pos: number): void => {
    if (pos + MIN_MATCH > n) return;
    const h = hash(pos);
    prev[pos] = head[h];
    head[h] = pos;
  };

  let i = 0;
  while (i < n) {
    let flag = 0;
    const items: number[] = [];
    for (let bit = 0; bit < 8 && i < n; bit++) {
      let bestLen = 0;
      let bestOffset = 0;
      if (i + MIN_MATCH <= n) {
        const h = hash(i);
        let cand = head[h];
        let tries = 0;
        const minPos = Math.max(0, i - MAX_OFFSET);
        while (cand >= minPos && tries < 48) {
          const maxLen = Math.min(MAX_MATCH, n - i);
          let len = 0;
          while (len < maxLen && input[cand + len] === input[i + len]) len++;
          if (len > bestLen) {
            bestLen = len;
            bestOffset = i - cand;
            if (len === MAX_MATCH) break;
          }
          cand = prev[cand];
          tries++;
        }
      }

      if (bestLen >= MIN_MATCH && bestOffset <= MAX_OFFSET) {
        items.push(bestOffset >> 4, ((bestOffset & 0x0f) << 4) | (bestLen - MIN_MATCH));
        for (let k = 0; k < bestLen; k++) insert(i + k);
        i += bestLen;
      } else {
        flag |= 1 << bit;
        items.push(input[i]);
        insert(i);
        i++;
      }
    }
    out.push(flag, ...items);
  }

  return Uint8Array.from(out);
}

/* ----------------------------------------------------------------- cipher */

/**
 * LCG keystream — the emitted Lua implements exactly this recurrence.
 *
 * The modulus is 2^31 and the multiplier 1664525 (< 2^21) so that
 * `state * 1664525` stays below 2^52: Lua 5.1 (and Lua-in-JS VMs) do this
 * arithmetic in IEEE doubles, and anything past 2^53 silently loses bits.
 */
const LCG_MUL = 1664525;
const LCG_ADD = 1013904223;
const LCG_MOD = 2147483648;

export function xorStream(data: Uint8Array, seed: number): Uint8Array {
  const out = new Uint8Array(data.length);
  let s = seed >>> 0;
  for (let i = 0; i < data.length; i++) {
    s = (Math.imul(s, LCG_MUL) + LCG_ADD) & 0x7fffffff;
    out[i] = data[i] ^ ((s >>> 16) & 0xff);
  }
  return out;
}

/** djb2 — chosen because `h * 33` stays exact in Lua 5.1 doubles. */
export function checksum(data: Uint8Array): number {
  let h = 5381;
  for (let i = 0; i < data.length; i++) h = (Math.imul(h, 33) + data[i]) >>> 0;
  return h >>> 0;
}

/* ----------------------------------------------------------------- base85 */

/** ASCII-85 framing: 4 bytes → 5 chars, tail of k bytes → k+1 chars. */
export function encodeBase85WithAlphabet(data: Uint8Array, alphabet: string): string {
  let out = "";
  for (let i = 0; i < data.length; i += 4) {
    const k = Math.min(4, data.length - i);
    let value = 0;
    for (let j = 0; j < 4; j++) value = value * 256 + (j < k ? data[i + j] : 0);
    const digits = new Array<number>(5);
    for (let j = 4; j >= 0; j--) {
      digits[j] = value % 85;
      value = Math.floor(value / 85);
    }
    for (let j = 0; j <= k; j++) out += alphabet[digits[j]];
  }
  return out;
}

export function encodeBase85(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return encodeBase85WithAlphabet(bytes, BASE85_BASE);
}

function shuffledAlphabet(rng: RNG): string {
  return rng.shuffle(BASE85_BASE.split("")).join("");
}

/* ----------------------------------------------------------------- loader */

export interface PackOptions {
  rng: RNG;
  layers: number;
  integrityCheck: boolean;
  banner: string;
  /** rename the loader's locals per build */
  names: () => string;
}

export function packLuaSource(luaSource: string, options: PackOptions): string {
  const encoder = new TextEncoder();
  let current = encoder.encode(luaSource);
  let wrapped = "";
  const layers = Math.max(1, options.layers);
  for (let layer = 0; layer < layers; layer++) {
    wrapped = buildLayer(current, options, layer === layers - 1 ? options.banner : "");
    current = encoder.encode(wrapped);
  }
  return wrapped;
}

function buildLayer(payload: Uint8Array, options: PackOptions, banner: string): string {
  const { rng } = options;
  const compressed = lzssCompress(payload);
  const seed = rng.range(1, 0x7ffffffe);
  const encrypted = xorStream(compressed, seed);
  const alphabet = shuffledAlphabet(rng);
  const encoded = encodeBase85WithAlphabet(encrypted, alphabet);
  const sum = checksum(encrypted);

  const N = {
    bxor: options.names(),
    map: options.names(),
    enc: options.names(),
    raw: options.names(),
    text: options.names(),
    byte: options.names(),
    out: options.names(),
    payload: options.names(),
    source: options.names(),
    bytes: options.names(),
    chunk: options.names(),
  };

  const integrity = options.integrityCheck
    ? `
  do
    local h = 5381
    for i = 1, #${N.text} do
      h = (h * 33 + ${N.byte}(${N.text}, i)) % 4294967296
    end
    if h ~= ${sum} then
      error("${BANNER_ERROR}", 0)
    end
  end`
    : "";

  return `${banner ? banner + "\n" : ""}local function ${N.bxor}(a, b)
  local result = 0
  local place = 1
  for _ = 1, 8 do
    local x = a % 2
    local y = b % 2
    if x ~= y then result = result + place end
    a = (a - x) / 2
    b = (b - y) / 2
    place = place * 2
  end
  return result
end
do
  local ${N.map} = {}
  do
    local alphabet = ${encodeLuaString(alphabet)}
    for i = 1, 85 do
      ${N.map}[string.sub(alphabet, i, i)] = i - 1
    end
  end
  local ${N.enc} = ${payloadLiteral(encoded, 110)}
  local ${N.raw} = {}
  do
    local at = 1
    local total = #${N.enc}
    while at <= total do
      local group = string.sub(${N.enc}, at, at + 4)
      local count = #group
      local value = 0
      for k = 1, 5 do
        local digit = ${N.map}[string.sub(group, k, k)]
        if digit == nil then digit = 84 end
        value = value * 85 + digit
      end
      local b1 = math.floor(value / 16777216) % 256
      local b2 = math.floor(value / 65536) % 256
      local b3 = math.floor(value / 256) % 256
      local b4 = value % 256
      if count >= 2 then ${N.raw}[#${N.raw} + 1] = string.char(b1) end
      if count >= 3 then ${N.raw}[#${N.raw} + 1] = string.char(b2) end
      if count >= 4 then ${N.raw}[#${N.raw} + 1] = string.char(b3) end
      if count >= 5 then ${N.raw}[#${N.raw} + 1] = string.char(b4) end
      at = at + 5
    end
  end
  local ${N.text} = table.concat(${N.raw})
  local ${N.byte} = string.byte${integrity}
  local ${N.bytes} = {}
  do
    local state = ${seed}
    for i = 1, #${N.text} do
      state = (state * ${LCG_MUL} + ${LCG_ADD}) % ${LCG_MOD}
      local key = math.floor(state / 65536) % 256
      ${N.bytes}[i] = string.char(${N.bxor}(${N.byte}(${N.text}, i), key))
    end
  end
  local ${N.payload} = table.concat(${N.bytes})
  local ${N.out} = {}
  do
    local at = 1
    local total = #${N.payload}
    local insertAt = 1
    while at <= total do
      local flags = ${N.byte}(${N.payload}, at)
      at = at + 1
      for _ = 1, 8 do
        if at > total then break end
        if flags % 2 == 1 then
          ${N.out}[insertAt] = string.sub(${N.payload}, at, at)
          insertAt = insertAt + 1
          at = at + 1
        else
          local high = ${N.byte}(${N.payload}, at)
          local low = ${N.byte}(${N.payload}, at + 1)
          if not low then break end
          at = at + 2
          local offset = high * 16 + math.floor(low / 16)
          local length = (low % 16) + 3
          local from = insertAt - offset
          for k = 0, length - 1 do
            ${N.out}[insertAt] = ${N.out}[from + k]
            insertAt = insertAt + 1
          end
        end
        flags = math.floor(flags / 2)
      end
    end
  end
  local ${N.source} = table.concat(${N.out})
  local loader = loadstring or load
  if not loader then
    error("${LOADER_ERROR}", 0)
  end
  local ${N.chunk}, problem = loader(${N.source}, "=LuaMore")
  if not ${N.chunk} then
    error("${LOAD_ERROR}" .. tostring(problem), 0)
  end
  return ${N.chunk}(...)
end`;
}

function encodeLuaString(text: string): string {
  let out = '"';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);
    if (ch === '"' || ch === "\\" || code < 32 || code > 126) {
      out += `\\${String(code).padStart(3, "0")}`;
    } else {
      out += ch;
    }
  }
  return out + '"';
}

/**
 * Emit a long payload as a Lua literal.
 *
 * Splitting it into a chain of `..` operands is tempting but wrong: a 100 KB
 * payload becomes ~1000 operands in a single expression, which exhausts the
 * parser's nesting budget (fengari dies with "too many JS levels", and Luau
 * rejects over-complex chunks). A table constructor is parsed iteratively, so
 * the same payload costs nothing.
 */
function payloadLiteral(text: string, width: number): string {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += width) {
    parts.push(`"${text.slice(i, i + width)}"`);
  }
  if (parts.length === 1) return parts[0];
  return `table.concat({\n    ${parts.join(",\n    ")}\n  })`;
}
