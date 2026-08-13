import { _wrap, _min } from "./src/lib/obfuscator.server.ts";
// Full pipeline but skip junk
function outerGuardsInline(){
  return `pcall(function()
    local dsm=(debug and debug.setmetatable) or nil
    local function g(t) if type(t)~="table" then return end pcall(function() pcall(setmetatable,t,nil) end) end
    pcall(g,_G)
  end)`;
}
const src=`print("ok")`;
const inner = _wrap(new TextEncoder().encode(src), "core", "");
const mid = _wrap(new TextEncoder().encode(inner), "vm1", "");
const outer = _wrap(new TextEncoder().encode(mid), "vm2", outerGuardsInline());
process.stdout.write(_min(outer));
