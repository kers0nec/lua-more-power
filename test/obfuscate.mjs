// Differential test: for every corpus program and every option combination,
// the obfuscated build must produce *exactly* the same observable behaviour as
// the original when both are executed in the same Lua VM.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { obfuscateLuaDetailed } from "../src/lib/lua/obfuscate.ts";
import { runLua, signature, __dirname } from "./luarun.mjs";

const CASES = [
  {
    name: "passthrough",
    opts: {
      pack: false,
      renameLocals: false,
      encryptStrings: false,
      obfuscateNumbers: false,
      injectJunk: false,
    },
  },
  {
    name: "rename",
    opts: {
      pack: false,
      renameLocals: true,
      encryptStrings: false,
      obfuscateNumbers: false,
      injectJunk: false,
    },
  },
  {
    name: "strings",
    opts: {
      pack: false,
      renameLocals: false,
      encryptStrings: true,
      obfuscateNumbers: false,
      injectJunk: false,
    },
  },
  {
    name: "numbers",
    opts: {
      pack: false,
      renameLocals: false,
      encryptStrings: false,
      obfuscateNumbers: true,
      injectJunk: false,
    },
  },
  {
    name: "junk",
    opts: {
      pack: false,
      renameLocals: false,
      encryptStrings: false,
      obfuscateNumbers: false,
      injectJunk: true,
    },
  },
  { name: "all-nopack", opts: { pack: false, preset: "standard" } },
  { name: "fast", opts: { preset: "fast" } },
  { name: "standard", opts: { preset: "standard" } },
  { name: "strong", opts: { preset: "strong" } },
  { name: "paranoid", opts: { preset: "paranoid" } },
  { name: "strong-lua51", opts: { preset: "strong", target: "lua51" } },
  { name: "strong-luau", opts: { preset: "strong", target: "luau" } },
  { name: "strong-seeded", opts: { preset: "strong", seed: 12345 } },
  {
    name: "shields-lua51",
    opts: {
      preset: "strong",
      target: "lua51",
      antiTamper: true,
      antiHook: true,
      antiLogger: true,
      seed: 9876,
    },
  },
  { name: "antiTamper-only", opts: { pack: false, antiTamper: true, seed: 11 } },
  { name: "antiHook-only", opts: { pack: false, antiTamper: false, antiHook: true, seed: 22 } },
  { name: "depth2", opts: { loaderVMDepth: 2, seed: 33 } },
  { name: "depth5", opts: { preset: "paranoid", loaderVMDepth: 5, seed: 44 } },
  { name: "poly-depth3", opts: { polymorphicVM: true, loaderVMDepth: 3, seed: 55 } },
  { name: "all-off", opts: { preset: "fast", antiTamper: false, antiHook: false, seed: 66 } },
];

const only = process.argv[2];
const corpusDir = join(__dirname, "corpus", "lua");
const files = readdirSync(corpusDir).sort();

/**
 * Builds are seeded from the clock by default, so the matrix explores a
 * different random shape on every run. Set LUAMORE_TEST_SEED to pin (and
 * replay) one such shape — that is how an intermittent failure gets reproduced.
 */
const seedBase = process.env.LUAMORE_TEST_SEED ? Number(process.env.LUAMORE_TEST_SEED) : null;
const seedFor = (fi, ci, declared) =>
  seedBase === null ? declared : (declared ?? 0) + seedBase + fi * 97 + ci;

let failed = 0;
let checks = 0;
const failures = [];

files.forEach((file, fi) => {
  const src = readFileSync(join(corpusDir, file), "utf8");
  const baseline = runLua(src);
  const baseSig = signature(baseline);
  const row = [];
  CASES.forEach((c, ci) => {
    if (only && c.name !== only) return;
    checks++;
    let out;
    try {
      out = obfuscateLuaDetailed(src, { ...c.opts, seed: seedFor(fi, ci, c.opts.seed) });
    } catch (e) {
      failed++;
      failures.push(`${file} / ${c.name}: obfuscation threw — ${e.message}`);
      row.push("ERR ");
      return;
    }
    if (out.passthrough) {
      row.push("skip");
      return;
    }
    const run = runLua(out.code);
    if (signature(run) !== baseSig) {
      failed++;
      failures.push(
        `${file} / ${c.name}: behaviour changed\n` +
          `    baseline: ${baseSig.slice(0, 220)}\n` +
          `    built   : ${signature(run).slice(0, 220)}\n` +
          `    warnings: ${out.warnings.join("; ")}`,
      );
      row.push("FAIL");
    } else {
      row.push("ok  ");
    }
  });
  console.log(`${file.padEnd(20)} ${row.join(" ")}`);
});

console.log("");
if (failures.length) {
  console.log(failures.map((f) => "✗ " + f).join("\n"));
}
console.log("=".repeat(70));
console.log(failed ? `${failed}/${checks} FAILED` : `all ${checks} differential checks passed`);
process.exit(failed ? 1 : 0);
