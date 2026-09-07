local funcs = {}
for i = 1, 5 do funcs[i] = function() return i * i end end
for i = 1, 5 do io.write(funcs[i]() .. " ") end
print("")
local obj = {}
obj.value = 10
function obj:get() return self.value end
function obj:add(n) self.value = self.value + n return self end
print(obj:get())
obj:add(5):add(5)
print(obj:get())
local meta = {}
function meta.new(v) return setmetatable({v = v}, meta) end
meta.__index = meta
function meta:__add(o) return meta.new(self.v + o.v) end
function meta:__tostring() return "V:" .. tostring(self.v) end
function meta:__len() return self.v * 2 end
function meta:__call(x) return self.v + x end
function meta.__eq(a, b) return a.v == b.v end
local a = meta.new(3)
local b = meta.new(4)
local c = a + b
print(tostring(c), #c, c(100), a == b, a == meta.new(3))
local weak = setmetatable({}, {__mode = "v"})
weak.k = {}
print(type(weak.k))
