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
import { packLuaSource } from "./pack.ts";
import { ENGINE_NAME } from "./version.ts";
import type { Chunk } from "./ast.ts";

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
   * Reserved. Bytecode virtualization is NOT implemented — the option is kept so
   * the API and stored presets stay stable, and requesting it adds a warning to
   * the build output rather than silently pretending it happened.
   */
  virtualize?: boolean;
  pack?: boolean;
  packLayers?: number;
  integrityCheck?: boolean;
  compact?: boolean;

  target?: LuaTarget;
  isLuauRuntime?: boolean;
  banner?: boolean | string;

  /* --- legacy option names still accepted by the API and the dashboard --- */
  antiTamper?: boolean;
  antiHook?: boolean;
  antiLogger?: boolean;
  dualVm?: boolean;
  polymorphicVM?: boolean;
  proxifyLocals?: boolean;
  proxifyFunctions?: boolean;
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
  inputBytes: number;
  outputBytes: number;
  entropy: number;
  ms: number;
  engine: string;
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
  pack: boolean;
  packLayers: number;
  integrityCheck: boolean;
  compact: boolean;
  target: LuaTarget;
  banner: string;
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
      pack: true,
      packLayers: 1,
    },
    standard: {
      renameLocals: true,
      obfuscateNumbers: true,
      encryptStrings: true,
      injectJunk: true,
      controlFlowFlattening: true,
      virtualize: false,
      pack: true,
      packLayers: 1,
    },
    strong: {
      renameLocals: true,
      obfuscateNumbers: true,
      encryptStrings: true,
      injectJunk: true,
      controlFlowFlattening: true,
      virtualize: false,
      pack: true,
      packLayers: 1,
    },
    paranoid: {
      renameLocals: true,
      obfuscateNumbers: true,
      encryptStrings: true,
      injectJunk: true,
      controlFlowFlattening: true,
      virtualize: false,
      pack: true,
      packLayers: 2,
      integrityCheck: true,
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
    injectJunk: bool(options.injectJunk, [options.antiLogger], d.injectJunk!),
    controlFlowFlattening: bool(options.controlFlowFlattening, [], d.controlFlowFlattening!),
    virtualize: bool(options.virtualize, [options.polymorphicVM], d.virtualize!),
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
  if (resolved.virtualize) {
    warnings.push(
      "virtualize was requested but bytecode virtualization is not implemented yet — the build ran without it",
    );
  }
  const rng = createRng(resolved.seed);

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
      // must run before junk injection: the hoisting map comes from the scope
      // resolution above, which knows nothing about statements added later
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

function createLocalNameGenerator(rng: RNG): () => string {
  let n = 0;
  return () => {
    n++;
    return `_${pickNameChars(rng)}${n.toString(36)}`;
  };
}

export function obfuscateLua(source: string): string {
  return obfuscateLuaDetailed(source, { preset: "strong" }).code;
}

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  return obfuscateLuaDetailed(source, options).code;
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
