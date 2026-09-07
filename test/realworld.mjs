/**
 * End-to-end check against the Roblox scripts this project actually ships and
 * protects (`public/lua-more/scripts/*.lua`).
 *
 * The corpus in test/corpus is written by us; these files are not. They are
 * ~12 KB loading-screen GUIs that lean hard on the Roblox API, so the harness
 * supplies a permissive API surface — and, importantly, records every read of a
 * global that does not exist. A transform that corrupts a local into a global
 * shows up there even when the Roblox stubs would otherwise hide it.
 *
 * The packed loader ends in a top-level `return`, so nothing can be appended to
 * a build; the recorded globals are read back out of the VM instead.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const fengari = require("fengari");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;
const { obfuscateLuaDetailed } = await import("../src/lib/lua/obfuscate.ts");

// Permissive Roblox API surface, strict about undefined globals: every read of
// a global that does not exist is recorded, so if a transform turns a local
// into a global the build reads names the original never touched.
const ROBLOX = `
local function proxy(tag)
  local t = {}
  local mt = {}
  mt.__index = function(self, k)
    local key = tostring(k)
    local child = rawget(self, key)
    if child == nil then child = proxy(key); rawset(self, key, child) end
    return child
  end
  mt.__newindex = function() end
  mt.__call = function() return proxy("call") end
  mt.__add = function() return 0 end  mt.__sub = function() return 0 end
  mt.__mul = function() return 0 end  mt.__div = function() return 0 end
  mt.__mod = function() return 0 end  mt.__pow = function() return 0 end
  mt.__unm = function() return 0 end
  mt.__lt = function() return false end  mt.__le = function() return false end
  mt.__concat = function(a, b) return tostring(a) .. tostring(b) end
  mt.__tostring = function() return "<" .. tag .. ">" end
  mt.__len = function() return 0 end
  setmetatable(t, mt)
  return t
end
for _, name in ipairs({"game", "workspace", "Instance", "Enum", "Color3", "UDim", "UDim2",
  "Vector2", "Vector3", "CFrame", "TweenInfo", "syn", "NumberRange", "NumberSequence",
  "ColorSequence", "BrickColor", "task", "plugin"}) do
  _G[name] = proxy(name)
end
loadstring = load
getfenv = function() return _G end
tick = function() return 100 end
wait = function() end
spawn = function(f) return f() end
delay = function(_, f) return f() end
typeof = function(v) return type(v) end
warn = function() end
__UNKNOWN = {}
setmetatable(_G, { __index = function(_, k)
  local key = tostring(k)
  __UNKNOWN[key] = (__UNKNOWN[key] or 0) + 1
  return nil
end })
`;

const norm = (t) =>
  String(t)
    .replace(/\[string "[^"]*"\]:\d+/g, "[chunk]:N")
    .replace(/\bLuaMore:\d+/g, "[chunk]:N")
    .replace(/0x[0-9a-fA-F]+/g, "0xADDR");

function run(source) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  let out = "";
  lua.lua_register(L, to_luastring("print"), (st) => {
    const n = lua.lua_gettop(st);
    const parts = [];
    for (let i = 1; i <= n; i++) {
      lauxlib.luaL_tolstring(st, i);
      const v = lua.lua_tolstring(st, -1, null);
      parts.push(v ? to_jsstring(v) : "nil");
      lua.lua_pop(st, 1);
    }
    out += parts.join("\t") + "\n";
    return 0;
  });
  const code =
    "math.randomseed(20260907)\nlocal fixed=1700000000\nos.time=function() return fixed end\nos.clock=function() return 0.5 end\n" +
    ROBLOX +
    source;
  let status = lauxlib.luaL_loadstring(L, to_luastring(code));
  let err = "";
  if (status === lua.LUA_OK) status = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
  if (status !== lua.LUA_OK) {
    lauxlib.luaL_tolstring(L, -1);
    const e = lua.lua_tolstring(L, -1, null);
    err = e ? to_jsstring(e) : "error object";
  }
  // read the recorded unknown globals straight out of the VM: the packed
  // loader ends in a top-level `return`, so nothing can be appended to it
  const unknown = [];
  lua.lua_getglobal(L, to_luastring("__UNKNOWN"));
  if (lua.lua_istable(L, -1)) {
    lua.lua_pushnil(L);
    while (lua.lua_next(L, -2) !== 0) {
      const k = lua.lua_tolstring(L, -2, null);
      if (k) unknown.push(to_jsstring(k));
      lua.lua_pop(L, 1);
    }
  }
  lua.lua_close(L);
  return { sig: JSON.stringify({ out: norm(out), err: norm(err), unknown: unknown.sort() }) };
}

const dir = join(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "..",
  "public",
  "lua-more",
  "scripts",
);
let bad = 0;
for (const f of readdirSync(dir).sort()) {
  const src = readFileSync(`${dir}/${f}`, "utf8");
  const base = run(src);
  const built = run(obfuscateLuaDetailed(src, { preset: "strong", target: "luau", seed: 99 }).code);
  const same = base.sig === built.sig;
  if (!same) bad++;
  console.log(`${same ? "IDENTICAL" : "DIFFERS  "} ${f}`);
  if (!same) {
    console.log("   base :", base.sig.slice(0, 260));
    console.log("   built:", built.sig.slice(0, 260));
  }
}
console.log(
  bad
    ? `${bad} script(s) differ`
    : "all real shipping scripts behave identically after obfuscation",
);

process.exit(bad ? 1 : 0);
