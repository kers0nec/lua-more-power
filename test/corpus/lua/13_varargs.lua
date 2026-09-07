local function f(...) return {...}, select("#", ...) end
local t, n = f(1, nil, 3)
print(n, t[1], t[2], t[3])
local function g(a, ...) return a, select("#", ...) end
print(g(1, 2, 3))
print(g(1))
local h = function(...) local args = table.pack(...) return args.n, args[1] end
print(h(7, 8))
local function outer(...)
  local args = table.pack(...)
  local function inner() return args.n end
  return inner()
end
print(outer(1, 2, 3, 4))
local function concat(...)
  local parts = {...}
  local out = ""
  for i = 1, select("#", ...) do out = out .. tostring(parts[i]) end
  return out
end
print(concat("a", 1, true, nil, "z"))
local function map(list, fn)
  local out = {}
  for i = 1, #list do out[i] = fn(list[i], i) end
  return out
end
print(table.concat(map({1, 2, 3}, function(x, i) return x * i end), ","))
local function compose(f, g) return function(...) return f(g(...)) end end
local plus1 = function(x) return x + 1 end
local twice = function(x) return x * 2 end
print(compose(plus1, twice)(5))
