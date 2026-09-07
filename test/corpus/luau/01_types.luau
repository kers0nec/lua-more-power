--!strict
type Point = { x: number, y: number }
type Shape = Circle | Square
type Circle = { kind: "circle", radius: number }
type Square = { kind: "square", side: number }
export type Callback<T> = (value: T) -> ()
type State = { count: number, items: {string}, nested: { [string]: number } }
type Fn = (a: number, b: number) -> (number, string)
local function distance(a: Point, b: Point): number
  local dx: number = a.x - b.x
  local dy = a.y - b.y
  return math.sqrt(dx * dx + dy * dy)
end
print(distance({x = 0, y = 0}, {x = 3, y = 4}))
local function describe(shape: Shape): string
  if shape.kind == "circle" then
    return "circle r=" .. tostring((shape :: Circle).radius)
  end
  return "square s=" .. tostring((shape :: Square).side)
end
print(describe({kind = "circle", radius = 2}))
print(describe({kind = "square", side = 3}))
local function identity<T>(value: T): T
  return value
end
print(identity(42), identity("str"))
local x: number? = nil
print(x)
local list: {number} = {1, 2, 3}
print(#list)
local function sum(list: {number}): number
  local total = 0
  for _, v in ipairs(list) do total += v end
  return total
end
print(sum(list))
