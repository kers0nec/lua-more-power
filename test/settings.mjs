// Option-validation + shield-behaviour suite for the LuaMore engine.
//
// Covers (from the engine contract):
//   - rejecting invalid settings and loaderVMDepth values outside 1..5
//   - preserving behaviour when options are disabled
//   - fail-closed anti-tamper (self-checksum) and anti-hook (behaviour pin)
//   - loader VM depth -> nested loader layers
//   - obfuscate(source, settings) -> { output, metadata } shape
//   - deterministic seeded builds, Roblox-global preservation, large sources
//
// Run: npm run test:settings  (fengari is only used to *execute* builds here)

import { obfuscateLuaDetailed, obfuscate, validateSettings } from "../src/lib/lua/obfuscate.ts";
import { runLua, signature } from "./luarun.mjs";

const MARKER = 'print("LM_SETTINGS_SENTINEL")';
const SOURCE = `
local count = 0
local function tick(n)
  for i = 1, n do count = count + 1 end
end
tick(4)
print("count=" .. count)
local labels = { "alpha", "beta", "gamma" }
print(table.concat(labels, ","))
local ok, err = pcall(function() error("boom", 0) end)
print(ok, type(err))
print("LM_SETTINGS_SENTINEL")
`;

let failed = 0;
let checks = 0;
const fail = (name, msg) => {
  failed++;
  console.log(`FAIL  ${name}: ${msg}`);
};
const pass = (name) => {
  checks++;
  console.log(`ok    ${name}`);
};

function expectThrow(name, fn, pattern) {
  try {
    fn();
    fail(name, `expected throw matching /${pattern}/ but it succeeded`);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (pattern && !new RegExp(pattern).test(m)) {
      fail(name, `threw "${m}", expected match /${pattern}/`);
    } else {
      pass(name);
    }
  }
}

/* -------------------------------------------------- 1. settings validation */
expectThrow("unknown key rejected", () => obfuscateLuaDetailed(SOURCE, { bogus: true }), 'invalid setting "bogus"');
expectThrow("non-boolean rejected", () => obfuscateLuaDetailed(SOURCE, { encryptStrings: "yes" }), 'invalid setting "encryptStrings"');
expectThrow("depth 0 rejected", () => obfuscateLuaDetailed(SOURCE, { loaderVMDepth: 0 }), "between 1 and 5");
expectThrow("depth 6 rejected", () => obfuscateLuaDetailed(SOURCE, { loaderVMDepth: 6 }), "between 1 and 5");
expectThrow("depth 2.5 rejected", () => obfuscateLuaDetailed(SOURCE, { loaderVMDepth: 2.5 }), "integer from 1 to 5");
expectThrow("vmDepth alias 9 rejected", () => obfuscateLuaDetailed(SOURCE, { vmDepth: 9 }), "between 1 and 5");
expectThrow("bad preset rejected", () => obfuscateLuaDetailed(SOURCE, { preset: "ultra" }), 'invalid setting "preset"');
expectThrow("bad target rejected", () => obfuscateLuaDetailed(SOURCE, { target: "lua99" }), 'invalid setting "target"');
expectThrow("float seed rejected", () => obfuscateLuaDetailed(SOURCE, { seed: 1.5 }), 'invalid setting "seed"');
expectThrow("non-string source rejected", () => obfuscateLuaDetailed(123, {}), "source must be a string");
expectThrow("array settings rejected", () => obfuscateLuaDetailed(SOURCE, []), "plain object");
pass("valid settings accepted");

validateSettings(SOURCE, {
  loaderVMDepth: 5,
  antiTamper: true,
  antiHook: true,
  antiLogger: true,
  isLuauRuntime: true,
  seed: 42,
});

