for i = 1, 3 do io.write(i) end
print("")
for i = 3, 1, -1 do io.write(i) end
print("")
for i = 1, 2, 0.5 do io.write(i .. ",") end
print("")
for i = 1, 0 do print("never") end
local sum = 0
for i = 1, 10 do if i % 2 == 0 then sum = sum + i end end
print(sum)
local n = 0
while n < 5 do n = n + 1 if n == 3 then goto continue end io.write(n) ::continue:: end
print("")
local m = 0
repeat m = m + 1 local limit = 4 until m >= limit
print(m)
for i = 1, 10 do if i > 3 then break end end
print("break ok")
local i = 1
while true do i = i + 1 if i > 4 then break end end
print(i)
for k, v in pairs({a = 1, b = 2}) do print(k .. "=" .. v) end
local arr = {10, 20, 30}
for idx, val in ipairs(arr) do print(idx, val) end
local x = 5
if x > 10 then print("big") elseif x > 3 then print("mid") else print("small") end
local count = 0
::top::
count = count + 1
if count < 3 then goto top end
print(count)
do
  local state = "a"
  while state ~= "done" do
    if state == "a" then state = "b"
    elseif state == "b" then state = "done"
    else state = "done" end
  end
  print(state)
end
