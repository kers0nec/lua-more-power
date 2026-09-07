local co = coroutine.create(function(a, b)
  coroutine.yield(a + b)
  coroutine.yield(a * b)
  return a - b
end)
print(coroutine.resume(co, 6, 3))
print(coroutine.resume(co))
print(coroutine.resume(co))
print(coroutine.status(co))
local gen = coroutine.wrap(function()
  for i = 1, 3 do coroutine.yield(i * 2) end
end)
local out = {}
for v in gen do out[#out + 1] = v end
print(table.concat(out, ","))
local ok, err = pcall(function()
  local c = coroutine.create(function() error("inside") end)
  local s, e = coroutine.resume(c)
  if not s then error(e) end
end)
print(ok, tostring(err):match("inside") ~= nil)
