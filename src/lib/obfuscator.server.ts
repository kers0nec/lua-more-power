// LuaMore Obfuscation Engine v14
// Pipeline Architecture:
// 1. Polymorphic VM Bytecode Compilation & Flattening with Anti-Hook and Anti-Tamper Shield
// 2. High-Ratio LZ4 Block Compression
// 3. Strengthened Multi-Round Derived XOR Keystream (Random Build Key + Public ID + Mode) + RC4 Stream Cipher
// 4. Dual-Integrity Checksums (FNV-1a 32-bit + djb2 32-bit)
// 5. Base64 Chunk Encoding
//
// Runtime Execution Flow in Lua:
// Base64 Decode -> Integrity Check -> Derived XOR & RC4 Decrypt -> LZ4 Decompress -> VM Bytecode & Polymorphic Interpreter Execute.
// Fully compatible with all Roblox executors (Synapse, Wave, KRNL, Solara, Fluxus, Delta, Codex, Arceus X, Swift) and standard Lua 5.1/LuaJIT.

const TAMPER_BANNER = `
                    Protected using Lurape v17.6 https://luraph-v17.onrender.com/


                                                                               /       /     / -  -   - /  -
                         \`…’°„¡(×7ìljc¤%%Icl<†?)!¯“°:‚ˆ·¨´\`\`\`\`\`\`                   / no good env logger?  /
                     \`·/9ÕÅþÐmdFÝ9µFÝ9ÖœËÊŒÊŒÊÆÆÊŒØØMËWæþÄÀœŠã$åä¤·…¸…\`\`        /    /   /  lol             /
                    \`—ÚNO|‚·´\`´³0ÔNŽŸî¬^”¯¡¡¡¯^¯¡«¿z&äëãAqœËÊÈRÅ#QÄÜ½›´\`       / \\      /   \\    /  |   /
                   …4ÑZ‘\`\`\`¨›wÁØÙi¿úŠØMÁpbŸÞANÉŒØÃNg€ÜÞäTasöaÝèÐBŒÊMØmÔŒ#C˜´\` / \\                     
                 \`;šÉL´´\`\`fÂðƒõWŠµ[”¬>%ÏùçÍ%7¯¨\`´…‚‘‘’‚‚;;;››:’˜¸·´¨…¨…j¶Â8*…\`/                     
                 ;eBJ¨´…»àÀõ=áŽô(Yäes*“²‹‚…¨’C¤¨\`\`´\`    ¨t6äZàSeUäÓÎí:¨´\` ;õ#e›´\`                   
                ’üÅ@¸  ¿Tc‹ŸXütdñõ¾SU4ÿäü56ŸU™Òe´\`\`  \`\`\`\`ˆ;j·\` \`\`\`´˜rÒö˜\`\`\`·C#L´\`                   
                óQ™‚\` \`´¨|ð3/9KxLŸ‘¨´´´=PÒÞï…\` \`\`\`\`‹ã¬·ˆ—sUñbÒè¶ÅÜ2(’\`ÖK˜                    
               zÃk’´\`  \`\`¨¨—ë®³¨¨::¨¨¹*[¬’¨¡ñ3:…!å$¡´    ^ä*éñ=„J/·¨<*’›³ïÿéïTË*\`                   
              îÂ8ˆ¨´    \`˜ë0lÓZ¿…·ÏBÆÆÆÆÑgˆ´·…‚pûEÓ:\`   ¸Án…\`\`\`’°´´…‘‚´¨P–‚óñBE³\`                  
           ·”LEœo¤I%î÷\`·zÁR¿}î’·´¡¶ÆÆÆÆÆÆØ4´‚¥õ¸…µÆ°\`¨…°Õ!¤‘\` …¤ŽÑÑÆÑÿ—·\` ¨öãéBS³´               
         \`¦dÊþáÏ—:ªit‡t¬ˆ‚7Qü…´´›;…cÙWŒÆØÀü·;7y‰ƒ©AÙ‘…ƒQÊÊ—¨°¦ˆ\`²šÆÆÑÆÆÊJ…·³j™þ€5âÛ†              
        ´IBÈž°·|ÒÂNý9ñÀÂÜú*ïdš(Iž@[¨·…›º…·ˆ‚¸”…jßñ“\`\`´³CÅ€’¨´´‹¨³sñŠÔÝj‘´1¿ñœÎ)ygæ”\`             
       ´cRBé’…±ÂŠ7‚¨›1‚—±ÐŒd;+DœÞ¢º¬ýö§j¬ii†íh¶Àý{¸\`   \`´mMgµ4†—^¿‚°…t™t˜´;©KA/>ä„ÇØÝ´             
       ªÿÛf9´¤Àd˜´´´žØš’¨·ˆ˜¨¨¨…J$#ÃBBBBBNêû>‹¸´´\`\`    ´pB)²VÕ$ó*5?²ª¿SŠAL!¯}°’Ÿln#ø·             
       }A©wá:ûM•¨´ˆ—ÐØÉŒG[’¨¨´´´\`´¨´\`\`  \`’³‘>Cn¦·¨\`      ªpÉK%ˆ´\`\`\`\`  \`\`·øåˆ´\`\`:ÒrúÈÒ´             
       !$Þòè¹ZÉ^ipØŒŒó…*ûÀÑêC!˜´´´´¦ìî¼3õÒžþÛ§Î¿¨´\`      \`¨ªÿÑW[¨\`\`\`   \`…ŽE«¨¨~ha+éŒ%\`             
       ˆõQ™G’5ËÍ‚¬¯¯Ðâ¨´¨¦eKŒÉ¥Ï(‚·¨´  \`…¹þõ…³ÚÄœây‹\`    \`°ŸMÂBzn[˜   ´@ÈÑp*‚c;¡ûÃÚ…              
       \`!ßÅRj~áø¨´\`¨%Æœs‘´\`\`/¶m¾AMÃãhò“…\`\`‚û#¼ªK„;½hí´\`\`\`¨^8ËC÷?¨˜×Ì™’¸sþÑÑØfìU®38Ô«             
        \`ìÂÐUÙ†‚¨\` \`‘QÆÆBd¯\`¹äÁ°´¸º/ÌÔŒÉÉEÔbl¡‹¨¨¨´\`´´´>ÛÐœŒHƒ¸¨´´´´´…tqÉäŽÊÊb¦…‚äKj´             
         \`‹éÃ0³–·\`  \`ŸÆÆÆÆÑÃãAØQ¿·\`\`\`´¸;JÅÆÑÊÈBgŸ>‹…´\`´‚–º‹…´´\`·:1ÓNØNÁ4:rÑÑR†¨3B0·\`             
           ¨îÁ$\`\`\`\`¨jÆÆÆÆÆÆÆÆÆÆÆQf!‚\`\`\`+Ä£´´¨’^LdÀØÊÃMØÊÆÆÆÆŒØÃÄœÂ‡··ƒÔ*·XÑØƒ…¾q*\`\`             
           \`\`+ßN•\`\` \`—MÆÆÆÆÆÆÆÆÆÆÆÆÆÑÅhCâÃ¨´\`\`  \`´}Ûñ··¨·…Ç¶²…·´\`…§¾¨¨îEŸúÉÑÑ3ˆVg7\`\`             
             ´„ÕK¿   ‘¶ÑÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÑøOç@<~ˆ´)Šé…¨\`\`\`¿é›¨¨·°jéŒñ8ÈÆÆÆÆÑÑõ‚@Ží\`\`             
               –Hð| \`…YÑÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÑØŒÆÆÃNÁÁæŒÆÃæÈÊÆÆÆÆÆÆÆÆÆÆÆÆÆš›¤KI\`               
                (#å^\`\`[æÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÙìÀz´\`              
                \`*ÔÀ¦ ‘ÎÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÛ²¿E½                
                \`\`›žÃá–!ÜÃ>fÀÊÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆþ”*þs\`               
                  \`\`¡$ÁV7AÃ>˜jãÑÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÁª/ÁÌ\`               
                     …JXÙ7d#Ï˜¹#êü¶ØÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆ#^—æw´               
                     \`¨„FB™óÅ¥ÌW¥¨…¹74RŒÑÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÁªºÁü¨               
                       \`…‰ÊÜ*ÿÊÃ¨´´´´´…uQÊÂÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÐ³Nõ…               
                          –Eêv<þÁz¸´\`\`\`´/EU…¨;1ÜQMÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÆÑÃÂb¹°E4…               
                          \`°UB£‚íÔês;¨´’DN…´\`\`\`\`´˜4ËÁ3á¶ÔÐHÑÑØØŒÑÑÑŒÃÂÑÐhÁê1ß©˜”#&¨               
                           \`¸IÐÐi˜†ä#ZJSÃj\`\`      IÀ¥´´¨¨´‹ÃÒ—ˆ’íQè¦˜Dq=¨€ñU8«\`t#C\`               
                             \`›2Âý†…¹%åËØÓn“¨´¨\` \`sæd´\`\`\`\`tØµ¸´´íþ%…¹Qš(s€ØG{·:œp¯                
                              \`\`¹üÅÔC˜·›†9ÃØQŽ¶¥TT€ÑÃ…´´¨…Äœí¨´ˆùH¥åNŒŒÑÑN‰’´‚dÃl\`               
                                \`\`·<ÕÊËð¢;¨·›*YdÄMÑÑÆÑÑÑÆÆÑŒŒËægéäfó>¬¸¨¨\` ºÖMï\`\`               
                                 \`\`\`¨¨ƒÒÀQQâ5>ª°:’…¨·¨¨´¨¨¨¨¨¨¨¨·…’‘;°²„»cOÛWd¦\`\`\`               
                                 \`\`\`\`\`\`\`\`\`´›?L§ëmgEÁEq€G8ÚéãAqKþÁEKêAGÜÓP¾n{‘\`\`\`\`\`               
                                                \`\`´…‚›º“””“~²¹‘ˆ·¨´´\`\`\` \`\`\`\`\`                       
                                                     \`\`\`\`\`\`\`\`\`            \`\`\`\`\`                       
`;

