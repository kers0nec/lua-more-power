local function add(a, b) return a + b end
print(add(2, 3))
local function multi() return 1, 2, 3 end
local p, q, r = multi()
print(p, q, r)
local function trunc() return (multi()) end
print(trunc())
local t = {multi()}
print(#t, t[1], t[2], t[3])
local t2 = {multi(), 9}
print(#t2, t2[1], t2[2])
local function vararg(...)
  local n = select("#", ...)
  local first = ...
  return n, first
end
print(vararg(1, 2, 3))
print(vararg())
local function counter()
  local c = 0
  return function() c = c + 1 return c end
end
local c1 = counter()
local c2 = counter()
c1() c1()
print(c1(), c2())
local function fib(n) if n < 2 then return n end return fib(n - 1) + fib(n - 2) end
print(fib(15))
local fact
fact = function(n) if n <= 1 then return 1 end return n * fact(n - 1) end
print(fact(10))
local function tailcall(n, acc) if n == 0 then return acc end return tailcall(n - 1, acc + n) end
print(tailcall(1000, 0))
