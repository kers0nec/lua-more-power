import { obfuscateLua } from "./src/lib/obfuscator.server.ts";
const out = obfuscateLua(`print("ok")`);
process.stdout.write(out);
