import { _wrap, _guards } from "./src/lib/obfuscator.server.ts";
const inner = _wrap(new TextEncoder().encode(`print("ok")`), "core", "");
const mid = _wrap(new TextEncoder().encode(inner), "vm1", "");
const outer = _wrap(new TextEncoder().encode(mid), "vm2", _guards());
process.stdout.write(outer);  // NO minify
