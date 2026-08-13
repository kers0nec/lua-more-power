import { obfuscateLua } from "./src/lib/obfuscator.server.ts";
process.stdout.write(obfuscateLua(`print("ok")`));