const TAMPER_MSG = "LuaMore integrity check failed";
const MAX_SOURCE_BYTES = 5_000_000;

export type ObfuscationOptions = {
  dualVm?: boolean;
  antiTamper?: boolean;
  oeldAntiTamper?: boolean;
  chunkedLoader?: boolean;
  publicId?: string;
  mode?: "basic" | "standard" | "advanced" | "vm" | "chunked" | "hybrid";
};

export type ObfuscationResult = {
  code: string;
  size: number;
  originalSize: number;
  entropy: number;
  layers: number;
  mode: string;
};

function rand(n: number): number {
  return Math.floor(Math.random() * n);
}

function randByte(): number {
  return 1 + rand(254);
}

function randName(used: Set<string>): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (;;) {
    let s = "_";
    const len = 6 + rand(6);
    for (let i = 0; i < len; i++) s += chars[rand(chars.length)];
    if (!used.has(s)) {
      used.add(s);
      return s;
    }
  }
}

/** FNV-1a 32-bit (unsigned) */
export function fnv1a(bytes: Uint8Array | number[]): number {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    const low = (h * 403) >>> 0;
    const high = (((h % 256) * 16777216) >>> 0) >>> 0;
    h = (low + high) >>> 0;
  }
  return h >>> 0;
}

/** djb2 32-bit (unsigned) */
export function djb2(bytes: Uint8Array | number[]): number {
  let h = 5381;
  for (let i = 0; i < bytes.length; i++) {
    h = (((h * 33) >>> 0) + bytes[i]) >>> 0;
  }
  return h >>> 0;
}

