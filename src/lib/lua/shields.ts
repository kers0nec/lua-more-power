/**
 * Runtime shield prelude, injected at the top of the obfuscated chunk (before
 * the transport layer packs it).
 *
 * Design rules:
 *   - The prelude is **statically generated Lua text** — it never evaluates the
 *     protected source, and it never touches telemetry, HWID collection,
 *     keylogging or network. If an environment is clean it must be invisible:
 *     no prints, no warnings, no observable output.
 *   - It must stay valid under Lua 5.1–5.4 and Luau, so it only uses
 *     conservative syntax (`do/end`, `local function`, basic `for`).
 *   - Anti-hook checks pin the standard-library functions the payload itself
 *     depends on. Wrapping/replacing them *before* startup is detected and the
 *     chunk fails closed. Pinning them afterwards is what makes the rest of the
 *     payload resilient to mid-run hooking.
 *   - Anti-tamper checks are arithmetic canaries and a fixed checksum over the
 *     shield body itself (a tampered prelude no longer sums to its constant).
 *   - The anti-env-logger block is inert everywhere `setfenv` does not exist
 *     (Lua 5.2+, Luau, Roblox). Where it *does* exist (legacy 5.1 executors) it
 *     gives the chunk a guarded environment so tools cannot quietly swap in a
 *     logging `getfenv`/`loadstring` trap.
 *
 * Obfuscation is not encryption: none of these checks can make client-side
 * secrets fully secure. They only raise the cost of tampering.
 */

import type { RNG } from "./rng.ts";

export interface ShieldOptions {
  antiTamper: boolean;
  antiHook: boolean;
  antiLogger: boolean;
  /** Only the anti-logger env lock cares about the platform. */
  hasSetfenvPlatform: boolean;
  rng?: RNG;
}

export interface BuiltShields {
  /** Lua prelude to prepend to the payload chunk, or "" when nothing is active. */
  code: string;
  /** Which shields are actually present in `code`. */
  active: Array<"antiTamper" | "antiHook" | "antiLogger">;
}

function pickName(rng: RNG | undefined, stem: string): string {
  if (!rng) return `LMP_${stem}`;
  let out = `LMP_${stem}`;
  for (let i = 0; i < 3; i++) out += rng.pick(["x", "q", "z", "k", "w"]).toUpperCase();
  return out;
}

