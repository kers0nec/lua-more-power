/**
 * LuaMore obfuscation pipeline.
 *
 * The contract that matters: **a build either produces a program that behaves
 * exactly like the input, or it returns the input unchanged.** Every stage that
 * cannot prove it understood the source (parse failure, unsupported construct,
 * virtualisation of a construct the VM does not cover) falls back instead of
 * guessing.
 */

import { parse, ParseError } from "./parser.ts";
import { LexError } from "./lexer.ts";
import { emit } from "./emitter.ts";
import { resolveScopes } from "./scope.ts";
import { createRng, hashString, type RNG } from "./rng.ts";
import { injectJunk, obfuscateNumbers, hexifyNumbers, renameLocals } from "./transforms.ts";
import { encryptStrings } from "./strings.ts";
import { flattenControlFlow } from "./flatten.ts";
import { packLuaSource, createLocalNameGenerator } from "./pack.ts";
import { buildShieldPrelude } from "./shields.ts";
import { ENGINE_NAME } from "./version.ts";
import type { Chunk } from "./ast.ts";
import { compileToVMBytecode, generateVMInterpreter, createVMOptions, wrapWithVM } from "./vm.ts";

export type LuaTarget = "auto" | "lua51" | "lua53" | "luau";

export interface ObfuscationOptions {
  /** convenience preset; explicit flags below override it */
  preset?: "fast" | "standard" | "strong" | "paranoid";
  /** fixed seed ⇒ reproducible builds */
  seed?: number;

  renameLocals?: boolean;
  obfuscateNumbers?: boolean;
  encryptStrings?: boolean;
  injectJunk?: boolean;
  controlFlowFlattening?: boolean;
  /**
   * Bytecode virtualization (register/stack VM interpreter).
   * When enabled, compiles source to polymorphic VM bytecode executed by
   * a generated interpreter. Provides strongest protection.
   */
  virtualize?: boolean;
  /** VM layers (nested VMs) when virtualize is enabled */
  vmLayers?: number;
  /** Enable polymorphic VM instruction encoding */
  vmPolymorphic?: boolean;
  /** Enable VM anti-debug traps */
  vmAntiDebug?: boolean;
  /** Enable VM integrity checks */
  vmIntegrityCheck?: boolean;
  pack?: boolean;
  packLayers?: number;
  integrityCheck?: boolean;
  compact?: boolean;

  target?: LuaTarget;
  isLuauRuntime?: boolean;
  banner?: boolean | string;

  /**
   * Anti-tamper runtime prelude: arithmetic canaries plus a self-checksum over
   * the shield body. When `pack` is enabled this also arms the loader's
   * payload-integrity checksum. Fail-closed, silent while the environment is
   * clean. Also enables the runtime prelude in the emitted chunk.
   */
  antiTamper?: boolean;
  /**
   * Anti-hook runtime prelude: pins the standard-library functions the payload
   * depends on and fails closed if any of them was replaced or wrapped before
   * the chunk starts.
   */
  antiHook?: boolean;
  /**
   * Anti env-logger: gives the chunk a guarded environment on legacy Lua 5.1
   * executors (the only platform with `setfenv`), where a logging
   * `getfenv`/`loadstring` trap would otherwise read locals. Inert on
   * Lua 5.2+, Luau and Roblox, which have no `setfenv`.
   */
  antiLogger?: boolean;

  /* --- legacy option names still accepted by the API and the dashboard --- */
  proxifyLocals?: boolean;
  proxifyFunctions?: boolean;
  dualVm?: boolean;
  polymorphicVM?: boolean;
  oeldAntiTamper?: boolean;
  vmDepth?: number;
  loaderVMDepth?: number;
  chunkedLoader?: boolean;
  validationMarkers?: boolean;
  mode?: string;
  publicId?: string;
}

