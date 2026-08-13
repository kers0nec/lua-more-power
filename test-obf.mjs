import { _wrap } from "./src/lib/obfuscator.server.ts";
// Grab outerGuards via a hack - re-read the file's content, or reimplement.
// Easier: import via file and call obfuscateLua-like but skip _min.
// Let's inspect - use dynamic eval of the module source.
import fs from "fs";
const src = fs.readFileSync("src/lib/obfuscator.server.ts","utf8");
const m = src.match(/function outerGuards[\s\S]*?\n\}\n/);
console.log("guards fn length:", m?.[0].length);