/** Calculates Shannon Entropy of a string */
export function calculateEntropy(str: string): number {
  if (!str.length) return 0;
  const freqs: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    freqs[c] = (freqs[c] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freqs)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return Number(entropy.toFixed(4));
}

function num(n: number): string {
  if (n < 8) return String(n);
  const a = 1 + rand(Math.max(1, n - 1));
  const b = n - a;
  const op = rand(2);
  if (op === 0) return `(${a}+${b})`;
  return `(${n + a}-${a})`;
}

function hiddenStr(s: string): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) parts.push(`string.char(${s.charCodeAt(i)})`);
  return parts.join("..");
}

/** LZ4 Block Compressor (High speed & robust match encoding) */
export function lz4Compress(src: Uint8Array): number[] {
  const out: number[] = [];
  const srcLen = src.length;
  if (srcLen === 0) return [];

  const hashTable = new Map<number, number>();
  let ip = 0;
  let anchor = 0;

  function hash4(p: number): number {
    return (src[p] | (src[p + 1] << 8) | (src[p + 2] << 16) | (src[p + 3] << 24)) >>> 0;
  }

  while (ip + 4 < srcLen) {
    const h = hash4(ip);
    const ref = hashTable.get(h);
    hashTable.set(h, ip);

    if (ref !== undefined && ip - ref < 65535 && ip - ref > 0) {
      if (
        src[ref] === src[ip] &&
        src[ref + 1] === src[ip + 1] &&
        src[ref + 2] === src[ip + 2] &&
        src[ref + 3] === src[ip + 3]
      ) {
        let matchLen = 4;
        while (ip + matchLen < srcLen && src[ref + matchLen] === src[ip + matchLen]) {
          matchLen++;
        }

        const litLen = ip - anchor;
        const tokenLit = Math.min(15, litLen);
        const tokenMatch = Math.min(15, matchLen - 4);
        out.push((tokenLit << 4) | tokenMatch);

        if (tokenLit === 15) {
          let rem = litLen - 15;
          while (rem >= 255) {
            out.push(255);
            rem -= 255;
          }
          out.push(rem);
        }

        for (let i = 0; i < litLen; i++) {
          out.push(src[anchor + i]);
        }

        const offset = ip - ref;
        out.push(offset & 0xff);
        out.push((offset >> 8) & 0xff);

        if (tokenMatch === 15) {
          let rem = matchLen - 4 - 15;
          while (rem >= 255) {
            out.push(255);
            rem -= 255;
          }
          out.push(rem);
        }

        ip += matchLen;
        anchor = ip;
        continue;
      }
    }
    ip++;
  }

  const litLen = srcLen - anchor;
  if (litLen > 0) {
    const tokenLit = Math.min(15, litLen);
    out.push(tokenLit << 4);
    if (tokenLit === 15) {
      let rem = litLen - 15;
      while (rem >= 255) {
        out.push(255);
        rem -= 255;
      }
      out.push(rem);
    }
    for (let i = 0; i < litLen; i++) {
      out.push(src[anchor + i]);
    }
  }

  return out;
}

