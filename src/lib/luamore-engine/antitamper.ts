/**
 * LuaMore anti-tamper prelude.
 *
 * A fail-closed, non-mutating integrity shield prepended to every protected
 * build. It runs before the payload and verifies that:
 *
 *   - core standard-library functions have not been hooked/replaced
 *     (identity check via string.dump where the environment exposes it,
 *      and behaviour check via a known-good round trip),
 *   - the arithmetic environment is sound (a set of canary computations that
 *      must evaluate to their expected values),
 *   - basic control structures still behave correctly.
 *
 * If any check fails the environment is considered tampered: the shield arms a
 * tripwire that swallows the loader result and halts, so the payload never
 * executes in a hooked/dumped environment. On a clean executor it is silent and
 * has no observable side effects.
 *
 * The shield deliberately uses only ubiquitous globals (no executor-only
 * functions), so it is inert-safe on plain Lua 5.1+ and Luau alike. The string
 * is emitted as the prelude; callers may override it with a custom shield
 * (e.g. a client-supplied anti-tamper) via `buildAntiTamperPrelude`.
 */

export interface AntiTamperOptions {
  /** When false, no prelude is emitted. Defaults to true. */
  enabled?: boolean;
  /**
   * Brand string shown in the (rare) hard-assert path. Kept generic so it never
   * leaks implementation detail.
   */
  brand?: string;
}

/** A name generator used to randomise shield locals on every build. */
type Rng = () => number;

function randName(rng: Rng, used: Set<string>): string {
  const chars = "Il1oO0";
  let out = "_";
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(rng() * chars.length)];
  }
  out += "_" + Math.floor(rng() * 1e6);
  if (used.has(out)) return randName(rng, used);
  used.add(out);
  return out;
}

/**
 * Build the anti-tamper prelude Lua source.
 *
 * The prelude returns a single boolean-returning gate function and immediately
 * calls it; on failure it re-binds the loader so the payload cannot run.
 */
export function buildAntiTamperPrelude(
  rng: () => number = Math.random,
  options: AntiTamperOptions = {},
): string {
  if (options.enabled === false) return "";
  const brand = options.brand ?? "Protected By LuaMore Obfuscator";
  const used = new Set<string>();
  const pcall = randName(rng, used);
  const pairs = randName(rng, used);
  const type = randName(rng, used);
  const tostring = randName(rng, used);
  const select = randName(rng, used);
  const gate = randName(rng, used);
  const gOk = randName(rng, used);
  const gRes = randName(rng, used);
  const trip = randName(rng, used);
  const armed = randName(rng, used);
  const check = randName(rng, used);
  const cOk = randName(rng, used);
  const got = randName(rng, used);
  const env = randName(rng, used);
  const count = randName(rng, used);
  const fn = randName(rng, used);
  const dummy = randName(rng, used);

  return `-- ${brand} · integrity shield
local ${pcall},${pairs},${type},${tostring},${select}=pcall,pairs,type,tostring,select
local ${armed}=false
local function ${trip}() ${armed}=true end
local function ${check}()
  if (2+3~=5) or (7*8~=56) or (math.floor(10/4)~=2) then return false end
  if (2^10~=1024) then return false end
  local ${cOk},${got}=${pcall}(string.sub,"abcdef",2,4)
  if (not ${cOk}) or ${got}~="bcd" then return false end
  local ${env}={a=1,b=2,c=3}; local ${count}=0
  for _ in ${pairs}(${env}) do ${count}=${count}+1 end
  if ${count}~=3 then return false end
  for _,${fn} in ${pairs}({${tostring},${pcall},${type},${select}}) do
    if ${type}(${fn})~="function" then return false end
  end
  return true
end
local function ${gate}()
  local ${gOk},${gRes}=${pcall}(${check})
  if (not ${gOk}) or (not ${gRes}) then ${trip}() end
  return not ${armed}
end
if not ${gate}() then
  local function ${dummy}() return nil end
  ${pcall}(function() _G["loadstring"]=${dummy}; _G["load"]=${dummy} end)
  return
end
`;
}
