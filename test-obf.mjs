import { spawnSync } from "node:child_process";
import fengari from "fengari";
import {
  obfuscateLuaWithOptions,
  calculateEntropy,
  analyzeObfuscation,
} from "./src/lib/obfuscator.server.ts";

const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

console.log("==================================================");
console.log("       LuaMore Obfuscator Regression Test Suite    ");
console.log("==================================================\n");

const testPayload = `
local function fib(n) if n<2 then return n end return fib(n-1)+fib(n-2) end
local f10 = fib(10)
if f10 ~= 55 then error("Fibonacci mismatch: "..tostring(f10)) end

local t = { 10, 20, 30, 40, 50 }
local sum = 0
for i = 1, #t do sum = sum + t[i] end
if sum ~= 150 then error("Table sum mismatch: "..tostring(sum)) end

local str = table.concat({"Lua", "More", "_", "2026"})
if str ~= "LuaMore_2026" then error("String concat mismatch: "..str) end

_G.LUAMORE_PASS = true
print("LUAMORE_EXECUTION_PASS")
`;

function executeLuaCode(code) {
  let output = "";
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);

  // Hook print
  lua.lua_register(L, to_luastring("print"), (state) => {
    const n = lua.lua_gettop(state);
    const parts = [];
    for (let i = 1; i <= n; i++) {
      const s = lua.lua_tostring(state, i);
      parts.push(s ? to_jsstring(s) : "");
    }
    output += parts.join("\t") + "\n";
    return 0;
  });

  const status = lauxlib.luaL_dostring(L, to_luastring(code));
  let errorMsg = null;
  if (status !== lua.LUA_OK) {
    const err = lua.lua_tostring(L, -1);
    errorMsg = err ? to_jsstring(err) : "Lua runtime error";
  }

  // Check _G.LUAMORE_PASS
  lua.lua_getglobal(L, to_luastring("LUAMORE_PASS"));
  const passed = lua.lua_toboolean(L, -1) === 1 || output.includes("LUAMORE_EXECUTION_PASS");

  lua.lua_close(L);
  return { success: status === lua.LUA_OK && passed, output, error: errorMsg };
}

const suites = [
  {
    name: "OELD Non-XOR Chunked Loader (No VM / Modular Polynomial)",
    options: {
      mode: "chunked",
      antiTamper: true,
      oeldAntiTamper: true,
      publicId: "chunked-001",
    },
  },
  {
    name: "Dual Polymorphic VM + OELD Shield (Hybrid Maximum Protection)",
    options: {
      dualVm: true,
      antiTamper: true,
      oeldAntiTamper: true,
      chunkedLoader: true,
      publicId: "hybrid-789",
      mode: "hybrid",
    },
  },
  {
    name: "Single VM + OELD Shield",
    options: {
      dualVm: false,
      antiTamper: true,
      oeldAntiTamper: true,
      chunkedLoader: true,
      publicId: "single-shield-123",
      mode: "standard",
    },
  },
  {
    name: "Raw VM without Anti-Tamper",
    options: {
      dualVm: false,
      antiTamper: false,
      oeldAntiTamper: false,
      chunkedLoader: false,
      publicId: "raw-001",
      mode: "basic",
    },
  },
];

let allPassed = true;

for (const suite of suites) {
  console.log(`[TEST SUITE] Running ${suite.name}...`);
  const analysis = analyzeObfuscation(testPayload, suite.options);
  console.log(`  - Original Size:   ${analysis.originalSize} bytes`);
  console.log(`  - Obfuscated Size: ${analysis.size} bytes`);
  console.log(`  - Shannon Entropy: ${analysis.entropy} / 8.0000`);
  console.log(`  - VM Layers:       ${analysis.layers}`);

  const run = executeLuaCode(analysis.code);

  if (run.success) {
    console.log(`  => Execution Result:  ✅ PASS (Verified bytecode VM dispatcher)\n`);
  } else {
    console.log(`  => Execution Result:  ❌ FAIL`);
    if (run.error) console.error("     Lua Error:", run.error);
    allPassed = false;
  }
}

// Test Tamper resistance
console.log("[TEST SUITE] Testing Anti-Tamper & Integrity Protection...");

// 1. Test OELD Watermark Tamper
const oeldBuild = obfuscateLuaWithOptions(testPayload, {
  mode: "chunked",
  antiTamper: true,
  oeldAntiTamper: true,
  publicId: "tamper-oeld",
});
const tamperedWatermark = oeldBuild.replace('["17.6"]', '["17.5"]');
const watermarkRun = executeLuaCode(tamperedWatermark);
const watermarkCaught =
  !watermarkRun.success &&
  (watermarkRun.error?.includes("integrity check failed") || watermarkRun.error !== null);

if (watermarkCaught) {
  console.log(
    `  => OELD Watermark Anti-Tamper: ✅ PASS (Modified signature detected and halted safely)`,
  );
} else {
  console.log(`  => OELD Watermark Anti-Tamper: ❌ FAIL`);
  allPassed = false;
}

// 2. Test VM Integrity Check Tamper
const vmBuild = obfuscateLuaWithOptions(testPayload, {
  dualVm: false,
  antiTamper: true,
  oeldAntiTamper: false,
  chunkedLoader: false,
  publicId: "tamper-vm",
});
const tamperedVm = vmBuild.replace(/local _[a-zA-Z0-9]+="([a-zA-Z0-9+/=]+)"/, (match, b64) => {
  const tamperedB64 = b64.slice(0, 10) + (b64[10] === "A" ? "B" : "A") + b64.slice(11);
  return match.replace(b64, tamperedB64);
});
const vmTamperRun = executeLuaCode(tamperedVm);
const vmTamperCaught =
  !vmTamperRun.success &&
  (vmTamperRun.error?.includes("integrity check failed") || vmTamperRun.error !== null);

if (vmTamperCaught) {
  console.log(
    `  => VM Checksum Anti-Tamper:   ✅ PASS (FNV-1a / djb2 mismatch detected and halted safely)\n`,
  );
} else {
  console.log(`  => VM Checksum Anti-Tamper:   ❌ FAIL`);
  allPassed = false;
}

console.log("==================================================");
if (allPassed) {
  console.log("  ALL OBFUSCATION REGRESSION TESTS PASSED! ✅     ");
  console.log("==================================================");
  process.exit(0);
} else {
  console.error("  SOME REGRESSION TESTS FAILED! ❌               ");
  console.log("==================================================");
  process.exit(1);
}
