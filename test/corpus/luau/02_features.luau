local health = 100
health -= 25
health += 10
print(health)
local msg = "hp"
msg ..= ":" .. tostring(health)
print(msg)
local total = 0
for i = 1, 10 do
  if i % 3 == 0 then continue end
  total += i
end
print(total)
local n = 5
local label = if n > 10 then "big" elseif n > 3 then "mid" else "small"
print(label)
local name = "world"
local count = 3
print(`hello {name}, count={count} and sum={1 + 2}`)
print(`escaped \` tick and \{ brace`)
local t: {[string]: number} = {}
t["a"] = 1
print(t.a)
local function apply<T>(f: (T) -> T, v: T): T
  return f(f(v))
end
print(apply(function(x: number) return x * 2 end, 3))
local readonly: {read name: string} = {name = "x"}
print(readonly.name)
type Result<T> = { ok: true, value: T } | { ok: false, error: string }
local function unwrap<T>(r: Result<T>): T?
  if r.ok then return (r :: {ok: true, value: T}).value end
  return nil
end
print(unwrap({ok = true, value = 7}))
print(unwrap({ok = false, error = "nope"}))