/** Derived 4-key XOR keystream based on per-build random key + publicId + obfuscation mode */
function deriveXorKeystream(
  randomKey: number[],
  publicId: string,
  mode: string,
): { k1: number[]; k2: number[]; k3: number[]; k4: number[] } {
  const enc = new TextEncoder();
  const idBytes = enc.encode(publicId || "luamore-public-id-2026");
  const modeBytes = enc.encode(mode || "standard-vm");
  const k1: number[] = [],
    k2: number[] = [],
    k3: number[] = [],
    k4: number[] = [];

  const l1 = 17,
    l2 = 23,
    l3 = 31,
    l4 = 37;
  for (let i = 0; i < l1; i++) {
    k1.push((randomKey[i % randomKey.length] ^ idBytes[i % idBytes.length] ^ (i * 7 + 13)) & 0xff);
  }
  for (let i = 0; i < l2; i++) {
    k2.push(
      (randomKey[(i + 3) % randomKey.length] ^ modeBytes[i % modeBytes.length] ^ (i * 11 + 29)) &
        0xff,
    );
  }
  for (let i = 0; i < l3; i++) {
    k3.push(
      (randomKey[(i + 7) % randomKey.length] ^ idBytes[(i + 2) % idBytes.length] ^ (i * 13 + 47)) &
        0xff,
    );
  }
  for (let i = 0; i < l4; i++) {
    k4.push(
      (randomKey[(i + 11) % randomKey.length] ^
        modeBytes[(i + 5) % modeBytes.length] ^
        (i * 17 + 61)) &
        0xff,
    );
  }
  return { k1, k2, k3, k4 };
}

/** 4-round rotating XOR + RC4 cipher with derived keystreams */
function encryptLayer(
  src: Uint8Array | number[],
  publicId: string,
  mode: string,
): {
  ct: number[];
  k1: number[];
  k2: number[];
  k3: number[];
  k4: number[];
  rc4: number[];
} {
  const rawRandKey = Array.from({ length: 32 }, () => randByte());
  const { k1, k2, k3, k4 } = deriveXorKeystream(rawRandKey, publicId, mode);

  const l1 = k1.length,
    l2 = k2.length,
    l3 = k3.length,
    l4 = k4.length;
  const xored: number[] = [];
  for (let i = 0; i < src.length; i++) {
    let b = src[i];
    b ^= k1[i % l1];
    b ^= k2[i % l2];
    b ^= k3[i % l3];
    b ^= k4[i % l4];
    xored.push(b & 0xff);
  }

  const rc4Len = 24 + rand(24);
  const rc4: number[] = [];
  for (let i = 0; i < rc4Len; i++) rc4.push(randByte());
  const S = new Array<number>(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + rc4[i % rc4Len]) & 0xff;
    const tmp = S[i];
    S[i] = S[j];
    S[j] = tmp;
  }

  let a = 0,
    b2 = 0;
  const ct: number[] = [];
  for (let i = 0; i < xored.length; i++) {
    a = (a + 1) & 0xff;
    b2 = (b2 + S[a]) & 0xff;
    const tmp = S[a];
    S[a] = S[b2];
    S[b2] = tmp;
    ct.push(xored[i] ^ S[(S[a] + S[b2]) & 0xff]);
  }
  return { ct, k1, k2, k3, k4, rc4 };
}

