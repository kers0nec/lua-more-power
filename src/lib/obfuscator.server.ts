// LuaMore custom VM obfuscator.
// Wraps arbitrary Luau source in a bootstrap that:
//   - decrypts an XOR-encrypted payload (rotating key)
//   - executes via loadstring with a fresh fenv derived from getgenv()/getfenv()
//   - works in Roblox executors (bit32) and vanilla Lua 5.1+ (bit / fallback)
//
// Not a cryptographic guarantee — it's a real per-script bootstrap VM that
// defeats casual "view source" and simple hex dumps, and keeps the payload
// out of the plaintext response body.

function randByte(): number {
  return 1 + Math.floor(Math.random() * 254);
}
function randName(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let s = "_";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Encode bytes as a single Lua string literal using \ddd escapes. */
function encodePayload(enc: Uint8Array): string {
  // Chunked to keep V8 string ops cheap for very large scripts.
  const parts: string[] = [];
  const CHUNK = 8192;
  for (let i = 0; i < enc.length; i += CHUNK) {
    let s = "";
    const end = Math.min(i + CHUNK, enc.length);
    for (let j = i; j < end; j++) s += "\\" + enc[j];
    parts.push(s);
  }
  return parts.join("");
}

export function obfuscateLua(source: string): string {
  const bytes = new TextEncoder().encode(source);
  const keyLen = 32;
  const key: number[] = [];
  for (let i = 0; i < keyLen; i++) key.push(randByte());
  const enc = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) enc[i] = bytes[i] ^ key[i % keyLen];

  const G = randName();
  const E = randName();
  const K = randName();
  const D = randName();
  const X = randName();
  const T = randName();
  const F = randName();
  const R = randName();
  const S = randName();
  const J1 = randName();
  const J2 = randName();

  const payload = encodePayload(enc);
  const keyList = "{" + key.join(",") + "}";
  const stamp = Math.random().toString(36).slice(2, 10);

  // The bootstrap. Uses getgenv() when available (Roblox executors) so the
  // running script sees the same global environment as any normal exploit
  // script; falls back to _G everywhere else. setfenv is applied when the
  // runtime supports it so the payload's globals resolve against the exec env.
  return `--[[ LuaMore VM // build ${stamp} // do not edit ]]
local ${J1}=function() return nil end
local ${G}=(getgenv and getgenv()) or _G or _ENV
local ${E}=(getfenv and (function() local ok,e=pcall(getfenv,1) if ok then return e end end)()) or ${G}
local ${K}=${keyList}
local ${D}="${payload}"
local ${X}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,8 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${J2}=#${K}
local function ${T}()
  local o,kl,bt,sc={}, ${J2}, string.byte, string.char
  for i=1,#${D} do
    o[i]=sc(${X}(bt(${D},i), ${K}[((i-1) % kl)+1]))
  end
  return table.concat(o)
end
local ${S}=${T}()
local ${F},${R}=(loadstring or load)(${S},"=LuaMore")
if not ${F} then return error("[LuaMore VM] "..tostring(${R})) end
if setfenv then pcall(setfenv,${F},${E}) end
${J1}()
return ${F}()
`;
}
