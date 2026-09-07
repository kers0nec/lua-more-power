-- A miniature serialiser: exercises recursion, tables, strings and types.
local function encode(v, seen)
  seen = seen or {}
  local tv = type(v)
  if tv == "nil" or tv == "boolean" then return tostring(v) end
  if tv == "number" then return tostring(v) end
  if tv == "string" then return '"' .. v:gsub('"', '\\"') .. '"' end
  if tv == "table" then
    if seen[v] then return '"<cycle>"' end
    seen[v] = true
    if #v > 0 or next(v) == nil then
      local parts = {}
      for i = 1, #v do parts[i] = encode(v[i], seen) end
      seen[v] = nil
      return "[" .. table.concat(parts, ",") .. "]"
    end
    local keys = {}
    for k in pairs(v) do keys[#keys + 1] = k end
    table.sort(keys, function(a, b) return tostring(a) < tostring(b) end)
    local parts = {}
    for _, k in ipairs(keys) do parts[#parts + 1] = '"' .. tostring(k) .. '":' .. encode(v[k], seen) end
    seen[v] = nil
    return "{" .. table.concat(parts, ",") .. "}"
  end
  return '"?' .. tv .. '"'
end
print(encode(1))
print(encode("hi"))
print(encode({1, 2, 3}))
print(encode({a = 1, b = {2, 3}}))
print(encode({}))
local cyc = {}
cyc.self = cyc
print(encode(cyc))
print(encode(true), encode(nil), encode(1.5))
