import { _wrap, _min } from "./src/lib/obfuscator.server.ts";
import { obfuscateLua } from "./src/lib/obfuscator.server.ts";
process.stdout.write(obfuscateLua(`print("ok")`));