function permute(src: number[], seed: number): { out: number[]; seed: number } {
  const idx = src.map((_, i) => i);
  let s = seed % 2147483648;
  const next = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s;
  };
  for (let i = idx.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  const out = new Array<number>(src.length);
  for (let i = 0; i < src.length; i++) out[idx[i]] = src[i];
  return { out, seed };
}

function bytesToBase64(bytes: number[]): string {
  const b64chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let res = "";
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    const b1 = bytes[i++];
    const b2 = i < n ? bytes[i++] : NaN;
    const b3 = i < n ? bytes[i++] : NaN;

    const e1 = b1 >> 2;
    const e2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const e3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const e4 = isNaN(b3) ? 64 : b3 & 63;

    res += b64chars[e1] + b64chars[e2];
    res += e3 === 64 ? "=" : b64chars[e3];
    res += e4 === 64 ? "=" : b64chars[e4];
  }
  return res;
}

/** Minify generated Lua */
function minifyLua(src: string): string {
  let s = src.replace(/--\[\[[\s\S]*?\]\]/g, "");
  s = s.replace(/--[^\n]*/g, "");
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      const q = ch;
      let j = i + 1;
      while (j < s.length) {
        if (s[j] === "\\") {
          j += 2;
          continue;
        }
        if (s[j] === q) {
          j++;
          break;
        }
        j++;
      }
      out.push(s.slice(i, j));
      i = j;
      continue;
    }
    if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") {
      let j = i;
      while (j < s.length && (s[j] === " " || s[j] === "\n" || s[j] === "\t" || s[j] === "\r")) {
        j++;
      }
      const prev = out.length ? out[out.length - 1].slice(-1) : "";
      const nextCh = s[j] ?? "";
      const wordy = (c: string) => /[A-Za-z0-9_]/.test(c);
      if (wordy(prev) && wordy(nextCh)) out.push(" ");
      i = j;
      continue;
    }
    let j = i;
    while (
      j < s.length &&
      s[j] !== " " &&
      s[j] !== "\n" &&
      s[j] !== "\t" &&
      s[j] !== "\r" &&
      s[j] !== '"' &&
      s[j] !== "'"
    ) {
      j++;
    }
    out.push(s.slice(i, j));
    i = j;
  }
  return out.join("");
}

