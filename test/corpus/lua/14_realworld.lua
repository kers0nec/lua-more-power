-- Debounce/throttle + event emitter, the shape most game scripts take.
local EventEmitter = {}
EventEmitter.__index = EventEmitter
function EventEmitter.new()
  return setmetatable({handlers = {}}, EventEmitter)
end
function EventEmitter:on(name, fn)
  self.handlers[name] = self.handlers[name] or {}
  table.insert(self.handlers[name], fn)
  return self
end
function EventEmitter:off(name, fn)
  local list = self.handlers[name]
  if not list then return end
  for i = #list, 1, -1 do
    if list[i] == fn then table.remove(list, i) end
  end
end
function EventEmitter:emit(name, ...)
  local list = self.handlers[name]
  if not list then return 0 end
  local count = 0
  for _, fn in ipairs(list) do
    fn(...)
    count = count + 1
  end
  return count
end
local bus = EventEmitter.new()
local hits = {}
bus:on("tick", function(t) hits[#hits + 1] = "a:" .. t end)
local second = function(t) hits[#hits + 1] = "b:" .. t end
bus:on("tick", second)
bus:on("other", function() hits[#hits + 1] = "other" end)
print(bus:emit("tick", 1))
print(bus:emit("tick", 2))
bus:off("tick", second)
print(bus:emit("tick", 3))
print(bus:emit("missing"))
print(table.concat(hits, "|"))
local cache = setmetatable({}, {__mode = "k"})
local function memoize(fn)
  return function(k)
    local v = cache[k]
    if v == nil then v = fn(k) cache[k] = v end
    return v
  end
end
local calls = 0
local slow = memoize(function(n) calls = calls + 1 return n * n end)
print(slow(4), slow(4), calls)
local function clamp(v, lo, hi) return math.max(lo, math.min(hi, v)) end
print(clamp(50, 0, 10), clamp(-5, 0, 10), clamp(5, 0, 10))
