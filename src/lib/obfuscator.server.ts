/**
 * Public façade over the LuaMore obfuscation engine.
 *
 * LuaMore protects scripts with the LuaMore VM engine — a full
 * Luau/Lua front end (lexer → parser → AST transforms → register-bytecode
 * compiler → polymorphic VM generator) wrapped with the LuaMore anti-tamper
 * integrity shield and branded "Protected By LuaMore Obfuscator".
 *
 * This module re-exports the engine surface that the dashboard, public API,
 * loader endpoint and browser playground all import:
 *   obfuscateLua, obfuscateLuaWithOptions, analyzeObfuscation,
 *   calculateEntropy, ENGINE_NAME
 *
 * The engine is pure TypeScript (no Node builtins), so the same code runs on
 * the server and is bundled for the in-browser playground.
 */

export {
  ENGINE_NAME,
  obfuscateLua,
  obfuscateLuaWithOptions,
  analyzeObfuscation,
  calculateEntropy,
} from "./luamore-engine/engine.ts";

export type {
  ObfuscationOptions,
  ObfuscationResult,
  LuaMoreObfuscationOptions,
} from "./luamore-engine/engine.ts";

// Re-export the analysis shape under the historical name for compatibility.
export type { ObfuscationResult as AnalysisResult } from "./luamore-engine/engine.ts";