export interface ObfuscationStats {
  renamed: number;
  numbersRewritten: number;
  stringsEncrypted: number;
  uniqueStrings: number;
  junkBlocks: number;
  flattenedBlocks: number;
  virtualizedBlocks: number;
  layers: number;
  /** runtime shield preludes present in the emitted chunk */
  runtimeShields?: Array<"antiTamper" | "antiHook" | "antiLogger">;
  inputBytes: number;
  outputBytes: number;
  entropy: number;
  ms: number;
  engine: string;
}

/** The `obfuscate(source, settings)` contract: code plus a machine-readable summary. */
export interface ObfuscationResultV2 {
  output: string;
  metadata: {
    engine: string;
    seed: number;
    preset?: string;
    passthrough: boolean;
    stats: ObfuscationStats;
    warnings: string[];
    settings: Record<string, unknown>;
  };
}

export interface ObfuscationOutput {
  code: string;
  stats: ObfuscationStats;
  /** non-fatal notes: what was skipped and why */
  warnings: string[];
  /** true when the input could not be transformed at all */
  passthrough: boolean;
}

const MAX_SOURCE_BYTES = 5_000_000;
export { ENGINE_NAME };

interface ResolvedOptions {
  seed: number;
  renameLocals: boolean;
  obfuscateNumbers: boolean;
  encryptStrings: boolean;
  injectJunk: boolean;
  controlFlowFlattening: boolean;
  virtualize: boolean;
  vmLayers: number;
  vmPolymorphic: boolean;
  vmAntiDebug: boolean;
  vmIntegrityCheck: boolean;
  pack: boolean;
  packLayers: number;
  integrityCheck: boolean;
  compact: boolean;
  target: LuaTarget;
  banner: string;
  /** runtime shield preludes (fail-closed, silent while clean) */
  antiTamper: boolean;
  antiHook: boolean;
  antiLogger: boolean;
}