/* ------------------------------------------- 2. obfuscate() entry point */
{
  const r = obfuscate(SOURCE, { preset: "fast", seed: 7 });
  const okShape =
    typeof r.output === "string" &&
    r.output.length > 0 &&
    typeof r.metadata?.engine === "string" &&
    Array.isArray(r.metadata.warnings) &&
    typeof r.metadata.stats?.outputBytes === "number" &&
    r.metadata.seed === 7 &&
    r.metadata.settings.preset === "fast";
  okShape ? pass("obfuscate() shape") : fail("obfuscate() shape", "unexpected output shape");
}

/* --------------------------------------------------- 3. option isolation */
{
  const off = obfuscateLuaDetailed(SOURCE, {
    preset: "fast",
    antiTamper: false,
    antiHook: false,
    seed: 5,
  });
  const r = runLua(off.code);
  if (signature(r) !== signature(runLua(SOURCE))) {
    fail("behaviour preserved with shields off", "signature changed");
  } else {
    pass("behaviour preserved with shields off");
  }
  if (off.code.includes("runtime integrity check failed")) {
    fail("shields off emits no shield", "shield marker found in output");
  } else {
    pass("shields off emits no shield");
  }
}

/* --------------------------------------------------- 4. fail-closed tests */
{
  const build = obfuscateLuaDetailed(SOURCE, {
    preset: "standard",
    pack: false,
    antiTamper: true,
    antiHook: false,
    seed: 77,
  }).code;

  const clean = runLua(build);
  if (clean.ok && clean.stdout.includes("LM_SETTINGS_SENTINEL")) {
    pass("anti-tamper build runs clean");
  } else {
    fail("anti-tamper build runs clean", JSON.stringify(clean));
  }

  // Mutating the embedded guard constant must trip the self-checksum.
  const markerConst = "LuaMoreGuard:PayloadShield:201";
  if (!build.includes(markerConst)) {
    fail("tamper simulation", "guard constant not found in emitted build");
  } else {
    const tampered = runLua(build.replace(markerConst, "LuaMoreGuard:PayloadShield:200"));
    const tripped = !tampered.ok && tampered.errorText.includes("shield body checksum");
    tripped
      ? pass("anti-tamper fails closed on checksum change")
      : fail("anti-tamper fails closed on checksum change", JSON.stringify(tampered));
  }
}

{
  const build = obfuscateLuaDetailed(SOURCE, {
    preset: "standard",
    pack: false,
    antiTamper: false,
    antiHook: true,
    seed: 78,
  }).code;

  // Replacing a supported stdlib function with one that misbehaves must trip
  // the behaviour pin before any user code runs.
  const evil = 'string.byte = function() return 99 end\n';
  const hooked = runLua(evil + build);
  const tripped = !hooked.ok && hooked.errorText.includes("runtime integrity check failed");
  tripped
    ? pass("anti-hook fails closed on replaced stdlib")
    : fail("anti-hook fails closed on replaced stdlib", JSON.stringify(hooked));

  const clean = runLua(build);
  if (clean.ok && clean.stdout.includes("LM_SETTINGS_SENTINEL")) {
    pass("anti-hook build runs clean");
  } else {
    fail("anti-hook build runs clean", JSON.stringify(clean));
  }
}

/* ----------------------------------------------------- 5. env-logger gate */
{
  const luau51 = obfuscateLuaDetailed(SOURCE, {
    preset: "standard",
    pack: false,
    antiLogger: true,
    target: "lua51",
    seed: 79,
  });
  const luau = obfuscateLuaDetailed(SOURCE, {
    preset: "standard",
    pack: false,
    antiLogger: true,
    isLuauRuntime: true,
    target: "luau",
    seed: 80,
  });
  if (luau51.code.includes("setfenv") && !luau.code.includes("setfenv(")) {
    pass("anti env-logger gated to legacy setfenv platforms");
  } else {
    fail(
      "anti env-logger gated to legacy setfenv platforms",
      `lua51 has setfenv=${luau51.code.includes("setfenv")}, luau has=${luau.code.includes("setfenv(")}`,
    );
  }
  const stats = luau51.stats.runtimeShields ?? [];
  if (stats.includes("antiLogger") && stats.includes("antiTamper")) {
    pass("runtimeShields recorded in stats");
  } else {
    fail("runtimeShields recorded in stats", JSON.stringify(stats));
  }
}

