/**
 * LuaMore obfuscation regression suite.
 *
 * For every option combination: obfuscate a real program, execute both the
 * original and the build in the same Lua 5.3 VM (fengari), and require the
 * observable behaviour to be *identical* — same stdout, same error, same
 * success. A sentinel check alone would pass on a build that prints the marker
 * and then dies, which is exactly the failure mode this suite exists to catch.
 *
 * Usage: npm run test:regression
 * Requires: `npm install` (fengari is a devDependency). No `lua` binary needed.
 */

import { obfuscateLuaWithOptions } from "../src/lib/obfuscator.server.ts";
import { runLua, signature } from "../test/luarun.mjs";

const SOURCE = `
local function fib(n) if n < 2 then return n end return fib(n - 1) + fib(n - 2) end
local function build(limit)
  local t = {}
  for i = 1, limit do t[i] = fib(i) end
  return t
end
local values = build(12)
print(table.concat(values, ","))
local config = { name = "LuaMore", retries = 3, enabled = true, tags = { "a", "b" } }
for _, tag in ipairs(config.tags) do print(config.name .. ":" .. tag) end
local ok, err = pcall(function() return error("deliberate", 0) end)
print(ok, err)
print(string.format("%d/%.2f/%s", #values, 7 / 2, tostring(2 ^ 10)))
print("LUAMORE_REGRESSION_SENTINEL")
`;

function entropy(str) {
  const counts = new Map();
  for (const ch of str) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const n = str.length;
  let h = 0;
  for (const c of counts.values()) {
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

const CASES = [
  { name: "fast preset", opts: { preset: "fast" } },
  { name: "standard preset", opts: { preset: "standard" } },
  { name: "strong preset", opts: { preset: "strong" } },
  { name: "paranoid preset", opts: { preset: "paranoid" } },
  {
    name: "rename only",
    opts: {
      preset: "fast",
      pack: false,
      encryptStrings: false,
      obfuscateNumbers: false,
      injectJunk: false,
      controlFlowFlattening: false,
    },
  },
  {
    name: "string encryption",
    opts: {
      preset: "strong",
      pack: false,
      renameLocals: false,
      obfuscateNumbers: false,
      injectJunk: false,
      controlFlowFlattening: false,
    },
  },
  {
    name: "control-flow flattening",
    opts: {
      preset: "strong",
      pack: false,
      renameLocals: false,
      encryptStrings: false,
      obfuscateNumbers: false,
      injectJunk: false,
    },
  },
  {
    name: "opaque predicates",
    opts: {
      preset: "strong",
      pack: false,
      renameLocals: false,
      encryptStrings: false,
      obfuscateNumbers: false,
      controlFlowFlattening: false,
    },
  },
  { name: "integrity check", opts: { preset: "strong", integrityCheck: true } },
  { name: "3 packing layers", opts: { preset: "strong", packLayers: 3, integrityCheck: true } },
  { name: "legacy: dualVm + antiTamper", opts: { dualVm: true, antiTamper: true } },
  {
    name: "legacy: loaderVMDepth 5",
    opts: { loaderVMDepth: 5, oeldAntiTamper: true, chunkedLoader: true },
  },
  {
    name: "legacy: proxifyLocals/Functions",
    opts: { proxifyLocals: true, proxifyFunctions: true, controlFlowFlattening: true },
  },
  { name: "legacy: polymorphicVM", opts: { polymorphicVM: true, dualVm: true } },
  { name: "Luau target", opts: { preset: "strong", target: "luau" } },
  { name: "Lua 5.1 target", opts: { preset: "strong", target: "lua51" } },
];

const baseline = runLua(SOURCE);
const baseSig = signature(baseline);
if (!baseline.stdout.includes("LUAMORE_REGRESSION_SENTINEL")) {
  console.log("FATAL  the test program itself does not run — fix the harness first");
  console.log(baseline.errorText);
  process.exit(1);
}

let failed = 0;
console.log("LuaMore obfuscation regression");
console.log(
  `source ${SOURCE.length} bytes · reference output ${JSON.stringify(baseline.stdout.slice(0, 60))}…`,
);
console.log("=".repeat(96));
for (const c of CASES) {
  const t0 = Date.now();
  let out;
  try {
    out = obfuscateLuaWithOptions(SOURCE, c.opts);
  } catch (e) {
    console.log(`FAIL  ${c.name.padEnd(30)} obfuscation threw: ${e.message}`);
    failed++;
    continue;
  }
  const buildMs = Date.now() - t0;
  const run = runLua(out);
  const sig = signature(run);
  const identical = sig === baseSig;
  const sentinel = run.stdout.includes("LUAMORE_REGRESSION_SENTINEL");
  const ok = identical && sentinel;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(30)} bytes=${String(out.length).padStart(7)} ` +
      `x${(out.length / SOURCE.length).toFixed(1).padStart(5)}  H=${entropy(out).toFixed(3)}  build=${buildMs}ms`,
  );
  if (!ok) {
    failed++;
    if (!identical) {
      console.log(`        expected ${baseSig.slice(0, 180)}`);
      console.log(`        actual   ${sig.slice(0, 180)}`);
    }
    if (!sentinel) console.log("        sentinel missing from stdout");
  }
}
console.log("=".repeat(96));
if (failed) {
  console.log(`${failed} case(s) failed`);
  process.exit(1);
}
console.log(`all ${CASES.length} cases passed`);