function resolveOptions(options: ObfuscationOptions, source: string): ResolvedOptions {
  const preset = options.preset ?? "strong";
  const presetDefaults: Record<string, Partial<ResolvedOptions>> = {
    fast: {
      renameLocals: true,
      obfuscateNumbers: false,
      encryptStrings: true,
      injectJunk: false,
      controlFlowFlattening: false,
      virtualize: false,
      vmLayers: 1,
      vmPolymorphic: false,
      vmAntiDebug: false,
      vmIntegrityCheck: false,
      pack: true,
      packLayers: 1,
      antiTamper: false,
      antiHook: false,
      antiLogger: false,
    },
    standard: {
      renameLocals: true,
      obfuscateNumbers: true,
      encryptStrings: true,
      injectJunk: true,
      controlFlowFlattening: true,
      virtualize: false,
      vmLayers: 1,
      vmPolymorphic: false,
      vmAntiDebug: false,
      vmIntegrityCheck: false,
      pack: true,
      packLayers: 1,
      antiTamper: true,
      antiHook: false,
      antiLogger: false,
    },
    strong: {
      renameLocals: true,
      obfuscateNumbers: true,
      encryptStrings: true,
      injectJunk: true,
      controlFlowFlattening: true,
      virtualize: true,
      vmLayers: 2,
      vmPolymorphic: true,
      vmAntiDebug: true,
      vmIntegrityCheck: true,
      pack: true,
      packLayers: 1,
      antiTamper: true,
      antiHook: false,
      antiLogger: false,
    },
    paranoid: {
      renameLocals: true,
      obfuscateNumbers: true,
      encryptStrings: true,
      injectJunk: true,
      controlFlowFlattening: true,
      virtualize: true,
      vmLayers: 3,
      vmPolymorphic: true,
      vmAntiDebug: true,
      vmIntegrityCheck: true,
      pack: true,
      packLayers: 2,
      integrityCheck: true,
      antiTamper: true,
      antiHook: true,
      antiLogger: false,
    },
  };
  const d = presetDefaults[preset] ?? presetDefaults["strong"];

  const bool = (
    explicit: boolean | undefined,
    legacy: Array<boolean | undefined>,
    fallback: boolean,
  ): boolean => {
    if (explicit !== undefined) return explicit;
    for (const v of legacy) if (v !== undefined) return v;
    return fallback;
  };

  const legacyLayers = options.loaderVMDepth ?? options.vmDepth ?? (options.dualVm ? 2 : undefined);

  const target: LuaTarget =
    options.target ??
    (options.isLuauRuntime === true ? "luau" : options.isLuauRuntime === false ? "lua53" : "auto");

  const banner =
    options.banner === false
      ? ""
      : typeof options.banner === "string"
        ? options.banner
        : `-- Protected with LuaMore | ${ENGINE_NAME}`;

  return {
    seed: options.seed ?? hashString(source) ^ (Date.now() & 0xffff),
    renameLocals: bool(
      options.renameLocals,
      [options.proxifyLocals, options.proxifyFunctions],
      d.renameLocals!,
    ),
    obfuscateNumbers: bool(options.obfuscateNumbers, [], d.obfuscateNumbers!),
    encryptStrings: bool(options.encryptStrings, [], d.encryptStrings!),
    injectJunk: bool(options.injectJunk, [], d.injectJunk!),
    controlFlowFlattening: bool(options.controlFlowFlattening, [], d.controlFlowFlattening!),
    virtualize: bool(options.virtualize, [options.polymorphicVM, options.dualVm], d.virtualize!),
    vmLayers: options.vmLayers ?? options.vmDepth ?? d.vmLayers!,
    vmPolymorphic: bool(options.vmPolymorphic, [options.polymorphicVM], d.vmPolymorphic!),
    vmAntiDebug: bool(options.vmAntiDebug, [], d.vmAntiDebug!),
    vmIntegrityCheck: bool(options.vmIntegrityCheck, [], d.vmIntegrityCheck!),
    pack: bool(options.pack, [options.chunkedLoader], d.pack!),
    packLayers: options.packLayers ?? legacyLayers ?? d.packLayers!,
    integrityCheck: bool(
      options.integrityCheck,
      [options.antiTamper, options.oeldAntiTamper],
      true,
    ),
    compact: options.compact ?? true,
    target,
    banner,
    antiTamper: bool(options.antiTamper, [options.oeldAntiTamper], d.antiTamper!),
    antiHook: bool(options.antiHook, [], d.antiHook!),
    antiLogger: bool(options.antiLogger, [], d.antiLogger!),
  };
}

/** Does this target support `//` and bitwise operators? */
function hasModernOps(target: LuaTarget): boolean {
  return target !== "lua51";
}

