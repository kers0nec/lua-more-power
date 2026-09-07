type Vector2 = { x: number, y: number }
local Vec = {}
Vec.__index = Vec
function Vec.new(x: number, y: number): Vector2
  return setmetatable({x = x, y = y}, Vec) :: Vector2
end
function Vec.add(a: Vector2, b: Vector2): Vector2
  return Vec.new(a.x + b.x, a.y + b.y)
end
function Vec.magnitude(v: Vector2): number
  return math.sqrt(v.x ^ 2 + v.y ^ 2)
end
local v = Vec.add(Vec.new(1, 2), Vec.new(3, 4))
print(v.x, v.y, Vec.magnitude(v))
local class = {}
class.__index = class
type Class = typeof(class)
function class.new(value: number)
  local self = setmetatable({}, class)
  self.value = value
  return self
end
function class:get(): number
  return self.value
end
function class:mutate(delta: number)
  self.value += delta
  return self
end
local inst = class.new(5)
inst:mutate(3)
print(inst:get())
local function loop(n: number): number
  local acc = 0
  for i = 1, n do
    if i % 2 == 0 then continue end
    acc += i
    if acc > 20 then break end
  end
  return acc
end
print(loop(100))
local template = `value is {inst:get()} and {`nested {1+1}`}`
print(template)
