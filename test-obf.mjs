import { _wrap } from "./src/lib/obfuscator.server.ts";
const inner = _wrap(new TextEncoder().encode(`print("ok")`), "core", "");
const mid = _wrap(new TextEncoder().encode(inner), "vm1", "");
process.stdout.write(mid);