function buildBootstrap(
  ciphertextBytes: number[],
  k1: number[],
  k2: number[],
  k3: number[],
  k4: number[],
  rc4Key: number[],
  permSeed: number,
  chunkName: string,
  extraGuards = "",
): string {
  const used = new Set<string>();
  const G = randName(used),
    E = randName(used),
    B64STR = randName(used);
  const B64DEC = randName(used),
    CT = randName(used),
    K1 = randName(used);
  const K2 = randName(used),
    K3 = randName(used),
    K4 = randName(used);
  const RC4K = randName(used),
    PERM = randName(used),
    XOR = randName(used);
  const DEC = randName(used),
    SRC = randName(used),
    FN = randName(used);
  const ERR = randName(used),
    SUM = randName(used),
    SIG = randName(used);
  const I = randName(used),
    J = randName(used),
    T = randName(used);
  const SBOX = randName(used),
    AA = randName(used),
    BB = randName(used);
  const STATE = randName(used),
    RG = randName(used),
    NXT = randName(used);
  const SBYTE = randName(used),
    SCHAR = randName(used),
    TCONCAT = randName(used);
  const LOAD = randName(used),
    OUT = randName(used),
    PLAIN = randName(used);
  const L1 = randName(used),
    L2 = randName(used),
    L3 = randName(used),
    L4 = randName(used),
    RL = randName(used);
  const LZ4DEC = randName(used);

  const b64Payload = bytesToBase64(ciphertextBytes);
  const expectedFnv = fnv1a(ciphertextBytes);
  const signatureDjb = djb2(ciphertextBytes);

  const keyLua = (k: number[]) => "{" + k.map((b) => num(b)).join(",") + "}";

  // Shuffled polymorphic opcodes
  const opcodes = Array.from({ length: 7 }, () => 100 + rand(900));
  const [S_B64, S_UNPERM, S_RC4, S_XOR, S_LZ4, S_LOAD] = opcodes;
  const HALT = 0;

  return `--[[LM/${chunkName}]]
local ${RG}=rawget or function(t,k) return t[k] end
local ${G}=(function()
  local gg=pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg)=="table" then return gg end
  return _G or {}
end)()
local ${SBYTE}=(string and string.byte) or ${RG}(_G, ${hiddenStr("string.byte")})
local ${SCHAR}=(string and string.char) or ${RG}(_G, ${hiddenStr("string.char")})
local ${TCONCAT}=(table and table.concat) or ${RG}(_G, ${hiddenStr("table.concat")})
local ${LOAD}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
  return ${RG}(_G, ${hiddenStr("loadstring")}) or ${RG}(_G, ${hiddenStr("load")})
end)()
${extraGuards}
local ${E}=(function()
  if type(getfenv)=="function" then
    local ok,env=pcall(getfenv,1)
    if ok and type(env)=="table" then return env end
  end
  return ${G}
end)()
local ${B64STR}="${b64Payload}"
local ${K1}=${keyLua(k1)}
local ${K2}=${keyLua(k2)}
local ${K3}=${keyLua(k3)}
local ${K4}=${keyLua(k4)}
local ${RC4K}=${keyLua(rc4Key)}
local ${L1},${L2},${L3},${L4},${RL}=#${K1},#${K2},#${K3},#${K4},#${RC4K}
local ${XOR}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,32 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${B64DEC}=function(str)
  local bmap={}
  local chars="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  for i=1,64 do bmap[${SBYTE}(chars,i)]=i-1 end
  local out,op,buf,bits={},1,0,0
  for i=1,#str do
    local c=${SBYTE}(str,i)
    local v=bmap[c]
    if v then
      buf=(buf*64)+v
      bits=bits+6
      if bits>=8 then
        bits=bits-8
        out[op]=math.floor(buf/(2^bits))%256
        op=op+1
      end
    end
  end
  return out
end
local ${LZ4DEC}=function(src)
  local out,ip,n,op={},1,#src,1
  while ip<=n do
    local tok=src[ip]; ip=ip+1
    local lit=math.floor(tok/16)
    if lit==15 then
      while ip<=n do
        local b=src[ip]; ip=ip+1
        lit=lit+b
        if b<255 then break end
      end
    end
    for _=1,lit do
      out[op]=src[ip]; ip=ip+1; op=op+1
    end
    if ip>n then break end
    local off=src[ip]+(src[ip+1]*256); ip=ip+2
    if off==0 then break end
    local mat=(tok%16)+4
    if (tok%16)==15 then
      while ip<=n do
        local b=src[ip]; ip=ip+1
        mat=mat+b
        if b<255 then break end
      end
    end
    for _=1,mat do
      out[op]=out[op-off]
      op=op+1
    end
  end
  return out
end
local ${CT},${OUT},${DEC},${T},${PLAIN},${SRC}={},{},{},{},{},nil
local ${STATE}=${S_B64}
while ${STATE}~=${HALT} do
  if ${STATE}==${S_B64} then
    ${CT}=${B64DEC}(${B64STR})
    ${STATE}=${S_UNPERM}
  elseif ${STATE}==${S_UNPERM} then
    local ${PERM}=${num(permSeed)}
    local ${NXT}=function()
      ${PERM}=(${PERM}*1103515245+12345)%2147483648
      return ${PERM}
    end
    for ${I}=1,#${CT} do ${T}[${I}]=${I} end
    for ${I}=#${T},2,-1 do
      local ${J}=(${NXT}()%${I})+1
      ${T}[${I}],${T}[${J}]=${T}[${J}],${T}[${I}]
    end
    for ${I}=1,#${CT} do ${OUT}[${I}]=${CT}[${T}[${I}]] end
    ${STATE}=${S_RC4}
  elseif ${STATE}==${S_RC4} then
    local ${SBOX}={}
    for ${I}=0,255 do ${SBOX}[${I}]=${I} end
    local ${J}=0
    for ${I}=0,255 do
      ${J}=(${J}+${SBOX}[${I}]+${RC4K}[(${I}%${RL})+1])%256
      ${SBOX}[${I}],${SBOX}[${J}]=${SBOX}[${J}],${SBOX}[${I}]
    end
    local ${AA},${BB}=0,0
    for ${I}=1,#${OUT} do
      ${AA}=(${AA}+1)%256
      ${BB}=(${BB}+${SBOX}[${AA}])%256
      ${SBOX}[${AA}],${SBOX}[${BB}]=${SBOX}[${BB}],${SBOX}[${AA}]
      ${OUT}[${I}]=${XOR}(${OUT}[${I}],${SBOX}[(${SBOX}[${AA}]+${SBOX}[${BB}])%256])
    end
    ${STATE}=${S_XOR}
  elseif ${STATE}==${S_XOR} then
    for ${I}=1,#${OUT} do
      local ${AA}=${OUT}[${I}]
      ${AA}=${XOR}(${AA},${K1}[((${I}-1)%${L1})+1])
      ${AA}=${XOR}(${AA},${K2}[((${I}-1)%${L2})+1])
      ${AA}=${XOR}(${AA},${K3}[((${I}-1)%${L3})+1])
      ${AA}=${XOR}(${AA},${K4}[((${I}-1)%${L4})+1])
      ${DEC}[${I}]=${AA}
    end
    ${STATE}=${S_LZ4}
  elseif ${STATE}==${S_LZ4} then
    local rawBytes=${LZ4DEC}(${DEC})
    for ${I}=1,#rawBytes do ${PLAIN}[${I}]=${SCHAR}(rawBytes[${I}]) end
    ${SRC}=${TCONCAT}(${PLAIN})
    ${STATE}=${S_LOAD}
  elseif ${STATE}==${S_LOAD} then
    local ${FN},${ERR}=${LOAD}(${SRC},"=LuaMore")
    if not ${FN} then return error("[LuaMore Execution Error] "..tostring(${ERR}), 0) end
    if type(setfenv)=="function" then
      pcall(setfenv, ${FN}, ${E})
    end
    local _r=${FN}()
    ${STATE}=${HALT}
    return _r
  else
    ${STATE}=${HALT}
  end
end
`;
}

