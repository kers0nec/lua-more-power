print(#{} == 0)
print((nil or "default"))
print(false or nil or "fallback")
print(1 and 2, nil and 2, false and 2)
local function maybe() return nil end
print(maybe() or "dflt")
local t = {}
t[true] = "boolkey"
t[1] = "one"
t[1.0] = "floatone"
print(t[true], t[1], t[1.0])
print(rawget(t, 1), rawequal(1, 1.0))
local mt = {__index = function(t, k) return "miss:" .. tostring(k) end}
local p = setmetatable({}, mt)
print(p.anything, p.x)
local q = setmetatable({}, {__newindex = function(tbl, k, v) rawset(tbl, "set_" .. k, v) end})
q.foo = 1
print(q.foo, q.set_foo)
local s = "abc"
print(s == "abc", ("abc") == s)
print(tostring(1) .. tostring(2))
local function id(...) return ... end
print(id(1, 2, 3))
print(select(2, id("a", "b", "c")))
print((id(1, 2, 3)))
local big = string.rep("x", 1000)
print(#big)
print(math.maxinteger > 0, math.mininteger < 0)
print(9007199254740993 == 9007199254740992)
print(1 // 0 ~= nil or true)
