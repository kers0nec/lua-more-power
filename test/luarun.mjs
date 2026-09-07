/**
 * Runs Lua source in an in-process Lua 5.3 VM (fengari) and captures
 * observable behaviour so two programs can be compared for equivalence.
 *
 * Everything that would legitimately differ between two runs of the *same*
 * program (table/function addresses, wall-clock time, RNG stream) is pinned or
 * normalised, so any remaining difference is a real behavioural difference.
 */

import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fengari = require("fengari");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

const PRELUDE = `
math.randomseed(20260907)
do
  local fixed = 1700000000
  os.time = function(t) if t then return fixed end return fixed end
  os.clock = function() return 0.5 end
  os.date = function(f) return "fixed-date" end
end
`;

export function normalize(text) {
  return (
    String(text)
      .replace(/0x[0-9a-fA-F]+/g, "0xADDR")
      // chunk line numbers legitimately move when the source is rewritten
      // chunk names/line numbers in error strings are not program semantics
      .replace(/\[string "[^"]*"\]:\d+/g, '[string "chunk"]:N')
      .replace(/\bLuaMore:\d+/g, '[string "chunk"]:N')
      .replace(/\r\n/g, "\n")
  );
}

export function runLua(source, { timeoutMs = 20_000, prelude = true } = {}) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);

  let out = "";
  const capture = (name) =>
    lua.lua_register(L, to_luastring(name), (state) => {
      const n = lua.lua_gettop(state);
      const parts = [];
      for (let i = 1; i <= n; i++) {
        lauxlib.luaL_tolstring(state, i);
        const v = lua.lua_tolstring(state, -1, null);
        parts.push(v ? to_jsstring(v) : "nil");
        lua.lua_pop(state, 1);
      }
      out += parts.join("\t") + "\n";
      return 0;
    });
  capture("print");

  const started = Date.now();
  const code = (prelude ? PRELUDE : "") + source;

  let status = lauxlib.luaL_loadstring(L, to_luastring(code));
  let errorText = "";
  if (status === lua.LUA_OK) {
    status = lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0);
  }
  if (status !== lua.LUA_OK) {
    lauxlib.luaL_tolstring(L, -1);
    const e = lua.lua_tolstring(L, -1, null);
    // error values can contain arbitrary bytes; keep the comparison total
    errorText = e
      ? to_jsstring(e).replace(/[\u0000-\u0008\u000e-\u001f\ud800-\udfff]/g, "?")
      : `error object (${typeof e})`;
  }
  lua.lua_close(L);

  return {
    ok: status === lua.LUA_OK,
    stdout: normalize(out),
    errorText: normalize(errorText),
    ms: Date.now() - started,
    timedOut: Date.now() - started > timeoutMs,
  };
}

/** Signature used to compare two runs. */
export function signature(result) {
  return JSON.stringify({ ok: result.ok, stdout: result.stdout, errorText: result.errorText });
}

export const __dirname = dirname(fileURLToPath(import.meta.url));