export function obfuscateLuaDetailed(
  source: string,
  options: ObfuscationOptions = {},
): ObfuscationOutput {
  const started = Date.now();
  validateSettings(source, options);
  const warnings: string[] = [];
  const inputBytes = new TextEncoder().encode(source).length;

  if (inputBytes > MAX_SOURCE_BYTES) {
    throw new Error(
      `Source too large for LuaMore — max ${MAX_SOURCE_BYTES / 1_000_000} MB per build`,
    );
  }

  const stats: ObfuscationStats = {
    renamed: 0,
    numbersRewritten: 0,
    stringsEncrypted: 0,
    uniqueStrings: 0,
    junkBlocks: 0,
    flattenedBlocks: 0,
    virtualizedBlocks: 0,
    layers: 0,
    inputBytes,
    outputBytes: inputBytes,
    entropy: 0,
    ms: 0,
    engine: ENGINE_NAME,
  };

  const finish = (code: string, passthrough: boolean): ObfuscationOutput => {
    stats.outputBytes = new TextEncoder().encode(code).length;
    stats.entropy = calculateEntropy(code);
    stats.ms = Date.now() - started;
    return { code, stats, warnings, passthrough };
  };

  if (source.trim().length === 0) return finish(source, true);

  const resolved = resolveOptions(options, source);
  const rng = createRng(resolved.seed);

  // If virtualize is enabled, compile to VM bytecode and wrap with interpreter
  if (resolved.virtualize) {
    const vmOptions = createVMOptions(
      resolved.seed,
      options.preset ?? "strong",
      resolved.target === "luau" ? "luau" : resolved.target === "lua53" ? "lua53" : "lua51",
    );
    vmOptions.layers = resolved.vmLayers;
    vmOptions.polymorphic = resolved.vmPolymorphic;
    vmOptions.antiDebug = resolved.vmAntiDebug;
    vmOptions.integrityCheck = resolved.vmIntegrityCheck;

    // Apply source transforms first (rename, flatten, etc.) then VM wrap
    let chunk: Chunk;
    try {
      chunk = parse(source);
    } catch (error) {
      const detail =
        error instanceof ParseError || error instanceof LexError ? error.message : String(error);
      warnings.push(`source could not be parsed — returned unchanged (${detail})`);
      return finish(source, true);
    }

    const resolution = resolveScopes(chunk);

    if (resolved.renameLocals) {
      stats.renamed = renameLocals(chunk, resolution, rng);
    }
    if (resolved.controlFlowFlattening) {
      stats.flattenedBlocks = flattenControlFlow(chunk, resolution, rng, {
        density: 0.9,
        junkStates: true,
      }).flattened;
    }
    if (resolved.obfuscateNumbers) {
      stats.numbersRewritten = obfuscateNumbers(chunk, rng, {
        modernOps: hasModernOps(resolved.target),
      });
      stats.numbersRewritten += hexifyNumbers(chunk, rng, 0.4);
    }
    if (resolved.injectJunk) {
      stats.junkBlocks = injectJunk(chunk, rng, 0.3);
    }
    if (resolved.encryptStrings) {
      const decoderName = `_${pickNameChars(rng)}`;
      const result = encryptStrings(chunk, rng, decoderName);
      stats.stringsEncrypted = result.replaced;
      stats.uniqueStrings = result.unique;
    }

    let code = emit(chunk, { compact: resolved.compact });

    // Runtime integrity shields
    const built = buildShieldPrelude({
      antiTamper: resolved.antiTamper,
      antiHook: resolved.antiHook,
      antiLogger: resolved.antiLogger,
      hasSetfenvPlatform: resolved.target === "lua51",
      rng,
    });
    if (built.code) {
      code = built.code + "\n" + code;
      stats.runtimeShields = built.active;
    }

    // Wrap with VM protection
    code = wrapWithVM(code, vmOptions);
    stats.virtualizedBlocks = 1;
    stats.layers = resolved.vmLayers;

    return finish(code, false);
  }

  // Non-VM path (original obfuscation pipeline)
  let chunk: Chunk;
  try {
    chunk = parse(source);
  } catch (error) {
    const detail =
      error instanceof ParseError || error instanceof LexError ? error.message : String(error);
    warnings.push(`source could not be parsed — returned unchanged (${detail})`);
    return finish(source, true);
  }

  try {
    const resolution = resolveScopes(chunk);

    if (resolved.renameLocals) {
      stats.renamed = renameLocals(chunk, resolution, rng);
    }
    if (resolved.controlFlowFlattening) {
      stats.flattenedBlocks = flattenControlFlow(chunk, resolution, rng, {
        density: 0.9,
        junkStates: true,
      }).flattened;
    }
    if (resolved.obfuscateNumbers) {
      stats.numbersRewritten = obfuscateNumbers(chunk, rng, {
        modernOps: hasModernOps(resolved.target),
      });
      stats.numbersRewritten += hexifyNumbers(chunk, rng, 0.4);
    }
    if (resolved.injectJunk) {
      stats.junkBlocks = injectJunk(chunk, rng, 0.3);
    }
    if (resolved.encryptStrings) {
      const decoderName = `_${pickNameChars(rng)}`;
      const result = encryptStrings(chunk, rng, decoderName);
      stats.stringsEncrypted = result.replaced;
      stats.uniqueStrings = result.unique;
    }

    let code = emit(chunk, { compact: resolved.compact });

    // Runtime integrity shields. These are textual preludes generated from the
    // settings — the engine never runs or evaluates the source while building.
    const built = buildShieldPrelude({
      antiTamper: resolved.antiTamper,
      antiHook: resolved.antiHook,
      antiLogger: resolved.antiLogger,
      // `setfenv` only exists on legacy Lua 5.1 executors; everywhere else the
      // env-lock block would be dead code, so it is not emitted at all.
      hasSetfenvPlatform: resolved.target === "lua51",
      rng,
    });
    if (built.code) {
      code = built.code + "\n" + code;
      stats.runtimeShields = built.active;
    }

    if (resolved.pack) {
      const names = createLocalNameGenerator(rng);
      code = packLuaSource(code, {
        rng,
        layers: resolved.packLayers,
        integrityCheck: resolved.integrityCheck,
        banner: resolved.banner,
        names,
      });
      stats.layers = resolved.packLayers;
    } else {
      stats.layers = 0;
    }

    return finish(code, false);
  } catch (error) {
    // A transform bug must never ship a broken payload.
    warnings.push(
      `transform failed — returned unchanged (${error instanceof Error ? error.message : String(error)})`,
    );
    return finish(source, true);
  }
}

