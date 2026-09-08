// LuaMore obfuscation regression tests.
// For each option combo: obfuscate via the public façade, execute the result in
// an in-process Lua VM (fengari), and assert the payload's sentinel print reaches
// stdout. Reports output bytes + Shannon entropy.
//
// Usage: node --experimental-strip-types --no-warnings scripts/obfuscation-regression.mjs
// No external `lua` binary required — runs the same Lua 5.3 VM the engine's
// differential suite uses.

import { obfuscateLuaWithOptions } from "../src/lib/obfuscator.server.ts";
import { runLua } from "../test/luarun.mjs";

const SENTINEL = "LUAMORE_TEST_PASS_" + Math.random().toString(36).slice(2, 10);
const SOURCE = `
local function fib(n) if n<2 then return n end return fib(n-1)+fib(n-2) end
if fib(10) ~= 55 then error("fib failed") end
print("${SENTINEL}")
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
  {
    name: "baseline (fast preset)",
    opts: { preset: "fast", antiTamper: false },
  },
  { name: "antiTamper", opts: { antiTamper: true, loaderVMDepth: 1 } },
  { name: "dualVm (depth 2)", opts: { dualVm: true, antiTamper: true } },
  { name: "depth 3", opts: { loaderVMDepth: 3, antiTamper: true } },
  { name: "paranoid preset", opts: { preset: "paranoid" } },
  {
    name: "CFF + strings + numbers",
    opts: { controlFlowFlattening: true, encryptStrings: true, obfuscateNumbers: true },
  },
];

let failed = 0;
console.log("LuaMore obfuscation regression\n" + "=".repeat(60));
for (const c of CASES) {
  const t0 = Date.now();
  let out;
  try {
    out = obfuscateLuaWithOptions(SOURCE, c.opts);
  } catch (e) {
    console.log(`FAIL  ${c.name} — obfuscation threw: ${e.message}`);
    failed++;
    continue;
  }
  const buildMs = Date.now() - t0;
  const r = runLua(out);
  const ok = r.ok && r.stdout.includes(SENTINEL);
  const bytes = out.length;
  const H = entropy(out).toFixed(3);
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `${status}  ${c.name.padEnd(30)}  bytes=${String(bytes).padStart(8)}  H=${H}  build=${buildMs}ms`,
  );
  if (!ok) {
    failed++;
    console.log("  stdout:", r.stdout.trim().slice(0, 200));
    console.log("  errorText:", r.errorText.slice(0, 400));
  }
}
console.log("=".repeat(60));
if (failed) {
  console.log(`${failed} case(s) failed`);
  process.exit(1);
}
console.log("all cases passed");
