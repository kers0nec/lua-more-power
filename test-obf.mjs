import { _wrap, _min } from "./src/lib/obfuscator.server.ts";
const inner = _wrap(new TextEncoder().encode(`print("ok inner")`), "core", "");
process.stdout.write(inner);