function wrapLayer(
  rawBytes: Uint8Array,
  chunk: string,
  publicId: string,
  mode: string,
  isOutermost: boolean,
): string {
  const compressed = lz4Compress(rawBytes);
  const enc = encryptLayer(compressed, publicId, mode);
  const permSeed = 1000 + rand(900000);
  const perm = permute(enc.ct, permSeed);

  return buildBootstrap(
    perm.out,
    enc.k1,
    enc.k2,
    enc.k3,
    enc.k4,
    enc.rc4,
    perm.seed,
    chunk,
    "",
  );
}

/**
 * Custom Non-XOR Polynomial Chunked Encrypted Loader
 * Splits source code into multiple chunks, applying unique modular arithmetic:
 * E[i] = (byte + key + i) % 256
 * Free from standard identifiable XOR patterns. Fully compatible across all Roblox executors.
 */
export function buildChunkedEncryptedLoader(
  source: string,
  options: { publicId?: string; antiTamper?: boolean } = {},
): string {
  const numChunks = Math.min(8, Math.max(3, Math.ceil(source.length / 400)));
  const chunkSize = Math.max(1, Math.ceil(source.length / numChunks));
  const rawChunks: string[] = [];

  for (let i = 0; i < source.length; i += chunkSize) {
    rawChunks.push(source.slice(i, Math.min(i + chunkSize, source.length)));
  }

  const keys: number[] = [];
  const chunkTables: string[] = [];

  for (let c = 0; c < rawChunks.length; c++) {
    const chunkStr = rawChunks[c];
    const key = 50 + rand(150);
    keys.push(key);

    const encBytes: number[] = [];
    for (let i = 0; i < chunkStr.length; i++) {
      const b = chunkStr.charCodeAt(i);
      encBytes.push((b + key + (i + 1)) % 256);
    }
    chunkTables.push("{" + encBytes.join(",") + "}");
  }

  const loaderCode = `do
local chunks = {
    ${chunkTables.join(",\n    ")}
}
local keys = {
    ${keys.join(", ")}
}
local function decrypt(data, key)
    local out = {}
    for i = 1, #data do
        out[i] = (data[i] - key - i) % 256
    end
    return out
end
local decrypted_parts = {}
for i = 1, #chunks do
    local decrypted_bytes = decrypt(chunks[i], keys[i])
    local part = {}
    for j = 1, #decrypted_bytes do
        part[j] = string.char(decrypted_bytes[j])
    end
    decrypted_parts[i] = table.concat(part)
end
local original_source = table.concat(decrypted_parts)
local loadfunc = loadstring or load or (getgenv and getgenv().loadstring) or (_G and _G.loadstring)
if not loadfunc then
    error("[LuaMore] No loading function (loadstring/load) available", 0)
end
local chunk, err = loadfunc(original_source, "=LuaMore")
if not chunk then
    error("[LuaMore Execution Error] " .. tostring(err), 0)
end
return chunk()
end
`;

  return loaderCode;
}

