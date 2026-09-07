/**
 * String-constant encryption.
 *
 * All string literals are pulled out into a single packed blob, encoded with a
 * position-dependent affine cipher, stored in shuffled order, and materialised
 * on first use by a small decoder injected at the top of the chunk.
 *
 * Byte-exactness is the whole point: the blob holds the literal's raw bytes, so
 * UTF-8 text, embedded NULs and `\xNN` escapes survive the round trip.
 */

import type { Chunk, Expression, StringLiteral } from "./ast.ts";
import { visit } from "./walk.ts";
import { parse } from "./parser.ts";
import { encodeStringLiteral } from "./emitter.ts";
import type { RNG } from "./rng.ts";

/** Multiplicative inverse of `a` mod 256 (`a` must be odd). */
function modInverse256(a: number): number {
  let inv = 1;
  for (let i = 0; i < 8; i++) inv = (inv * (2 - a * inv)) & 0xff;
  return inv & 0xff;
}

export interface StringEncryptionOptions {
  decoderName: string;
  /** ids handed to the decoder are shifted by this amount */
  idBias: number;
  /** cipher parameters */
  mulA: number;
  addB: number;
  stepC: number;
}

export function pickStringCipher(rng: RNG): Omit<StringEncryptionOptions, "decoderName"> {
  let mulA = rng.range(1, 255);
  if (mulA % 2 === 0) mulA++; // must be odd to be invertible mod 256
  return {
    idBias: rng.range(1, 4096),
    mulA,
    addB: rng.range(1, 255),
    stepC: rng.range(1, 255),
  };
}

export function encryptStrings(
  chunk: Chunk,
  rng: RNG,
  decoderName: string,
): { replaced: number; unique: number } {
  const cipher = pickStringCipher(rng);
  const invA = modInverse256(cipher.mulA);

  // collect distinct literals, preserving first-seen order
  const byBytes = new Map<string, number>();
  const pool: string[] = [];
  const sites: Array<{ node: StringLiteral; slot: number }> = [];

  visit(chunk, {
    onExpression: (e) => {
      if (e.kind !== "StringLiteral") return undefined;
      let slot = byBytes.get(e.bytes);
      if (slot === undefined) {
        slot = pool.length;
        byBytes.set(e.bytes, slot);
        pool.push(e.bytes);
      }
      sites.push({ node: e, slot });
      return undefined;
    },
  });

  if (pool.length === 0) return { replaced: 0, unique: 0 };

  // Shuffle the physical layout so ids in the source do not line up with the
  // order the strings appear in.
  const order = pool.map((_, i) => i);
  rng.shuffle(order);
  const physical = new Map<number, number>(); // logical slot -> physical slot
  order.forEach((logical, phys) => physical.set(logical, phys));

  // Build the blob in physical order and record lengths in that order.
  const lengths: number[] = new Array(pool.length);
  const blobParts: number[][] = new Array(pool.length);
  for (const [logical, phys] of physical) {
    const bytes = pool[logical];
    const out: number[] = new Array(bytes.length);
    for (let j = 0; j < bytes.length; j++) {
      const b = bytes.charCodeAt(j) & 0xff;
      out[j] = ((b * cipher.mulA + cipher.addB + ((j * cipher.stepC) & 0xff)) & 0xff) >>> 0;
    }
    lengths[phys] = bytes.length;
    blobParts[phys] = out;
  }

  const blobBytes = blobParts.flat();
  const blobLiteral = encodeStringLiteral(blobBytes.map((b) => String.fromCharCode(b)).join(""));

  const decoderSource = buildDecoder(
    decoderName,
    blobLiteral,
    lengths,
    cipher.idBias,
    invA,
    cipher.addB,
    cipher.stepC,
  );
  const decoderStatements = parse(decoderSource).body;
  chunk.body.unshift(...decoderStatements);

  // Swap every literal for a decoder call.
  const replacements = new Map<StringLiteral, Expression>();
  for (const site of sites) {
    const phys = physical.get(site.slot)!;
    replacements.set(site.node, {
      kind: "CallExpression",
      callee: { kind: "Identifier", name: decoderName },
      args: [
        {
          kind: "NumericLiteral",
          value: phys + cipher.idBias,
          raw: String(phys + cipher.idBias),
          isInteger: true,
        },
      ],
    });
  }

  let replaced = 0;
  visit(chunk, {
    onExpression: (e) => {
      if (e.kind !== "StringLiteral") return undefined;
      const r = replacements.get(e);
      if (!r) return undefined;
      replaced++;
      return r;
    },
  });

  return { replaced, unique: pool.length };
}

function buildDecoder(
  name: string,
  blobLiteral: string,
  lengths: number[],
  idBias: number,
  invA: number,
  addB: number,
  stepC: number,
): string {
  const lengthsTable = `{${lengths.join(",")}}`;
  return `local ${name}
do
  local data = ${blobLiteral}
  local lengths = ${lengthsTable}
  local offsets = {}
  do
    local acc = 1
    for i = 1, #lengths do
      offsets[i] = acc
      acc = acc + lengths[i]
    end
  end
  local cache = {}
  local byte = string.byte
  local char = string.char
  local concat = table.concat
  ${name} = function(id)
    local index = id - ${idBias}
    local hit = cache[index]
    if hit ~= nil then return hit end
    -- ids are 0-based, Lua tables are 1-based
    local offset = offsets[index + 1]
    local length = lengths[index + 1]
    if not offset then return "" end
    if length == 0 then
      cache[index] = ""
      return ""
    end
    local out = {}
    for j = 1, length do
      local enc = byte(data, offset + j - 1) or 0
      local dec = ((enc - ${addB} - ((j - 1) * ${stepC} % 256)) * ${invA}) % 256
      out[j] = char(dec)
    end
    local value = concat(out)
    cache[index] = value
    return value
  end
end`;
}