function pickNameChars(rng: RNG): string {
  const chars = ["l", "I", "1", "L", "O", "0"];
  let out = "";
  for (let i = 0; i < 6; i++) out += rng.pick(chars);
  return out;
}

export function obfuscateLua(source: string): string {
  return obfuscateLuaDetailed(source, { preset: "strong" }).code;
}

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  return obfuscateLuaDetailed(source, options).code;
}

/**
 * Simple documented entry point: `obfuscate(source, settings)`.
 *
 * ```ts
 * const { output, metadata } = obfuscate(source, {
 *   encryptStrings: true,
 *   antiTamper: true,
 *   loaderVMDepth: 2,
 *   isLuauRuntime: true,
 * });
 * ```
 */
export function obfuscate(source: string, settings: ObfuscationOptions = {}): ObfuscationResultV2 {
  const result = obfuscateLuaDetailed(source, settings);
  return {
    output: result.code,
    metadata: {
      engine: result.stats.engine,
      seed: settings.seed ?? hashString(source) ^ (Date.now() & 0xffff),
      preset: settings.preset,
      passthrough: result.passthrough,
      stats: result.stats,
      warnings: result.warnings,
      settings: { ...settings },
    },
  };
}

const KNOWN_SETTING_KEYS = new Set<string>([
  "preset",
  "seed",
  "renameLocals",
  "obfuscateNumbers",
  "encryptStrings",
  "injectJunk",
  "controlFlowFlattening",
  "virtualize",
  "vmLayers",
  "vmPolymorphic",
  "vmAntiDebug",
  "vmIntegrityCheck",
  "pack",
  "packLayers",
  "integrityCheck",
  "compact",
  "target",
  "isLuauRuntime",
  "banner",
  "antiTamper",
  "antiHook",
  "antiLogger",
  "proxifyLocals",
  "proxifyFunctions",
  "dualVm",
  "polymorphicVM",
  "oeldAntiTamper",
  "vmDepth",
  "loaderVMDepth",
  "chunkedLoader",
  "validationMarkers",
  "mode",
  "publicId",
]);

