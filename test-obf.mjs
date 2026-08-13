import { obfuscateLua } from "./src/lib/obfuscator.server.ts";
process.stdout.write(obfuscateLua(`
local function fib(n) if n<2 then return n end return fib(n-1)+fib(n-2) end
print("fib10="..fib(10))
local t={} for i=1,5 do t[i]=i*i end print(table.concat(t,","))
`));
