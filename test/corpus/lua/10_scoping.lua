local v = 1
local function outer()
  local v = 2
  local function inner() return v end
  v = 20
  return inner(), v
end
print(outer(), v)
local t = {}
for i = 1, 3 do
  local captured = i
  t[i] = function() return captured end
end
print(t[1](), t[2](), t[3]())
local a = (function() local z = 5 return function() z = z + 1 return z end end)()
print(a(), a())
do local shadow = "inner" print(shadow) end
local list = {}
local i = 0
while i < 3 do i = i + 1 local item = i * 10 list[#list + 1] = item end
print(list[1], list[2], list[3])
local function recur(n)
  if n <= 0 then return 0 end
  local inner = function(m) return m * 2 end
  return inner(n) + recur(n - 1)
end
print(recur(4))
local g = 0
local function bump() g = g + 1 end
bump() bump()
print(g)
local function lettest()
  local a, b, c = 1, 2
  return a, b, c
end
print(lettest())