/* ------------------------------------------- 6. depth -> loader layers */
{
  const a = obfuscateLuaDetailed(SOURCE, { loaderVMDepth: 1, seed: 9 });
  const b = obfuscateLuaDetailed(SOURCE, { loaderVMDepth: 3, seed: 10 });
  const c = obfuscateLuaDetailed(SOURCE, { loaderVMDepth: 5, preset: "paranoid", seed: 11 });
  if (a.stats.layers === 1 && b.stats.layers === 3 && c.stats.layers === 5) {
    pass("loaderVMDepth maps to loader layers");
  } else {
    fail("loaderVMDepth maps to loader layers", `${a.stats.layers}/${b.stats.layers}/${c.stats.layers}`);
  }
  if (a.code !== a.code || runLua(a.code).ok) pass("depth-1 build executes");
  else fail("depth-1 build executes", "run failed");
}

/* ------------------------------------------------- 7. deterministic + seed */
{
  const a = obfuscateLuaDetailed(SOURCE, { preset: "strong", seed: 424242 });
  const b = obfuscateLuaDetailed(SOURCE, { preset: "strong", seed: 424242 });
  if (a.code === b.code) pass("seeded builds are deterministic");
  else fail("seeded builds are deterministic", "output differs for the same seed");
}

/* ------------------------------------------- 8. Roblox globals preserved */
{
  const rbx = `
local Players = game:GetService("Players")
local lp = Players.LocalPlayer
local part = Instance.new("Part")
part.Parent = workspace
part.Anchored = true
local child = script.Parent:WaitForChild("Thing")
print(lp.Name, part.Name, child.Name, game.PlaceId)
`;
  // pack:false so the identifiers are introspectable (a packed build hides them
  // inside the encoded payload by design — that is the point).
  const out = obfuscateLuaDetailed(rbx, { preset: "strong", pack: false, seed: 12 }).code;
  const keepsRobloxGlobals =
    out.includes("game") &&
    out.includes("Instance") &&
    out.includes("workspace") &&
    out.includes("script");
  if (keepsRobloxGlobals && obfuscateLuaDetailed(rbx, { preset: "fast" }).warnings.length === 0) {
    pass("Roblox globals and constructors survive");
  } else {
    fail("Roblox globals and constructors survive", "identifiers were not preserved");
  }
}

/* -------------------------------------------------------- 9. large source */
{
  // Large file made of many independent blocks (a single function may only hold
  // 200 locals in stock Lua, so the input must not exceed that or even the
  // plain source would fail to compile in fengari).
  const lines = [];
  for (let i = 1; i <= 1600; i++) lines.push(`do local q${i} = ${i} * 3; print(q${i}) end`);
  const big = lines.join("\n") + '\nprint("BIG_OK")\n';
  const baseline = runLua(big);
  if (!baseline.ok) {
    fail("large source", `baseline itself failed to run: ${baseline.errorText}`);
  } else {
    const started = Date.now();
    const out = obfuscateLuaDetailed(big, { preset: "standard", seed: 13 });
    const elapsed = Date.now() - started;
    const run = runLua(out.code);
    if (!out.passthrough && run.ok && run.stdout.includes("BIG_OK") && elapsed < 120_000) {
      pass(`large source (${(big.length / 1024).toFixed(1)} KB) obfuscated in ${elapsed} ms`);
    } else {
      fail("large source", `passthrough=${out.passthrough} ms=${elapsed} err=${run.errorText.slice(0, 160)}`);
    }
  }
}

console.log("=".repeat(70));
console.log(failed ? `${failed} FAILED` : `all ${checks} settings checks passed`);
process.exit(failed ? 1 : 0);