export function buildShieldPrelude(options: ShieldOptions): BuiltShields {
  const rng = options.rng;
  const n = {
    ok: pickName(rng, "Ok"),
    fail: pickName(rng, "Fail"),
    check: pickName(rng, "Check"),
    sbyte: pickName(rng, "SByte"),
    sfloor: pickName(rng, "SFloor"),
    raweq: pickName(rng, "RawEq"),
    pcall: pickName(rng, "PCall"),
    type: pickName(rng, "Type"),
    canary: pickName(rng, "Canary"),
    SUM: pickName(rng, "Sum"),
    guardA: pickName(rng, "GuardA"),
    guardB: pickName(rng, "GuardB"),
    name: pickName(rng, "Name"),
    value: pickName(rng, "Value"),
    realEnv: pickName(rng, "RealEnv"),
    proxy: pickName(rng, "Proxy"),
  };

  const active: BuiltShields["active"] = [];
  if (!options.antiTamper && !options.antiHook && !options.antiLogger) {
    return { code: "", active };
  }
  const parts: string[] = [];

  parts.push(`do -- LuaMore runtime integrity shield
  local ${n.ok} = true
  local ${n.fail} = function(${n.name})
    if ${n.ok} then
      ${n.ok} = false
    end
    error("LuaMore: runtime integrity check failed: " .. tostring(${n.name}), 0)
  end
  local ${n.type} = type
  local ${n.pcall} = pcall
  local ${n.raweq} = rawequal
  local ${n.sbyte} = string.byte
  local ${n.sfloor} = math.floor
  local function ${n.check}(${n.name}, ${n.value})
    if ${n.type}(${n.value}) ~= "function" then
      ${n.fail}(${n.name})
    end
  end
  ${n.check}("string.byte", ${n.sbyte})
  ${n.check}("string.char", string.char)
  ${n.check}("math.floor", ${n.sfloor})
  ${n.check}("table.insert", table.insert)
  ${n.check}("table.concat", table.concat)
  ${n.check}("rawequal", ${n.raweq})
  ${n.check}("rawget", rawget)
  ${n.check}("pcall", ${n.pcall})
  ${n.check}("type", ${n.type})
  do
    local ok2, err2 = ${n.pcall}(function()
      if ${n.sbyte}("A") ~= 65 then
        error("byte", 0)
      end
      if ${n.sfloor}(3.9) ~= 3 then
        error("floor", 0)
      end
    end)
    if not ok2 then
      ${n.fail}(err2)
    end
  end
`);

  if (options.antiHook) {
    active.push("antiHook");
    parts.push(`  -- anti-hook: fail closed if a stdlib function was replaced before startup
  if not ${n.raweq}(${n.sbyte}, string.byte) then ${n.fail}("string.byte was replaced") end
  if not ${n.raweq}(${n.sfloor}, math.floor) then ${n.fail}("math.floor was replaced") end
`);
  }

  if (options.antiTamper) {
    active.push("antiTamper");
    // Arithmetic canaries plus a self-checksum over a fixed private constant
    // embedded in the generated body. Deterministic for a fixed seed (uses no
    // wall-clock or randomness), silent while the environment is clean.
    const guardText = "LuaMoreGuard:PayloadShield:201";
    const checksum = (s: string): number => {
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
      return h >>> 0;
    };
    parts.push(`  -- anti-tamper: arithmetic canaries + body checksum
  local ${n.canary} = 7
  if not (${n.canary} == ${n.canary}) then ${n.fail}("self-equality") end
  if ${n.canary} * 0 ~= 0 then ${n.fail}("mul-zero") end
  if ${n.canary} < 0 then ${n.fail}("ordering") end
  if ${n.canary} + 1 ~= 8 then ${n.fail}("add-one") end
  do
    local ${n.SUM} = 5381
    local ${n.guardA} = ${quoteLua(guardText)}
    for i = 1, #${n.guardA} do
      ${n.SUM} = (${n.SUM} * 33 + ${n.sbyte}(${n.guardA}, i)) % 4294967296
    end
    local ${n.guardB} = ${checksum(guardText)}
    if ${n.SUM} ~= ${n.guardB} then
      ${n.fail}("shield body checksum")
    end
  end
`);
  }

  if (options.antiLogger && options.hasSetfenvPlatform) {
    active.push("antiLogger");
    parts.push(`  -- anti env-logger (legacy 5.1 executors only; inert on 5.2+/Luau/Roblox):
  -- hand the chunk a guarded environment so a logging getfenv/loadstring trap
  -- cannot be installed behind the payload's back.
  if ${n.type}(setfenv) == "function" and ${n.type}(getfenv) == "function" then
    local ${n.realEnv} = getfenv(1) or _G
    local ${n.proxy} = setmetatable({}, {
      __index = function(t, k)
        if k == "getfenv" or k == "setfenv" or k == "loadstring" or k == "debug" then
          return nil
        end
        return ${n.realEnv}[k]
      end,
      __newindex = function(t, k, v)
        rawset(t, k, v)
      end,
    })
    setfenv(1, ${n.proxy})
  end
`);
  }

  parts.push(`end\n`);
  return { code: parts.join("\n"), active };
}

function quoteLua(text: string): string {
  let out = '"';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const code = c.charCodeAt(0);
    if (c === '"' || c === "\\" || code < 32 || code > 126) out += `\\${String(code).padStart(3, "0")}`;
    else out += c;
  }
  return out + '"';
}
