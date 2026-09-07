// Property test for the transport layer: for arbitrary byte payloads, the Lua
// loader emitted by packLuaSource must decode back to exactly those bytes.
import { packLuaSource } from "../src/lib/lua/pack.ts";
import { createRng } from "../src/lib/lua/rng.ts";
import { runLua } from "./luarun.mjs";

const rng = createRng(20260907);
const cases = [];
for (const n of [0, 1, 2, 3, 4, 5, 7, 8, 15, 16, 17, 31, 64, 255, 1000, 5000]) {
  cases.push({ name: `len=${n}`, source: makeLuaSource(n) });
}
cases.push({ name: "repetitive", source: 'print("aaaaaaaaaaaaaaaaaaaaaaaa")\n'.repeat(40) });
// A repeat whose distance is exactly one window: the 12-bit match field holds
// at most 4095, so an off-by-one in the matcher's window silently truncates
// the distance to 0 and the decoder writes a nil hole. Small payloads never
// reach a 4096-byte distance, so only a payload this size catches it.
const alphabet36 = "abcdefghijklmnopqrstuvwxyz0123456789";
const blockRng = createRng(1234);
const block = Array.from({ length: 4086 }, () => alphabet36[blockRng.int(36)]).join("");
cases.push({ name: "offset-4096", source: `print("${block}")\nprint("${block}")\n` });
cases.push({
  name: "large-mixed",
  source:
    Array.from(
      { length: 400 },
      (_, i) => `local v${i % 37} = ${i} * 3 + ${i % 11} -- pad${i % 37}\n`,
    ).join("") + "print(v1, v2)\n",
});
cases.push({
  name: "binary-ish",
  source: `local t = {${Array.from({ length: 200 }, (_, i) => i % 251).join(",")}}\nprint(#t)\n`,
});

function makeLuaSource(n) {
  // a chunk that prints a deterministic marker derived from its own length
  const marker = "M".repeat(Math.max(1, n % 97));
  return `print("${marker}")\nprint(${n})\n`;
}

let failed = 0;
for (const c of cases) {
  const names = (() => {
    let i = 0;
    return () => `_t${(i++).toString(36)}x`;
  })();
  let out;
  try {
    out = packLuaSource(c.source, {
      rng: createRng(rng.int(1e9)),
      layers: 1 + rng.int(2),
      integrityCheck: true,
      banner: "",
      names,
    });
  } catch (e) {
    console.log(`FAIL  ${c.name}: packing threw ${e.message}`);
    failed++;
    continue;
  }
  const expected = runLua(c.source);
  const actual = runLua(out);
  const ok = actual.ok === expected.ok && actual.stdout === expected.stdout;
  console.log(
    `${ok ? "pass" : "FAIL"}  ${c.name.padEnd(12)} in=${String(c.source.length).padStart(6)} out=${String(out.length).padStart(6)} ratio=${(out.length / Math.max(1, c.source.length)).toFixed(2)}`,
  );
  if (!ok) {
    failed++;
    console.log(
      `      expected ${JSON.stringify(expected.stdout.slice(0, 120))} ok=${expected.ok}`,
    );
    console.log(
      `      actual   ${JSON.stringify(actual.stdout.slice(0, 120))} ok=${actual.ok} err=${actual.errorText}`,
    );
  }
}
console.log("=".repeat(60));
console.log(failed ? `${failed} packing case(s) failed` : "all packing cases passed");
process.exit(failed ? 1 : 0);
