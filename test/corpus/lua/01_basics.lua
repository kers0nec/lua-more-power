local a, b = 1, 2
a, b = b, a
print(a, b)
local x = 10
do local x = 20 print(x) end
print(x)
local y = x
x = 99
print(y, x)
local s = "hello" .. " " .. "world"
print(s, #s)
print(1 .. 2 .. 3)
print(type(a), type(s), type(nil), type(print))
local t = {1, 2, 3, name = "bob", ["key"] = true}
print(t[1], t[2], t.name, t.key, #t)
t[#t + 1] = 4
print(#t, t[4])
print(7 / 2, 7 // 2, 7 % 2, -7 // 2, -7 % 2, 2 ^ 10)
print(0x10, 0xff, 1e3, 1.5e-2, .5)
print(10 == 10.0, "a" < "b", nil == false)
