import { _wrap } from "./src/lib/obfuscator.server.ts";
// Reproduce obfuscateLua w/o minify
function outerGuards(){return "";}  // no-op
const src=`print("ok")`;
const inner = _wrap(new TextEncoder().encode(src), "core", "");
const mid = _wrap(new TextEncoder().encode(inner), "vm1", "");
// need outerGuards from module
process.stdout.write(_wrap(new TextEncoder().encode(mid), "vm2", `pcall(function() end)`));
