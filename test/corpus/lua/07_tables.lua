local t = {3, 1, 2}
table.sort(t)
print(table.unpack(t))
table.insert(t, 4)
table.remove(t, 1)
print(table.concat(t, "|"), #t)
local map = {}
for i = 1, 5 do map["k" .. i] = i * i end
local keys = {}
for k in pairs(map) do keys[#keys + 1] = k end
table.sort(keys)
print(table.concat(keys, ","))
local grid = {}
for i = 1, 3 do grid[i] = {} for j = 1, 3 do grid[i][j] = i * j end end
print(grid[2][3], grid[3][3])
local sparse = {[1] = "a", [5] = "e", [10] = "j"}
print(sparse[1], sparse[5], sparse[10], #sparse >= 1)
local nested = {a = {b = {c = {d = "deep"}}}}
print(nested.a.b.c.d)
local q = {n = 0}
function q.push(self, v) self.n = self.n + 1 self[self.n] = v end
q:push("x") q:push("y")
print(q.n, q[1], q[2])
local arr = {}
for i = 10, 1, -1 do arr[#arr + 1] = i end
print(arr[1], arr[#arr], #arr)
print(next({1}) ~= nil)
local copy = {}
for k, v in pairs({x = 1, y = 2}) do copy[k] = v end
print(copy.x, copy.y)
