import { obfuscateLua } from "./src/lib/obfuscator.server.ts";
// Only test the inner layer path — export the internal function
const mod = await import("./src/lib/obfuscator.server.ts");
console.log(Object.keys(mod));