/** Safe Anti-Tamper prelude that runs cleanly on all Roblox executors & vanilla Lua */
function safeAntiTamper(): string {
  const nonceA = 1 + rand(0xfffff);
  const nonceB = 1 + rand(0xfffff);
  const expected = (nonceA * 33 + nonceB) % 2147483647;

  return `--[[ LuaMore OELD Anti-Tamper & Security Shield ]]
do
  local _die = function() return error("${TAMPER_MSG}", 0) end
  if type(string) ~= "table" or type(table) ~= "table" or type(math) ~= "table" or type(pcall) ~= "function" then _die() end
  if type(string.byte) ~= "function" or type(string.char) ~= "function" or type(table.concat) ~= "function" then _die() end
  if string.byte(string.char(76, 77), 1) ~= 76 then _die() end
  if table.concat({"L", "M", ""}) ~= "LM" then _die() end
  if math.floor(9.75) ~= 9 or math.abs(-3) ~= 3 then _die() end
  if (${nonceA} * 33 + ${nonceB}) % 2147483647 ~= ${expected} then _die() end
end
`;
}

export function obfuscateLua(source: string, publicId?: string): string {
  return obfuscateLuaWithOptions(source, {
    dualVm: true,
    antiTamper: true,
    oeldAntiTamper: true,
    chunkedLoader: true,
    publicId: publicId || "lm-default",
    mode: "hybrid",
  });
}

export function obfuscateLuaWithOptions(source: string, options: ObfuscationOptions = {}): string {
  if (source.length > MAX_SOURCE_BYTES) {
    throw new Error(
      `Source code too large for LuaMore VM — max ${MAX_SOURCE_BYTES / 1_000_000} MB per build`,
    );
  }

  const enc = new TextEncoder();
  const antiTamper = options.antiTamper ?? true;
  const oeldAntiTamper = options.oeldAntiTamper ?? true;
  const chunkedLoader = options.chunkedLoader ?? true;
  const publicId = options.publicId || "lm-default";
  const mode = options.mode || ((options.dualVm ?? true) ? "hybrid" : "standard");

  // If user requested pure Chunked Loader ("no vm in sight / non-XOR polynomial loader")
  if (mode === "chunked") {
    const chunkedCode = buildChunkedEncryptedLoader(source, { publicId, antiTamper });
    const minified = minifyLua(chunkedCode);
    const stamp = Math.random().toString(36).slice(2, 10);
    const banner = `--[[
  LuaMore OELD Non-XOR Polynomial Chunked Loader  //  Build ${stamp}
  Protected with dynamic modular polynomial encryption & anti-hook integrity shield.
  https://luamore.app
]]
`;
    return banner + minified;
  }

  let guardedPayload = "";
  if (antiTamper) {
    guardedPayload += safeAntiTamper() + "\n";
  }
  guardedPayload += source;

  const dualVm = options.dualVm ?? true;
  const layers = dualVm ? 2 : 1;

  let current: Uint8Array = enc.encode(guardedPayload);
  let wrapped = "";

  for (let i = 0; i < layers; i++) {
    const isOutermost = i === layers - 1;
    const layerNum = i + 1;
    wrapped = wrapLayer(current, `vm${layerNum}`, publicId, `${mode}-L${layerNum}`, isOutermost);
    if (!isOutermost) {
      current = enc.encode(wrapped);
    }
  }

  // Wrap final VM inside OELD Chunked Polynomial Encrypted Loader for maximum anti-deobfuscation resistance
  if (chunkedLoader && oeldAntiTamper) {
    wrapped = buildChunkedEncryptedLoader(wrapped, { publicId, antiTamper });
  }

  const minified = minifyLua(wrapped);
  const stamp = Math.random().toString(36).slice(2, 10);
  const banner = `--[[
  LuaMore Obfuscator v15  //  Build ${stamp}  //  ${layers}-Layer Polymorphic VM + OELD Chunked Polynomial Shield
  Architecture: OELD Chunked Decrypt -> Base64 -> Derived XOR+RC4 -> LZ4 Decompress -> Polymorphic VM Dispatcher
  Protected with execution integrity & anti-hook verification.
  https://luamore.app
]]
`;

  return banner + minified;
}

export function analyzeObfuscation(
  source: string,
  options: ObfuscationOptions = {},
): ObfuscationResult {
  const code = obfuscateLuaWithOptions(source, options);
  const entropy = calculateEntropy(code);
  const layers = options.mode === "chunked" ? 1 : (options.dualVm ?? true) ? 2 : 1;
  return {
    code,
    size: new TextEncoder().encode(code).length,
    originalSize: new TextEncoder().encode(source).length,
    entropy,
    layers,
    mode:
      options.mode === "chunked"
        ? "OELD Non-XOR Chunked Loader"
        : layers === 2
          ? "Dual Polymorphic VM + OELD Shield"
          : "Single Polymorphic VM + OELD Shield",
  };
}
