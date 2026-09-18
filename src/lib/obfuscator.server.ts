/**
 * Public façade over the LuaMore obfuscation engine.
 *
 * LuaMore protects scripts with the real Lua/Luau compiler pipeline
 * (lexer → parser → AST → scope resolution → transforms → emitter) plus
 * encrypted string pools, numeric transforms, control-flow flattening,
 * nested loader transport and the fail-closed anti-tamper / anti-hook /
 * anti-logger shields.
 *
 * This module re-exports that engine surface for every call site (dashboard
 * save, public API, loader endpoint, in-browser playground):
 *   obfuscateLua, obfuscateLuaWithOptions, analyzeObfuscation,
 *   calculateEntropy, ENGINE_NAME
 *
 * Correctness first: the underlying engine is guarded by a differential test
 * suite (`npm run test:engine`) that executes the original and the build in a
 * real Lua VM and fails on any observable difference. The engine is pure
 * TypeScript (no Node builtins), so the same module runs on the server and is
 * bundled for the in-browser playground.
 */

import { obfuscateLuaDetailed, calculateEntropy, ENGINE_NAME } from "./lua/obfuscate.ts";
import type { ObfuscationOptions } from "./lua/obfuscate.ts";

export { ENGINE_NAME, calculateEntropy } from "./lua/obfuscate.ts";
export { obfuscateLua, obfuscateLuaWithOptions, obfuscate } from "./lua/obfuscate.ts";
export type {
  ObfuscationOptions,
  ObfuscationStats,
  ObfuscationResultV2,
  LuaTarget,
} from "./lua/obfuscate.ts";

/** Back-compat alias matching the historical option bag name. */
export type LuaMoreObfuscationOptions = ObfuscationOptions;

/** Summary returned by {@link analyzeObfuscation}. */
export interface ObfuscationResult {
  code: string;
  size: number;
  originalSize: number;
  compressedSize: number;
  entropy: number;
  layers: number;
  mode: string;
}

// Re-export the analysis shape under the historical name for compatibility.
export type { ObfuscationResult as AnalysisResult };

const encoder = new TextEncoder();

function describeMode(options: ObfuscationOptions): string {
  const preset = options.preset ?? "strong";
  switch (preset) {
    case "paranoid":
      return "Protected By LuaLune Obfuscator · Ultra Shielded (paranoid)";
    case "strong":
      return "Protected By LuaLune Obfuscator · Shielded Register Pipeline (strong)";
    case "standard":
      return "Protected By LuaLune Obfuscator · Standard Pipeline";
    case "fast":
      return "Protected By LuaLune Obfuscator · Fast Pipeline";
    default:
      return `Protected By LuaLune Obfuscator · ${preset}`;
  }
}

/**
 * Obfuscate `source` and return the build plus a machine-readable summary.
 * This is the single entry point the dashboard and public API use to both
 * produce and describe a protected build.
 */
export function analyzeObfuscation(
  source: string,
  options: ObfuscationOptions = {},
): ObfuscationResult {
  const result = obfuscateLuaDetailed(source, options);
  const code = result.code;
  return {
    code,
    size: encoder.encode(code).length,
    originalSize: result.stats.inputBytes,
    compressedSize: result.stats.outputBytes,
    entropy: calculateEntropy(code),
    layers: result.stats.layers,
    mode: describeMode(options),
  };
}