const BOOLEAN_SETTING_KEYS = [
  "renameLocals",
  "obfuscateNumbers",
  "encryptStrings",
  "injectJunk",
  "controlFlowFlattening",
  "virtualize",
  "vmPolymorphic",
  "vmAntiDebug",
  "vmIntegrityCheck",
  "pack",
  "integrityCheck",
  "compact",
  "isLuauRuntime",
  "antiTamper",
  "antiHook",
  "antiLogger",
  "proxifyLocals",
  "proxifyFunctions",
  "dualVm",
  "polymorphicVM",
  "oeldAntiTamper",
  "chunkedLoader",
  "validationMarkers",
] as const;

const PRESETS = new Set(["fast", "standard", "strong", "paranoid"]);
const TARGETS = new Set(["auto", "lua51", "lua53", "luau"]);

/**
 * Rejects invalid settings with a clear error (no silent fallbacks):
 *   - unknown setting keys,
 *   - non-boolean boolean options,
 *   - a `loaderVMDepth`/`vmDepth` outside the supported 1–5 range,
 *   - non-integer depth/layer/seed values,
 *   - unknown presets or targets.
 */
export function validateSettings(source: string, options: ObfuscationOptions): void {
  if (typeof source !== "string") {
    throw new TypeError(`obfuscate(source, settings): source must be a string, got ${typeof source}`);
  }
  if (options == null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError(
      "obfuscate(source, settings): settings must be a plain object (got " +
        (options === null ? "null" : Array.isArray(options) ? "array" : typeof options) +
        ")",
    );
  }
  for (const key of Object.keys(options)) {
    if (!KNOWN_SETTING_KEYS.has(key)) {
      throw new Error(`invalid setting "${key}" — unknown option for LuaMore obfuscation`);
    }
  }
  for (const key of BOOLEAN_SETTING_KEYS) {
    const v = (options as Record<string, unknown>)[key];
    if (v !== undefined && typeof v !== "boolean") {
      throw new Error(
        `invalid setting "${key}": expected boolean, got ${v === null ? "null" : typeof v}`,
      );
    }
  }
  if (options.preset !== undefined && !PRESETS.has(options.preset)) {
    throw new Error(
      `invalid setting "preset": expected one of ${[...PRESETS].join(", ")}, got "${options.preset}"`,
    );
  }
  if (options.target !== undefined && !TARGETS.has(options.target)) {
    throw new Error(
      `invalid setting "target": expected one of ${[...TARGETS].join(", ")}, got "${options.target}"`,
    );
  }
  for (const key of ["loaderVMDepth", "vmDepth"] as const) {
    const v = options[key];
    if (v === undefined) continue;
    if (!Number.isInteger(v)) {
      throw new Error(`invalid setting "${key}": expected an integer from 1 to 5, got ${v}`);
    }
    if (v < 1 || v > 5) {
      throw new Error(
        `invalid setting "${key}": loader VM depth must be between 1 and 5, got ${v}`,
      );
    }
  }
  if (options.packLayers !== undefined) {
    if (!Number.isInteger(options.packLayers) || options.packLayers < 1 || options.packLayers > 8) {
      throw new Error(
        `invalid setting "packLayers": expected an integer from 1 to 8, got ${options.packLayers}`,
      );
    }
  }
  if (options.vmLayers !== undefined) {
    if (!Number.isInteger(options.vmLayers) || options.vmLayers < 1 || options.vmLayers > 5) {
      throw new Error(
        `invalid setting "vmLayers": expected an integer from 1 to 5, got ${options.vmLayers}`,
      );
    }
  }
  if (options.seed !== undefined && !Number.isInteger(options.seed)) {
    throw new Error(`invalid setting "seed": expected an integer, got ${options.seed}`);
  }
  if (
    options.banner !== undefined &&
    typeof options.banner !== "boolean" &&
    typeof options.banner !== "string"
  ) {
    throw new Error(`invalid setting "banner": expected boolean or string, got ${typeof options.banner}`);
  }
}

export function calculateEntropy(str: string): number {
  if (!str.length) return 0;
  const freqs = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    freqs.set(c, (freqs.get(c) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freqs.values()) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

export type { RNG };
