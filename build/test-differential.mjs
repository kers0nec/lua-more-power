/* Differential test: original vs obfuscated behavior in a real Lua VM (fengari). */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fengari = require("fengari");
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;
import "./engine.js";
const LM12 = globalThis.LM12;

function luaRun(code, prelude) {
  const L = lua.lua_newstate();
  lualib.luaL_openlibs(L);
  lauxlib.luaL_dostring(L, to_luastring(`
    __OUT = {}
    print = function(...)
      local n = select('#', ...)
      local t = {}
      for i = 1, n do t[i] = tostring((select(i, ...))) end
      __OUT[#__OUT+1] = table.concat(t, '\\t')
    end
  `));
  if (prelude) lauxlib.luaL_dostring(L, to_luastring(prelude));
  const status = lauxlib.luaL_dostring(L, to_luastring(code));
  let err = null;
  if (status !== lua.LUA_OK) {
    err = lua.lua_tojsstring(L, -1);
  }
  lauxlib.luaL_dostring(L, to_luastring(`return table.concat(__OUT, '\\n')`));
  const out = lua.lua_tojsstring(L, -1);
  lua.lua_close(L);
  /* normalize chunk-name prefixes: the obfuscator intentionally hides the
     original source location (=LM chunkname), so [string "..."]:12 / LM:12
     prefixes are equivalent observable behavior */
  const norm = (t) => t.replace(/(?:\[string \"[^\"]*\"\]|LM):\d+:/g, "CHUNK:");
  return { out: norm(out), err: err ? norm(err) : null };
}

const CORPUS = [
  ["basics", `
local a, b = 10, 3
print(a + b, a * b, a / b, a % b, a ^ 2)
print("concat" .. "-" .. 42)
print(#"hello", 7 // 2, 7 % 3)
print(tostring(nil), tostring(true), tonumber("3.5") + 1)
`],
  ["closures", `
local function counter()
  local n = 0
  return function() n = n + 1 return n end
end
local c1, c2 = counter(), counter()
print(c1(), c1(), c1(), c2())
local fns = {}
for i = 1, 3 do fns[i] = function() return i * 100 end end
for i = 1, 3 do print(fns[i]()) end
`],
  ["varargs", `
print(...)
local function va(...)
  print(select('#', ...))
  local t = {...}
  return table.concat(t, ',')
end
print(va('x', 'y', 'z'))
local function pass(...) return ... end
print(pass('a', 'b'))
`],
  ["self-shadow", `
local t = t or {}
t.x = (t.x or 0) + 5
print(t.x)
local v = v or 7
print(v)
local cache = cache
if not cache then cache = {n = 1} end
print(cache.n)
`],
  ["local-global-collision", `
gvar = "global"
do
  local gvar = "local"
  print(gvar)
end
print(gvar)
local function setg() gvar = "changed" end
setg()
print(gvar)
local x = 1
local function outer()
  local x = 2
  local function inner() x = x + 10 return x end
  print(inner(), x)
end
outer()
print(x)
`],
  ["goto-labels", `
local i = 0
::top::
i = i + 1
if i < 3 then goto top end
print("i", i)
for k = 1, 5 do
  if k == 2 then goto continue end
  print("k", k)
  ::continue::
end
`],
  ["strings-escapes", `
print("tab\\there")
print("dec:\\65\\66\\67")
print("hex:\\x41\\x42")
print("uni:\\u{263A}")
print('single \\' quote')
local long = [[line1
line2 with ]] .. "inside" .. [[ more]]
print(long)
print("append" .. [[b]] .. 'c')
print(string.rep("ab", 3), string.upper("mixed"), string.sub("hello", 2, 4))
print(string.byte("AZ"), string.find("hello world", "world"))
print(("fmt %d %s %5.2f"):format(7, "str", 3.14159))
`],
  ["methods-oop", `
local Animal = {}
Animal.__index = Animal
function Animal.new(name)
  return setmetatable({name = name}, Animal)
end
function Animal:speak()
  return self.name .. " makes a sound"
end
local Dog = setmetatable({}, {__index = Animal})
Dog.__index = Dog
function Dog.new(name) local o = Animal.new(name) return setmetatable(o, Dog) end
function Dog:speak() return self.name .. " barks" end
local a = Animal.new("Generic")
local d = Dog.new("Rex")
print(a:speak())
print(d:speak())
print(getmetatable(d) == Dog)
`],
  ["loops", `
local n = 0
while true do n = n + 1 if n >= 4 then break end end
print("while", n)
local r = 0
repeat
  local q = r + 1
  r = q * 2
until r >= 10 or q > 100
print("repeat", r)
for i = 10, 1, -3 do print("for", i) end
local keys = {}
for k, v in pairs({a = 1, b = 2, c = 3}) do keys[#keys+1] = k end
table.sort(keys)
print(table.concat(keys, ","))
for w in string.gmatch("x,y,z", "[^,]+") do print("g", w) end
`],
  ["pcall-error", `
local ok, err = pcall(function() error("boom") end)
print(ok, (err:gsub(".*: ", "")))
local ok2, err2 = pcall(error, "plain", 0)
print(ok2, err2)
print(pcall(function() return 1, 2 end))
local function thrower() error({code = 42}) end
local ok3, e3 = pcall(thrower)
print(ok3, type(e3), e3.code)
print(select(2, pcall(function() local x = nil; return x.y end)))
`],
  ["table-libs", `
local t = {3, 1, 2}
table.sort(t)
print(table.concat(t, "|"))
table.insert(t, "z")
print(t[#t], #t)
print(math.max(1, 9, 3), math.min(-2, 5), math.floor(-1.5), math.ceil(-1.5))
print(math.abs(-7), math.sqrt(81), math.huge > 1e308)
print(string.format("%q", 'a"b'))
print(#table.pack(1, 2, 3))
`],
  ["sugar-calls", `
print'pass'
print [[pass2]]
local function twice(f) f() f() end
twice(function() __CNT = (__CNT or 0) + 1 end)
print(__CNT)
warn = nil
print'really pass'
`],
  ["keys-vs-locals", `
local x = "LOCAL"
local t = {x = "KEY", ["y"] = "KEYY", x2 = x}
print(t.x, t.y, t.x2)
t.x = x
print(t.x)
local tt = {}
tt.x = "field"
print(tt.x, x)
print(t["x"], t.x)
`],
  ["nested-shadow", `
local function f(a, b)
  local function g(a)
    return a * 2
  end
  return g(a) + g(b)
end
print(f(3, 4))
local a = 1
if true then
  local a = 2
  if true then
    local a = 3
    print(a)
  end
  print(a)
end
print(a)
`],
  ["numbers", `
print(0x10, 0xff, 0xA.8p0)
print(1e2, 1.5e-3, 2.5e308 > 1e308)
print(math.maxinteger, math.mininteger)
print(3 // 2, -3 // 2, 3.0 // 2)
print(10 % 3, -10 % 3, 10 % -3)
print(1 == 1.0, tostring(1), tostring(1.0))
print(0x7fffffffffffffff + 0)
`],
  ["multi-assign", `
local a, b, c = 1, 2
print(a, b, c)
a, b = b, a
print(a, b)
local function three() return 7, 8, 9 end
a, b, c = three()
print(a, b, c)
local t = {}
t.x, t.y = "X", "Y"
print(t.x, t.y)
local i = 0
local function inc() i = i + 1 return i end
t[inc()], t[inc()] = inc(), inc()
print(t[1], t[2], t[3], i)
`],
  ["luau-ish-build-only", `
local x = 5
x += 3
local t = {a = 1}
if x > 2 then
  for i = 1, 3 do
    if i == 2 then continue end
    print("luau", i)
  end
end
local s = "\u0060abc {x} def\u0060"
print(s, typeof and "t" or "f")
`],
];

const COMBOS = [
  ["defaults", {}],
  ["depth1-all", { vmDepth: 1 }],
  ["depth6", { vmDepth: 6 }],
  ["no-rename", { renameLocals: false }],
  ["no-strings", { stringEncryption: false }],
  ["no-cff-no-junk", { controlFlow: false, junkCode: false }],
  ["pure-transport", { antiTamper: false, antiEnvLog: false, antiDump: false, antiHook: false, renameLocals: false, stringEncryption: false, junkCode: false, controlFlow: false }],
  ["fast-probe", { envProbeLevel: "fast" }],
  ["depth2-seed", { vmDepth: 2, seed: 12345 }],
  ["depth3-seed", { vmDepth: 3, seed: 999 }],
];

let pass = 0, fail = 0;
const failures = [];
const execCorpus = CORPUS.filter(([name]) => name !== "luau-ish-build-only");

for (const [comboName, opts] of COMBOS) {
  for (const [name, code] of execCorpus) {
    const orig = luaRun(code);
    if (orig.err) { console.log(`SKIP ${name}: original errors: ${orig.err}`); continue; }
    let obf, res;
    try {
      const t0 = Date.now();
      obf = LM12.obfuscate(code, { ...opts });
      res = luaRun(obf.code);
      const ms = Date.now() - t0;
      if (res.out === orig.out && !res.err) {
        pass++;
        process.stdout.write(`.`);
      } else {
        fail++;
        failures.push({ combo: comboName, name, orig: orig.out, got: res.out, err: res.err });
        process.stdout.write("F");
      }
    } catch (e) {
      fail++;
      failures.push({ combo: comboName, name, buildError: e.message });
      process.stdout.write("E");
    }
  }
  process.stdout.write(`  [${comboName}]\n`);
}

/* build-only: luau syntax that fengari cannot execute */
{
  const [name, code] = CORPUS.find(c => c[0] === "luau-ish-build-only");
  for (const [comboName, opts] of [["defaults", {}], ["depth1", { vmDepth: 1 }]]) {
    try {
      const r = LM12.obfuscate(code, { ...opts });
      if (r.code.length > 0) { pass++; process.stdout.write("B"); }
    } catch (e) {
      fail++;
      failures.push({ combo: comboName + "-build", name, buildError: e.message });
      process.stdout.write("E");
    }
  }
  process.stdout.write("  [luau-build-only]\n");
}

/* determinism */
{
  const code = CORPUS[0][1];
  const a = LM12.obfuscate(code, { seed: 42 });
  const b = LM12.obfuscate(code, { seed: 42 });
  if (a.code === b.code) { pass++; process.stdout.write("D"); } else { fail++; failures.push({ name: "determinism" }); process.stdout.write("F"); }
  const c = LM12.obfuscate(code, { seed: 43 });
  if (c.code !== a.code) { pass++; process.stdout.write("D"); } else { fail++; failures.push({ name: "seed-variation" }); process.stdout.write("F"); }
  process.stdout.write("  [determinism]\n");
}

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log("\n=== FAILURES ===");
  for (const f of failures.slice(0, 12)) {
    console.log(JSON.stringify({ combo: f.combo, name: f.name, buildError: f.buildError, err: f.err && f.err.slice(0, 200) }));
    if (f.orig !== undefined) {
      console.log("  orig:", JSON.stringify(f.orig.slice(0, 160)));
      console.log("  got :", JSON.stringify((f.got || "").slice(0, 160)));
    }
  }
  process.exit(1);
}
