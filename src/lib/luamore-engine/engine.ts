/**
 * LuaMore engine façade over the LuaMore VM engine.
 *
 * This wires the LuaMore lexer → parser → AST obfuscator (identifier renaming +
 * string encoding) → register-VM compiler → polymorphic VM generator into the
 * same `obfuscateLua / obfuscateLuaWithOptions / analyzeObfuscation` surface
 * the rest of LuaMore already calls, so every existing call site (dashboard
 * save, public API, loader endpoint) is protected by this engine with no other
 * changes.
 *
 * Output is branded "Protected By LuaMore Obfuscator" and carries the LuaMore
 * integrity shield (anti-tamper prelude). Default protection level is `max`
 * (control-flow flattening + encrypted VM blob + polymorphic dispatch).
 *
 * Pure TypeScript — no Node builtins — so the same module runs on the server
 * and is bundled for the in-browser playground.
 */

import { lex } from "./lexer/Lexer.ts";
import { parse } from "./parser/Parser.ts";
import { obfuscate } from "./obfuscator/Obfuscator.ts";
import { encodeStrings } from "./obfuscator/StringEncoder.ts";
import { regCompile } from "./vm/RegCompiler.ts";
import { generateRegVM, type RegVMLevel } from "./vm/reg-vm-gen.ts";
import { buildAntiTamperPrelude } from "./antitamper.ts";

export const ENGINE_NAME = "LuaMore Obfuscator";

export interface LuaMoreObfuscationOptions {
  /** Protection level of the register VM. Defaults to "max". */
  level?: RegVMLevel;
  /** Emit the fail-closed anti-tamper shield. Defaults to true. */
  antiTamper?: boolean;
  /** Rename local identifiers in the AST. Defaults to true. */
  renameLocals?: boolean;
  /** Preserve Roblox/executor globals from renaming. Defaults to true. */
  preserveGlobals?: boolean;
  /** Encode string constants in the AST layer. Defaults to true. */
  encodeStrings?: boolean;
  /** Polymorphic seed; defaults to a random per-build seed. */
  seed?: number;
  /** Disable specific VM features (advanced). */
  disableFeatures?: string[];
}

/** Back-compat alias matching the historical option bag. */
export type ObfuscationOptions = LuaMoreObfuscationOptions & {
  dualVm?: boolean;
  antiHook?: boolean;
  antiLogger?: boolean;
  vmDepth?: number;
  loaderVMDepth?: number;
  encryptStrings?: boolean;
  controlFlowFlattening?: boolean;
  preset?: string;
  mode?: string;
};

export interface ObfuscationResult {
  code: string;
  size: number;
  originalSize: number;
  entropy: number;
  layers: number;
  mode: string;
}

const encoder = new TextEncoder();

function randomSeed(): number {
  // Positive 31-bit seed keeps every arithmetic path in safe integer range on
  // legacy Lua 5.1 interpreters as well as Luau/Roblox (where 32-bit ops are
  // native). Per-build random seed still gives polymorphic output.
  return Math.floor(Math.random() * 0x7fffffff) >>> 0;
}

/** Map the historical/preset option bag onto a VM protection level — now always MAX hardened (user requested way stronger). */
function resolveLevel(options: ObfuscationOptions): RegVMLevel {
  if (options.level === "debug") return "debug";
  // Every non-debug request is upgraded to max: fast/standard/strong/paranoid all map to max VM
  return "max";
}

/**
 * Obfuscate Lua/Luau source through the LuaMore register VM.
 * Throws on lex/parse errors with a readable message.
 */
