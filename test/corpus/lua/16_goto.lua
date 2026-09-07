local log = {}
local i = 0
::loop::
i = i + 1
log[#log + 1] = i
if i < 5 then goto loop end
print(table.concat(log, ","))
for a = 1, 3 do
  for b = 1, 3 do
    if a == b then goto nexta end
    log[#log + 1] = a * 10 + b
  end
  ::nexta::
end
print(#log)
local state = 1
local guard = 0
::start::
guard = guard + 1
if guard > 10 then goto done end
if state == 1 then state = 2 goto start
elseif state == 2 then state = 3 goto start
elseif state == 3 then state = 4 goto done
else goto done end
::done::
print(state, guard)
do
  local x = 0
  ::retry::
  x = x + 1
  if x < 3 then goto retry end
  print(x)
end
