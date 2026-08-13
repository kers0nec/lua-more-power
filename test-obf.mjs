import { obfuscateLua } from "./src/lib/obfuscator.server.ts";
const src = `print("hello luamore " .. (1+2)) local t={1,2,3,4,5} for _,v in ipairs(t) do print(v) end`;
const out = obfuscateLua(src);
console.error("SIZE:", out.length);
process.stdout.write(out);
