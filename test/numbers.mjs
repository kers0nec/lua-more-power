/**
 * Numeric-transform correctness.
 *
 * `obfuscateNumbers` rewrites literals into expressions, so the one thing it
 * must never do is change a value. Two independent checks:
 *
 *   A. Exact evaluation over a wide magnitude spread. The emitted chunk is
 *      re-parsed and each expression is evaluated with BigInt under Lua 5.3
 *      rules (floor division, 64-bit bxor) written here from scratch — not the
 *      helper the transform uses. This is the check that matters for large
 *      constants, because...
 *
 *   B. ...fengari's integers are 32-bit (`math.maxinteger` is 2147483647), so
 *      it cannot judge anything above int32. Part B therefore runs the full
 *      pipeline end-to-end but only over values whose intermediates also stay
 *      inside int32, where the VM is faithful to Lua 5.3.
 *
 * The bug this suite exists to prevent: JavaScript's `^` truncates to 32 bits
 * while Lua's `~` is 64-bit, so `v ^ xor` silently produced a different number
 * than the literal it replaced for any |v| above 2^31.
 */

import { obfuscateLuaDetailed } from "../src/lib/lua/obfuscate.ts";
import { parse } from "../src/lib/lua/parser.ts";
import { runLua } from "./luarun.mjs";

/* ------------------------------------------------- independent evaluator */

const MASK64 = (1n << 64n) - 1n;

function floorDiv(a, b) {
  const q = a / b;
  return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
}

function bxor64(a, b) {
  const u = ((a & MASK64) ^ (b & MASK64)) & MASK64;
  return u >= 1n << 63n ? u - (1n << 64n) : u;
}

function evaluate(e) {
  switch (e.kind) {
    case "NumericLiteral": {
      if (!Number.isSafeInteger(e.value)) throw new Error(`literal ${e.raw} is not a safe integer`);
      return BigInt(e.value);
    }
    case "UnaryExpression":
      if (e.op !== "-") throw new Error(`unexpected unary ${e.op}`);
      return -evaluate(e.arg);
    case "BinaryExpression": {
      const l = evaluate(e.left);
      const r = evaluate(e.right);
      switch (e.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "//":
          return floorDiv(l, r);
        case "~":
          return bxor64(l, r);
        default:
          throw new Error(`unexpected operator ${e.op}`);
      }
    }
    default:
      throw new Error(`unexpected node ${e.kind}`);
  }
}

/* ------------------------------------------------------- A: exact values */

const MAGNITUDES = [
  0, 1, 2, 3, 7, 8, 15, 16, 63, 64, 127, 1000, 4096, 65535, 65536, 2147483646, 2147483647,
  2147483648, 4294967295, 4294967296, 1099511627776, 281474976710656, 281474976710655,
  140737488355328, -1, -2, -65536, -2147483647, -2147483648, -2147483649, -4294967296,
  -1099511627776, -281474976710656,
];

function buildSource(values) {
  return values.map((v, i) => `local x${i} = ${v < 0 ? `(${v})` : v}`).join("\n") + "\n";
}

function literalValues(chunk) {
  return chunk.body.map((s) => {
    if (s.kind !== "LocalStatement" || s.values.length !== 1) {
      throw new Error(`expected a single-value local, got ${s.kind}`);
    }
    return s.values[0];
  });
}

let failures = 0;
let rewritten = 0;
let checked = 0;
const SEEDS = 40;

for (let seed = 1; seed <= SEEDS; seed++) {
  const src = buildSource(MAGNITUDES);
  const out = obfuscateLuaDetailed(src, {
    pack: false,
    renameLocals: false,
    encryptStrings: false,
    injectJunk: false,
    controlFlowFlattening: false,
    antiTamper: false,
    antiHook: false,
    antiLogger: false,
    obfuscateNumbers: true,
    seed,
  });
  if (out.passthrough) {
    console.log(`FAIL  seed ${seed}: transform bailed out (${out.warnings.join("; ")})`);
    failures++;
    continue;
  }
  let emitted;
  try {
    emitted = literalValues(parse(out.code));
  } catch (e) {
    console.log(`FAIL  seed ${seed}: emitted chunk does not reparse — ${e.message.split("\n")[0]}`);
    failures++;
    continue;
  }
  if (emitted.length !== MAGNITUDES.length) {
    console.log(`FAIL  seed ${seed}: ${emitted.length} statements, expected ${MAGNITUDES.length}`);
    failures++;
    continue;
  }
  for (let i = 0; i < MAGNITUDES.length; i++) {
    checked++;
    const node = emitted[i];
    if (node.kind !== "NumericLiteral") rewritten++;
    let got;
    try {
      got = evaluate(node);
    } catch (e) {
      console.log(`FAIL  seed ${seed} value ${MAGNITUDES[i]}: ${e.message.split("\n")[0]}`);
      failures++;
      continue;
    }
    if (got !== BigInt(MAGNITUDES[i])) {
      failures++;
      console.log(
        `FAIL  seed ${seed}: ${MAGNITUDES[i]} was rewritten to an expression worth ${got}`,
      );
    }
  }
}

console.log(
  `exact evaluation: ${checked} literals across ${SEEDS} seeds, ${rewritten} rewritten, ${
    failures ? `${failures} WRONG` : "all values preserved"
  }`,
);

/* ------------------------------------------- B: end-to-end inside int32 */

// Values small enough that every intermediate stays inside int32, which is
// where fengari agrees with Lua 5.3.
const SMALL = `
print(1 + 2, 100 - 7, 6 * 7, 4096 // 8, 1000 * 3)
print(-12345, 0, 1, 2, 63, 64, 255, 256, 65535)
local t = {}
for i = 1, 10 do t[i] = i * i - 1 end
print(table.concat(t, ","))
print(string.rep("ab", 12 // 4))
print(2 ^ 10, 7 / 2, -3.5 + 0.25, 1e6 / 4)
print(math.floor(9.75), math.ceil(-9.25), 100 % 7, 1000000 // 3)
`;

let e2eFailures = 0;
const E2E_SEEDS = 25;
const baseline = runLua(SMALL).stdout;
for (let seed = 1; seed <= E2E_SEEDS; seed++) {
  const out = obfuscateLuaDetailed(SMALL, {
    pack: false,
    renameLocals: false,
    encryptStrings: false,
    injectJunk: false,
    controlFlowFlattening: false,
    antiTamper: false,
    antiHook: false,
    antiLogger: false,
    obfuscateNumbers: true,
    seed,
  });
  const got = runLua(out.code);
  if (got.stdout !== baseline) {
    e2eFailures++;
    console.log(`FAIL  end-to-end seed ${seed}`);
    console.log(`      expected ${JSON.stringify(baseline.slice(0, 140))}`);
    console.log(`      actual   ${JSON.stringify(got.stdout.slice(0, 140))} ${got.errorText}`);
  }
}
console.log(
  `end-to-end: ${E2E_SEEDS} seeds, ${e2eFailures ? `${e2eFailures} FAILED` : "identical output"}`,
);

const total = failures + e2eFailures;
console.log("=".repeat(64));
console.log(total ? `${total} numeric check(s) failed` : "all numeric checks passed");
process.exit(total ? 1 : 0);
