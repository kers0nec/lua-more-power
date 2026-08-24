import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { obfuscateLuaWithOptions } from "./src/lib/obfuscator.server.ts";

const source = `
local function fib(n) if n<2 then return n end return fib(n-1)+fib(n-2) end
if fib(10) ~= 55 then error("payload failed") end
print("LUAMORE_PAYLOAD_PASS")
`;
const output = obfuscateLuaWithOptions(source, { dualVm: true, validationMarkers: true });
const dir = mkdtempSync(join(tmpdir(), "luamore-obf-"));
const file = join(dir, "dual-vm.lua");
writeFileSync(file, output);

const run = spawnSync("lua", [file], { encoding: "utf8", timeout: 30_000 });
const text = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
const vm1 = text.includes("LUAMORE_VM1_INTEGRITY_PASS");
const vm2 = text.includes("LUAMORE_VM2_INTEGRITY_PASS");
const payload = text.includes("LUAMORE_PAYLOAD_PASS");

console.log(`VM1 integrity: ${vm1 ? "PASS" : "FAIL"}`);
console.log(`VM2 integrity: ${vm2 ? "PASS" : "FAIL"}`);
console.log(`Payload execution: ${payload ? "PASS" : "FAIL"}`);
rmSync(dir, { recursive: true, force: true });

if (run.error || run.status !== 0 || !vm1 || !vm2 || !payload) {
  if (run.error) console.error(run.error.message);
  if (run.stderr) console.error(run.stderr.trim());
  process.exit(1);
}
