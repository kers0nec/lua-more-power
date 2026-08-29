-- ============================================================
--  LuaMore · pasteable loader (no loading bar)
--
--  Paste this as a LocalScript. Use the EXACT loader URL from
--  your dashboard (Dashboard → Scripts → your project → Copy
--  loader) — it carries the signed load marker (lsig) that
--  proves the request came from your page.
--
--  Keys stay in the loader URL: keyed scripts include
--  ?key=... and keyless scripts don't. Never hardcode a
--  license key in your game files.
-- ============================================================

_G.script_key = "YOUR_KEY"
loadstring(game:HttpGet(
	"https://www.luamore.win/v1/load/YOUR_PROJECT_ID?e=1&script=YOUR_SCRIPT&lsig=SIGNED_MARKER&key=" .. _G.script_key .. "&_cb=" .. os.clock(),
	true
))()