export function obfuscateLuaWithOptions(
  source: string,
  options: ObfuscationOptions = {},
): string {
  const level = resolveLevel(options);
  // Hardened defaults: always rename, always encode, always anti-tamper, always VM — ignore disabling flags for ultra protection
  const rename = true;
  const preserve = options.preserveGlobals !== false;
  const doEncodeStrings = true;
  const antiTamper = true;
  const seed = (options.seed ?? randomSeed()) >>> 0;

  // 1. Lex
  const { tokens, errors: lexErrors } = lex(source);
  if (lexErrors && lexErrors.length > 0) {
    throw new Error(`Lua lex error: ${lexErrors.map((e) => e.message).join("; ")}`);
  }

  // 2. Parse
  let ast = parse(tokens);

  // 3. AST-layer transforms
  if (doEncodeStrings) {
    ast = encodeStrings(ast, { enabled: true });
  }
  ast = obfuscate(ast, { renameLocals: rename, preserveGlobals: preserve });

  // 4. Compile to register bytecode
  const chunk = regCompile(ast);

  // 5. Generate the polymorphic ULTRA VM (CFF + shuffled opcodes + fused handlers + encrypted blob + custom cipher + dead-code + polymorphic dispatch)
  // Force every VM hardening flag on — disableFeatures is ignored so callers cannot accidentally weaken the build.
  let vm = generateRegVM(chunk, {
    level: "max",
    executorGlobals: true,
    polymorphicSeed: seed,
    debugTrace: false,
    disableFeatures: [],
    forceFeatures: [
      "opcodeShuffle",
      "stringEncoding",
      "fakeHandlers",
      "handlerNoise",
      "antiDebug",
      "antiTamper",
      "controlFlowFlattening",
      "opcodeFusion",
      "deadCodeInjection",
      "customCipher",
      "stubCompression",
      "vmNesting",
    ] as never[],
  });

  // 6. Prepend the ULTRA anti-tamper shield (outside the VM) + inner VM handshake.
  // Double-shield: outer prelude + inner VM guard already injected by generateRegVM.
  // We always prepend, even if caller tried to disable it.
  {
    const rng = mulberry(seed);
    const shield = buildAntiTamperPrelude(rng, { enabled: true });
    const bannerEnd = vm.indexOf("]]\n");
    if (bannerEnd !== -1 && vm.startsWith("--[[")) {
      vm = vm.slice(0, bannerEnd + 3) + "\n" + shield + vm.slice(bannerEnd + 3);
    } else {
      vm = shield + vm;
    }
    // Second inner tamper sentinel: if outer shield somehow stripped, VM still checks __luamore_shield
    const innerCheckRng = mulberry(seed ^ 0x9e3779b9);
    const innerShield = buildAntiTamperPrelude(innerCheckRng, { enabled: true, brand: "LuaMore VM Inner Shield" });
    // Inject inner shield right before the VM runtime starts (after the outer shield, before the handler table)
    // For simplicity we splice it after first 2k chars if VM is large — still before execution hot path.
    // The VM runtime itself is fail-closed if __luamore_shield missing (see bootstrap tamper check).
    if (vm.length > 4000) {
      const insertAt = vm.indexOf("local ", vm.indexOf("local ", 500) + 10);
      if (insertAt > 0) vm = vm.slice(0, insertAt) + innerShield + "\n" + vm.slice(insertAt);
    }
  }

  return vm;
}

/** Default build: strongest protection. */
export function obfuscateLua(source: string): string {
  return obfuscateLuaWithOptions(source, { level: "max" });
}

export function calculateEntropy(str: string): number {
  const freqs = new Map<string, number>();
  for (const ch of str) freqs.set(ch, (freqs.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freqs.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

export function analyzeObfuscation(
  source: string,
  options: ObfuscationOptions = {},
): ObfuscationResult {
  const code = obfuscateLuaWithOptions(source, options);
  const level = resolveLevel(options);
  return {
    code,
    size: encoder.encode(code).length,
    originalSize: encoder.encode(source).length,
    entropy: calculateEntropy(code),
    layers: level === "max" ? 3 : level === "normal" ? 2 : 1,
    mode:
      level === "max"
        ? "Protected By LuaMore Obfuscator · Polymorphic Register VM (max)"
        : level === "normal"
          ? "Protected By LuaMore Obfuscator · Register VM (normal)"
          : "Protected By LuaMore Obfuscator · Register VM (debug)",
  };
}

/** Deterministic PRNG so a fixed seed reproduces the same shield. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
