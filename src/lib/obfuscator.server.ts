/**
 * Public façade over the LuaMore engine in `src/lib/lua/`.
 *
 * This file used to *be* the obfuscator: ~2200 lines of token-and-regex
 * rewriting with no parser. It renamed identifiers through one global map, so
 * two unrelated `local count` declarations in different functions collided; it
 * "encrypted" strings by unescaping them with regexes, which corrupted `\ddd`,
 * `\xNN`, `\z`, `\u{…}` and long brackets; and its "register VM" was
 * base85 + Node's `zlib` behind a Roblox-only inflate, so the payload could
 * only ever run inside Roblox — and threw `require is not defined` everywhere
 * else. Every one of those paths produced scripts that loaded and then died at
 * runtime.
 *
 * The replacement is a real front end: lexer → parser → AST → scope resolution
 * → transforms → emitter, plus a dependency-free transport layer. It is
 * differential-tested against a Lua 5.3 VM over the corpus in `test/corpus`
 * (see `npm run test:engine`): for every program and every option combination
 * the obfuscated build must produce byte-identical observable behaviour.
 *
 * Everything here is pure TypeScript with no Node builtins, so the exact same
 * module also runs in the browser (`src/routes/obfuscators.tsx`) and from plain
 * Node (`scripts/obfuscation-regression.mjs`) — which is why the imports below
 * are relative rather than `@/` aliases.
 */

import {
  ENGINE_NAME,
  calculateEntropy,
  obfuscateLuaDetailed,
  obfuscateLuaWithOptions as obfuscateWithOptions,
} from "./lua/obfuscate.ts";
import type { ObfuscationOptions } from "./lua/obfuscate.ts";
import { encodeBase85 } from "./lua/pack.ts";

export type { ObfuscationOptions };
export { ENGINE_NAME, calculateEntropy, encodeBase85 };

/** Shape the dashboard and the public API have always returned. */
export type ObfuscationResult = {
  code: string;
  size: number;
  originalSize: number;
  entropy: number;
  layers: number;
  mode: string;
};

const encoder = new TextEncoder();

const MODE_LABELS: Record<string, string> = {
  fast: "LuaMore Fast Pass",
  standard: "LuaMore Standard Pass",
  strong: "LuaMore Hardened Pass",
  paranoid: "LuaMore Paranoid Pass",
};

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  return obfuscateWithOptions(source, options);
}

/** Default build: the `strong` preset. */
export function obfuscateLua(source: string): string {
  return obfuscateWithOptions(source, { preset: "strong" });
}

export function analyzeObfuscation(
  source: string,
  options: ObfuscationOptions = {},
): ObfuscationResult {
  const out = obfuscateLuaDetailed(source, options);
  const layers = out.stats.layers;
  const preset = options.preset ?? "strong";
  const features: string[] = [];
  if (out.stats.renamed > 0) features.push("identifier rename");
  if (out.stats.stringsEncrypted > 0) features.push(`${out.stats.uniqueStrings} strings encrypted`);
  if (out.stats.flattenedBlocks > 0) features.push(`${out.stats.flattenedBlocks} blocks flattened`);
  if (out.stats.junkBlocks > 0) features.push("opaque predicates");
  if (out.passthrough) features.push("passthrough");

  return {
    code: out.code,
    size: encoder.encode(out.code).length,
    originalSize: encoder.encode(source).length,
    entropy: out.stats.entropy,
    layers,
    mode:
      layers > 0
        ? `${MODE_LABELS[preset] ?? ENGINE_NAME} · ${layers} layer${layers > 1 ? "s" : ""}${
            features.length ? ` · ${features.join(", ")}` : ""
          }`
        : `${MODE_LABELS[preset] ?? ENGINE_NAME}${features.length ? ` · ${features.join(", ")}` : ""}`,
  };
}
