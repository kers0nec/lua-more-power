// Parser/emitter fidelity check.
//   lua  corpus: parse -> emit must be *behaviourally identical* when executed
//   luau corpus: parse -> emit -> parse -> emit must be textually stable
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "../src/lib/lua/parser.ts";
import { emit } from "../src/lib/lua/emitter.ts";
import { runLua, signature, __dirname } from "./luarun.mjs";

const corpusDir = join(__dirname, "corpus");
let failed = 0;
let total = 0;

function check(name, fn) {
  total++;
  try {
    const err = fn();
    if (err) {
      failed++;
      console.log(`FAIL  ${name}\n      ${err}`);
    } else {
      console.log(`pass  ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}\n      ${e.message.split("\n")[0]}`);
  }
}

console.log("Lua corpus (parse -> emit must run identically)\n" + "=".repeat(64));
for (const file of readdirSync(join(corpusDir, "lua")).sort()) {
  const src = readFileSync(join(corpusDir, "lua", file), "utf8");
  check(`lua/${file}`, () => {
    const once = emit(parse(src));
    const twice = emit(parse(once));
    if (once !== twice) {
      const a = once.split("\n");
      const b = twice.split("\n");
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) return `unstable at line ${i + 1}:\n      - ${a[i]}\n      + ${b[i]}`;
      }
      return "unstable (unknown line)";
    }
    const before = runLua(src);
    const after = runLua(once);
    if (signature(before) !== signature(after)) {
      return `behaviour changed\n      before: ${JSON.stringify(before).slice(0, 400)}\n      after : ${JSON.stringify(after).slice(0, 400)}`;
    }
    if (!before.ok && before.errorText === "") return "both runs failed silently";
    return null;
  });
}

console.log("\nLuau corpus (parse -> emit must be stable)\n" + "=".repeat(64));
for (const file of readdirSync(join(corpusDir, "luau")).sort()) {
  const src = readFileSync(join(corpusDir, "luau", file), "utf8");
  check(`luau/${file}`, () => {
    const once = emit(parse(src));
    const twice = emit(parse(once));
    if (once !== twice) {
      const a = once.split("\n");
      const b = twice.split("\n");
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) return `unstable at line ${i + 1}:\n      - ${a[i]}\n      + ${b[i]}`;
      }
    }
    return null;
  });
}

console.log("=".repeat(64));
console.log(failed ? `${failed}/${total} failed` : `all ${total} checks passed`);
process.exit(failed ? 1 : 0);
