// LuaMore obfuscation regression tests.
// For each option combo: obfuscate, execute in `lua` (5.1), assert the payload's
// sentinel print reaches stdout, and report bytes + Shannon entropy.
//
// Usage: node scripts/obfuscation-regression.mjs
// Requires: a working `lua` (5.1) on PATH.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { obfuscateLuaWithOptions } from "../src/lib/obfuscator.server.ts";

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

function runLua(code) {
  const dir = mkdtempSync(join(tmpdir(), "lm-regression-"));
  const file = join(dir, "case.lua");
  writeFileSync(file, code);
  const r = spawnSync("lua", [file], { encoding: "utf8", timeout: 60_000 });
  rmSync(dir, { recursive: true, force: true });
  return r;
}

const CASES = [
  {
    name: "baseline (single VM)",
    opts: { dualVm: false, antiTamper: false, polymorphicVM: false },
  },
  { name: "antiTamper", opts: { dualVm: false, antiTamper: true, polymorphicVM: false } },
  { name: "dualVm", opts: { dualVm: true, antiTamper: true, polymorphicVM: false } },
  { name: "depth 3", opts: { loaderVMDepth: 3, antiTamper: true, polymorphicVM: false } },
  { name: "polymorphicVM only", opts: { dualVm: false, antiTamper: false, polymorphicVM: true } },
  { name: "dualVm + polymorphicVM", opts: { dualVm: true, antiTamper: true, polymorphicVM: true } },
  {
    name: "polymorphicVM + context",
    opts: {
      dualVm: false,
      antiTamper: false,
      polymorphicVM: true,
      context: { publicId: "LM-ABCD-EFGH-1234", mode: "advanced" },
    },
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
  const ok = r.status === 0 && (r.stdout ?? "").includes(SENTINEL);
  const bytes = out.length;
  const H = entropy(out).toFixed(3);
  const status = ok ? "PASS" : "FAIL";
  console.log(
    `${status}  ${c.name.padEnd(30)}  bytes=${String(bytes).padStart(8)}  H=${H}  build=${buildMs}ms`,
  );
  if (!ok) {
    failed++;
    console.log("  stdout:", (r.stdout ?? "").trim().slice(0, 200));
    console.log("  stderr:", (r.stderr ?? "").trim().slice(0, 400));
  }
}
console.log("=".repeat(60));
if (failed) {
  console.log(`${failed} case(s) failed`);
  process.exit(1);
}
console.log("all cases passed");
