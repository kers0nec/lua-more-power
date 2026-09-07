"use strict";var LMObfuscator=(()=>{var W=Object.defineProperty;var _e=Object.getOwnPropertyDescriptor;var fe=Object.getOwnPropertyNames;var pe=Object.prototype.hasOwnProperty;var he=(e,o)=>{for(var n in o)W(e,n,{get:o[n],enumerable:!0})},ge=(e,o,n,a)=>{if(o&&typeof o=="object"||typeof o=="function")for(let l of fe(o))!pe.call(e,l)&&l!==n&&W(e,l,{get:()=>o[l],enumerable:!(a=_e(o,l))||a.enumerable});return e};var me=e=>ge(W({},"__esModule",{value:!0}),e);var Ie={};he(Ie,{B85_ALPHABET:()=>T,analyzeObfuscation:()=>Ce,buildOELDChunkedLoader:()=>ie,calculateEntropy:()=>ce,encodeBase85:()=>le,obfuscateLua:()=>Ne,obfuscateLuaWithOptions:()=>F});function $(e){return Math.floor(Math.random()*e)}function x(){return 1+$(254)}function L(e,o){return e+Math.floor(Math.random()*(o-e+1))}var be=new Set(["and","break","do","else","elseif","end","false","for","function","if","in","local","nil","not","or","repeat","return","then","true","until","while","continue","export","type"]),ye=new Set(["game","workspace","script","Instance","Vector3","Vector2","Vector3int16","Vector2int16","CFrame","Color3","UDim2","UDim","BrickColor","Ray","RaycastParams","RaycastResult","TweenInfo","Enum","Faces","Axes","NumberRange","NumberSequence","NumberSequenceKeypoint","ColorSequence","ColorSequenceKeypoint","PhysicalProperties","Region3","Region3int16","Rect","Random","DateTime","Font","PathWaypoint","OverlapParams","task","debug","bit32","bit","table","string","math","os","coroutine","utf8","pcall","xpcall","setmetatable","getmetatable","rawget","rawset","rawequal","rawlen","type","typeof","tostring","tonumber","error","warn","print","select","next","pairs","ipairs","unpack","require","getfenv","setfenv","getgenv","getrenv","getsenv","getreg","loadstring","load","tick","time","elapsedTime","shared","_G","_VERSION","plugin","newproxy","gcinfo","delay","spawn","Wait","wait","UserSettings","settings","stats","Stats","version","collectgarbage","hookfunction","hookmetamethod","newcclosure","islclosure","iscclosure","checkcaller","getnamecallmethod","setnamecallmethod","identifyexecutor","getexecutorname"]);function ke(e){let o=[],n=0,a=e.length;for(;n<a;){if(/\s/.test(e[n])){let t=n;for(;t<a&&/\s/.test(e[t]);)t++;o.push({type:"WHITESPACE",value:e.slice(n,t),raw:e.slice(n,t)}),n=t;continue}if(e[n]==="-"&&e[n+1]==="-"){let t=n+2;if(e[t]==="["&&(e[t+1]==="["||e[t+1]==="=")){let r=0,d=t+1;for(;e[d]==="=";)r++,d++;if(e[d]==="["){let i="]"+"=".repeat(r)+"]",g=e.indexOf(i,d+1);g!==-1?t=g+i.length:t=a}}else for(;t<a&&e[t]!==`
`&&e[t]!=="\r";)t++;o.push({type:"COMMENT",value:e.slice(n,t),raw:e.slice(n,t)}),n=t;continue}if(e[n]==='"'||e[n]==="'"){let t=e[n],r=n+1;for(;r<a;){if(e[r]==="\\"){r+=2;continue}if(e[r]===t){r++;break}r++}let d=e.slice(n,r),i=d.slice(1,-1);try{i=i.replace(/\\n/g,`
`).replace(/\\t/g,"	").replace(/\\r/g,"\r").replace(/\\"/g,'"').replace(/\\'/g,"'").replace(/\\\\/g,"\\")}catch{}o.push({type:"STRING",value:i,raw:d}),n=r;continue}if(e[n]==="["&&(e[n+1]==="["||e[n+1]==="=")){let t=0,r=n+1;for(;e[r]==="=";)t++,r++;if(e[r]==="["){let d="]"+"=".repeat(t)+"]",i=e.indexOf(d,r+1),g=i!==-1?i+d.length:a,_=e.slice(n,g),s=_.slice(2+t,i!==-1?_.length-(2+t):void 0);o.push({type:"STRING",value:s,raw:_}),n=g;continue}}if(/[0-9]/.test(e[n])||e[n]==="."&&/[0-9]/.test(e[n+1]||"")){let t=n;if(e[t]==="0"&&(e[t+1]==="x"||e[t+1]==="X"))for(t+=2;t<a&&/[0-9a-fA-F]/.test(e[t]);)t++;else{for(;t<a&&/[0-9]/.test(e[t]);)t++;if(e[t]===".")for(t++;t<a&&/[0-9]/.test(e[t]);)t++;if(e[t]==="e"||e[t]==="E")for(t++,(e[t]==="+"||e[t]==="-")&&t++;t<a&&/[0-9]/.test(e[t]);)t++}o.push({type:"NUMBER",value:e.slice(n,t),raw:e.slice(n,t)}),n=t;continue}if(/[a-zA-Z_]/.test(e[n])){let t=n;for(;t<a&&/[a-zA-Z0-9_]/.test(e[t]);)t++;let r=e.slice(n,t);be.has(r)?o.push({type:"KEYWORD",value:r,raw:r}):o.push({type:"NAME",value:r,raw:r}),n=t;continue}let l=e.slice(n,n+2),c=e.slice(n,n+3);if(c==="..."||c==="..="){o.push({type:"PUNCT",value:c,raw:c}),n+=3;continue}if(["==","~=","<=",">=","..","+=","-=","*=","/=","%=","^="].includes(l)){o.push({type:"PUNCT",value:l,raw:l}),n+=2;continue}o.push({type:"PUNCT",value:e[n],raw:e[n]}),n++}return o}function $e(e,o){let n=["l","I","1","o","O","0"],a=e*9301+49297^o.length*1337,l="_";for(let c=0;c<8;c++){let t=Math.abs(a%n.length);l+=n[t],a=Math.floor(a/7)^23130}return l+"_"+e}function ve(e){let o=new Map,n=[],a=0,l=Math.random().toString(36).slice(2),c=[],t=e.filter(r=>r.type!=="WHITESPACE"&&r.type!=="COMMENT");for(let r=0;r<e.length;r++){let d=e[r],i=null;for(let _=r-1;_>=0;_--)if(e[_].type!=="WHITESPACE"&&e[_].type!=="COMMENT"){i=e[_];break}let g=null;for(let _=r+1;_<e.length;_++)if(e[_].type!=="WHITESPACE"&&e[_].type!=="COMMENT"){g=e[_];break}if(d.type==="NAME"){let _=i&&(i.value==="."||i.value===":"),s=g&&g.value==="="&&i&&(i.value==="{"||i.value===","),p=ye.has(d.value);if(!_&&!s&&!p&&(i&&(i.value==="local"||i.value==="function"||i.value==="for"||i.value===",")&&(o.has(d.value)||(a++,o.set(d.value,$e(a,l)))),o.has(d.value))){c.push({type:"NAME",value:o.get(d.value),raw:o.get(d.value)});continue}}c.push(d)}return{tokens:c,stringTable:n}}function Me(e){let o=[],n=new Map,a=L(30,220),l=L(15,240),c=[];for(let s of e)if(s.type==="STRING"&&s.value.length>0){let p;n.has(s.value)?p=n.get(s.value):(p=o.length,o.push(s.value),n.set(s.value,p)),c.push({type:"NAME",value:`_LM_STR(${p})`,raw:`_LM_STR(${p})`})}else c.push(s);if(o.length===0)return{tokens:e,decoderRuntime:""};let t=[],r=[],d=[],i=new TextEncoder;for(let s of o){let p=i.encode(s);r.push(t.length),d.push(p.length);for(let h=0;h<p.length;h++){let b=((p[h]^l)+a+h)%256;t.push(b)}}let _=`
local _LM_CACHE = {}
local _LM_DATA = "${t.map(s=>"\\"+String(s).padStart(3,"0")).join("")}"
local _LM_OFFSETS = {${r.map(s=>s+1).join(",")}}
local _LM_LENS = {${d.join(",")}}
local _LM_BYTE = string.byte
local _LM_CHAR = function(x)
  if type(x) == "number" then
    return string.char(math.floor(x) % 256)
  end
  return ""
end
local _LM_XOR = (bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,8 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end

local function _LM_STR(idx)
  local id = idx + 1
  if _LM_CACHE[id] then return _LM_CACHE[id] end
  local offset = _LM_OFFSETS[id]
  local len = _LM_LENS[id]
  if not offset or not len or len <= 0 then return "" end
  local res = {}
  for i = 1, len do
    local b = _LM_BYTE(_LM_DATA, offset + i - 1)
    if b then
      local dec = ((b - ${a} - (i - 1)) % 256 + 256) % 256
      dec = _LM_XOR(dec, ${l})
      res[i] = _LM_CHAR(dec)
    else
      res[i] = ""
    end
  end
  local str = table.concat(res)
  _LM_CACHE[id] = str
  return str
end
`;return{tokens:c,decoderRuntime:_}}function Ee(e){let o=L(1e3,9999),n=L(1e4,99999),a=L(1e5,999999),l=0;return`
local _lm_state = ${o}
while _lm_state ~= ${l} do
  if _lm_state == ${o} then
    _lm_state = ${n}
  elseif _lm_state == ${n} then
    ${e}
    _lm_state = ${a}
  elseif _lm_state == ${a} then
    _lm_state = ${l}
  else
    _lm_state = ${l}
  end
end
`}var ae={OP_LOADK:1,OP_GETGLOBAL:2,OP_SETGLOBAL:3,OP_GETTABLE:4,OP_SETTABLE:5,OP_CALL:6,OP_METHODCALL:7,OP_NEWTABLE:8,OP_BINOP:9,OP_UNOP:10,OP_JUMP:11,OP_JUMP_IF:12,OP_RETURN:13,OP_VARARG:14,OP_EXEC_NATIVE:15};function we(e,o){let n={},a=new Set;for(let p=1;p<=15;p++){let h=L(100,899);for(;a.has(h);)h=L(100,899);a.add(h),n[p]=h}let l=ke(e),{tokens:c}=ve(l),{tokens:t,decoderRuntime:r}=Me(c),d="";for(let p of t)p.type!=="COMMENT"&&(d+=p.raw);r&&(d=r+`
`+d),(o.controlFlowFlattening??!0)&&(d=Ee(d));let i=f(new Set),g=f(new Set),_=f(new Set),s=f(new Set);return`
--[[ LuaMore Register Virtual Machine ]]
local ${g} = (function()
  local gg = pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg) == "table" then return gg end
  return _G or {}
end)()

local function _LM_VM_RUN()
  local ${_} = {}
  local ${i} = ${n[ae.OP_EXEC_NATIVE]}
  while ${i} ~= 0 do
    if ${i} == ${n[ae.OP_EXEC_NATIVE]} then
      ${d}
      ${i} = 0
    else
      ${i} = 0
    end
  end
end

return _LM_VM_RUN()
`}function Te(e){let o=[],n=0,a=e.length;for(;n<a;){let l=1;for(;l<129&&n+l<a&&e[n+l]===e[n];)l++;if(l>=3)o.push(128|l-2),o.push(e[n]&255),n+=l;else{let c=n,t=0;for(;n<a&&t<128;){let r=1;for(;r<3&&n+r<a&&e[n+r]===e[n];)r++;if(r>=3&&t>0)break;n++,t++}if(t>0){o.push(t-1&255);for(let r=0;r<t;r++)o.push(e[c+r]&255)}else o.push(0),o.push(e[n]&255),n++}}return o}function Le(e){let o=[],n=[],a=[],l=[],c=19+$(16),t=23+$(16),r=29+$(16),d=37+$(16);for(let u=0;u<c;u++)o.push(x());for(let u=0;u<t;u++)n.push(x());for(let u=0;u<r;u++)a.push(x());for(let u=0;u<d;u++)l.push(x());let i=[];for(let u=0;u<e.length;u++){let m=e[u];m^=o[u%c],m^=n[u%t],m^=a[u%r],m^=l[u%d],i.push(m&255)}let g=32+$(16),_=[];for(let u=0;u<g;u++)_.push(x());let s=new Array(256);for(let u=0;u<256;u++)s[u]=u;let p=0;for(let u=0;u<256;u++){p=p+s[u]+_[u%g]&255;let m=s[u];s[u]=s[p],s[p]=m}let h=0,v=0,b=[];for(let u=0;u<i.length;u++){h=h+1&255,v=v+s[h]&255;let m=s[h];s[h]=s[v],s[v]=m,b.push(i[u]^s[s[h]+s[v]&255])}return{ct:b,k1:o,k2:n,k3:a,k4:l,rc4:_}}function Se(e,o){let n=e.length;if(n<=1)return{out:e.slice(),seed:o};let a=o%65536,l=()=>(a=(a*25173+13849)%65536,a),c=new Array(n);for(let r=0;r<n;r++)c[r]=r;for(let r=n-1;r>0;r--){let d=l()%(r+1),i=c[r];c[r]=c[d],c[d]=i}let t=new Array(n);for(let r=0;r<n;r++)t[r]=e[c[r]];return{out:t,seed:o}}function Ae(e){let o=[];for(let n=0;n<e.length;n+=4096){let a="",l=Math.min(n+4096,e.length);for(let c=n;c<l;c++){let t=(e[c]%256+256)%256;a+="\\"+String(t).padStart(3,"0")}o.push(a)}return o.join("")}function Oe(e,o){let n=Math.max(1,Math.ceil(e.length/o)),a=[];for(let l=0,c=0;l<e.length;l+=n,c++)a.push({idx:c,data:e.slice(l,l+n)});for(let l=a.length-1;l>0;l--){let c=$(l+1),t=a[l];a[l]=a[c],a[c]=t}return a}function f(e){let o="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(;;){let n="_",a=6+$(6);for(let l=0;l<a;l++)n+=o[$(o.length)];if(!e.has(n))return e.add(n),n}}function G(e){if(e<8)return String(e);let o=1+$(Math.max(1,e-1)),n=e-o,a=$(3);return a===0?`(${o}+${n})`:a===1?`(${e+o}-${o})`:`(${o}*1+${n})`}function P(e){let o=[];for(let n=0;n<e.length;n++)o.push(`string.char(${e.charCodeAt(n)})`);return o.join("..")}function Re(e,o,n,a,l,c,t,r,d=""){let i=new Set,g=f(i),_=f(i),s=f(i),p=f(i),h=f(i),v=f(i),b=f(i),u=f(i),m=f(i),D=f(i),B=f(i),V=f(i),j=f(i),K=f(i),X=f(i),q=f(i),z=f(i),J=f(i),S=f(i),y=f(i),O=f(i),E=f(i),A=f(i),M=f(i),N=f(i),w=f(i),k=f(i),C=f(i),Y=f(i),se=6+$(8),Z=Oe(e,se),U="{";for(let I of Z)U+=`[${G(I.idx)}]="${Ae(I.data)}",`;U+=`n=${G(Z.length)}}`;let R=I=>"{"+I.map(ue=>G(ue)).join(",")+"}",de=Array.from({length:7},()=>100+$(900)),[Q,ee,ne,te,oe,re]=de,H=0;return`--[[LM/${r}]]
local ${s}=rawget or function(t,k) return t[k] end
local ${g}=(function()
  local gg=pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg)=="table" then return gg end
  return _G or {}
end)()
local ${p}=(string and string.byte) or ${s}(_G, ${P("string.byte")})
local _raw_char=(string and string.char) or ${s}(_G, ${P("string.char")})
local ${h}=function(x)
  if type(x)=="number" and type(_raw_char)=="function" then
    return _raw_char(math.floor(x)%256)
  end
  return ""
end
local ${v}=(table and table.concat) or ${s}(_G, ${P("table.concat")})
local ${b}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
  return ${s}(_G, ${P("loadstring")}) or ${s}(_G, ${P("load")})
end)()
${d}
local ${_}=(function()
  if type(getfenv)=="function" then
    local ok,env=pcall(getfenv,1)
    if ok and type(env)=="table" then return env end
  end
  return ${g}
end)()
local ${u}=${U}
local ${m}=${R(o)}
local ${D}=${R(n)}
local ${B}=${R(a)}
local ${V}=${R(l)}
local ${j}=${R(c)}
local ${K},${X},${q},${z},${J}=#${m},#${D},#${B},#${V},#${j}
local ${S}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,8 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${O},${E},${A},${M},${N},${w}={},{},{},{},{},nil
local ${y}=${Q}
while ${y}~=${H} do
  if ${y}==${Q} then
    local _ptr=1
    for _ci=0,${u}.n-1 do
      local _chk=${u}[_ci]
      if _chk then
        for _bi=1,#_chk do ${O}[_ptr]=${p}(_chk,_bi); _ptr=_ptr+1 end
      end
    end
    ${y}=${ee}
  elseif ${y}==${ee} then
    local ${C}=${G(t%65536)}
    local ${Y}=function()
      ${C}=(${C}*25173+13849)%65536
      return ${C}
    end
    for _i=1,#${O} do ${M}[_i]=_i end
    for _i=#${M},2,-1 do
      local _j=(${Y}()%_i)+1
      ${M}[_i],${M}[_j]=${M}[_j],${M}[_i]
    end
    for _i=1,#${O} do ${E}[${M}[_i]]=${O}[_i] end
    ${y}=${ne}
  elseif ${y}==${ne} then
    local ${k}={}
    for _i=0,255 do ${k}[_i]=_i end
    local _j=0
    for _i=0,255 do
      _j=(_j+${k}[_i]+${j}[(_i%${J})+1])%256
      ${k}[_i],${k}[_j]=${k}[_j],${k}[_i]
    end
    local _a,_b=0,0
    for _i=1,#${E} do
      _a=(_a+1)%256
      _b=(_b+${k}[_a])%256
      ${k}[_a],${k}[_b]=${k}[_b],${k}[_a]
      ${E}[_i]=${S}(${E}[_i],${k}[(${k}[_a]+${k}[_b])%256])
    end
    ${y}=${te}
  elseif ${y}==${te} then
    for _i=1,#${E} do
      local _val=${E}[_i]
      _val=${S}(_val,${m}[((_i-1)%${K})+1])
      _val=${S}(_val,${D}[((_i-1)%${X})+1])
      _val=${S}(_val,${B}[((_i-1)%${q})+1])
      _val=${S}(_val,${V}[((_i-1)%${z})+1])
      ${A}[_i]=_val
    end
    ${y}=${oe}
  elseif ${y}==${oe} then
    local _pos,_outPtr=1,1
    local _runLen
    while _pos<=#${A} do
      local _hdr=${A}[_pos]
      _pos=_pos+1
      if not _hdr then break end
      if _hdr>=128 then
        _runLen=(_hdr-128)+2
        local _byteVal=${A}[_pos]
        _pos=_pos+1
        if _byteVal then
          for _=1,_runLen do ${N}[_outPtr]=${h}(_byteVal); _outPtr=_outPtr+1 end
        end
      else
        _runLen=_hdr+1
        for _=1,_runLen do
          local _b=${A}[_pos]
          _pos=_pos+1
          if _b then
            ${N}[_outPtr]=${h}(_b)
            _outPtr=_outPtr+1
          end
        end
      end
    end
    ${w}=${v}(${N})
    ${y}=${re}
  elseif ${y}==${re} then
    local _fn = nil
    local _err = nil
    if type(loadstring) == "function" then
      local _ok, _res = pcall(loadstring, ${w})
      if _ok and type(_res) == "function" then _fn = _res else _err = _res end
    end
    if not _fn and type(load) == "function" then
      local _ok, _res = pcall(load, ${w})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn and getgenv and type(getgenv) == "function" and type(getgenv().loadstring) == "function" then
      local _ok, _res = pcall(getgenv().loadstring, ${w})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn and _G and type(_G.loadstring) == "function" then
      local _ok, _res = pcall(_G.loadstring, ${w})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn and type(${b}) == "function" then
      local _ok, _res = pcall(${b}, ${w})
      if _ok and type(_res) == "function" then _fn = _res else _err = _err or _res end
    end
    if not _fn then return error("[LuaMore Execution Error]: "..tostring(_err or "loadstring unavailable in environment"), 0) end
    local _res = _fn(...)
    ${y}=${H}
    return _res
  else
    ${y}=${H}
  end
end
`}var T="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";function le(e){let o=typeof e=="string"?new TextEncoder().encode(e):e,n=(4-o.length%4)%4,a=o.length+n,l=new Uint8Array(a);l.set(o);for(let t=0;t<n;t++)l[o.length+t]=32;let c="";for(let t=0;t<a;t+=4){let r=l[t]*16777216+l[t+1]*65536+l[t+2]*256+l[t+3]>>>0,d=r%85;r=Math.floor(r/85);let i=r%85;r=Math.floor(r/85);let g=r%85;r=Math.floor(r/85);let _=r%85;r=Math.floor(r/85);let s=r%85;c+=T[s]+T[_]+T[g]+T[i]+T[d]}return c}function xe(e){return!e.antiTamper&&!e.antiHook&&!e.oeldAntiTamper?"":`--[[ LuaMore Ultra Anti-Tamper & Anti-Debug Shield ]]
do
  local _safe = {
    rawget = rawget,
    rawset = rawset,
    rawequal = rawequal,
    type = type,
    pcall = pcall,
    error = error,
    getmetatable = getmetatable,
    string_byte = string.byte,
    string_char = string.char,
    table_concat = table.concat,
    math_floor = math.floor,
    math_abs = math.abs,
    os_clock = (os and os.clock) or tick
  }

  local function _fail(code)
    _safe.error("[LuaMore Security Alert] Integrity validation failed (" .. tostring(code) .. ")", 0)
  end

  -- Layer 1: Primitive & standard library integrity checks
  if _safe.type(_safe.rawget) ~= "function" or _safe.type(_safe.rawset) ~= "function" then
    _fail("ENV_RAWGET")
  end
  if _safe.type(math) ~= "table" or _safe.type(string) ~= "table" or _safe.type(table) ~= "table" then
    _fail("ENV_TABLES")
  end
  if _safe.math_floor(1.9) ~= 1 or _safe.math_abs(-1) ~= 1 then
    _fail("ENV_MATH")
  end
  if _safe.string_byte("Z") ~= 90 or _safe.string_char(90) ~= "Z" then
    _fail("ENV_CHAR")
  end

  -- Layer 2: Raw read/write table validation
  local _canaryTable = {}
  _safe.rawset(_canaryTable, "integrity", 0xdead)
  if _safe.rawget(_canaryTable, "integrity") ~= 0xdead then
    _fail("ENV_RAW_RW")
  end

  -- Layer 3: Anti-Dumper & Function Hook Detection (Catches memory dumpers and table.concat hooks)
  if _safe.table_concat({"L", "M"}) ~= "LM" then
    _fail("HOOK_DUMP_CONCAT")
  end
  if _safe.string_byte("A") ~= 65 then
    _fail("HOOK_DUMP_BYTE")
  end
  if type(getfenv) == "function" then
    local _okEnv, _env = _safe.pcall(getfenv, 0)
    if _okEnv and type(_env) == "table" then
      local _mt = _safe.getmetatable(_env)
      if type(_mt) == "table" and type(_mt.__newindex) == "function" then
        _fail("HOOK_DUMP_ENV")
      end
    end
  end

  -- Layer 4: Error function integrity (error must throw, cannot return silently)
  local _errCaught = _safe.pcall(_safe.error, "\\0", 0)
  if _errCaught then
    while true do end
  end

  -- Layer 5: Numeric and arithmetic invariants
  local _canary = 77
  if _canary ~= _canary or _canary * 0 ~= 0 or _canary < 0 then
    _fail("ARITH_CANARY")
  end

  -- Layer 6: Roblox Sandbox & Honeypot Detection (Active in real Roblox client)
  if typeof and typeof(game) == "Instance" and game.GetService then
    if type(game) == "table" then
      _fail("SANDBOX_MOCK_GAME")
    end
    local _okMt, _mt = _safe.pcall(_safe.getmetatable, game)
    if _okMt and type(_mt) == "table" then
      _fail("SANDBOX_MOCK_METATABLE")
    end

    local _okJob, _jobId = _safe.pcall(function() return game.JobId end)
    if _okJob and _jobId == "00000000-0000-0000-0000-000000000000" then
      _fail("SANDBOX_ZERO_JOBID")
    end

    local _okPl, _plId = _safe.pcall(function() return game.PlaceId end)
    if _okPl and (_plId == 8916037983 or (game.GameId and game.GameId == 8916037983)) then
      _fail("SANDBOX_MOCK_PLACE")
    end

    local _okPlyrs, _plyrs = _safe.pcall(function() return game:GetService("Players") end)
    if _okPlyrs and _plyrs then
      local _okLp, _lp = _safe.pcall(function() return _plyrs.LocalPlayer end)
      if _okLp and _lp then
        local _okUid, _uid = _safe.pcall(function() return _lp.UserId end)
        local _okName, _uName = _safe.pcall(function() return _lp.Name end)
        if (_okUid and _uid == 123456789) or (_okName and _uName == "vole7vin") then
          _fail("SANDBOX_MOCK_USER")
        end
      end
    end

    local _okWs, _ws = _safe.pcall(function() return game:GetService("Workspace") end)
    if _okWs and _ws then
      local _okRoot, _isRoot = _safe.pcall(function() return _ws:IsA("WorldRoot") end)
      if _okRoot and _isRoot == false then
        _fail("SANDBOX_MOCK_WORKSPACE")
      end
    end
  end
end
`}function ie(e,o={}){let a=new TextEncoder().encode(e),l=3,c=Math.max(1,Math.ceil(a.length/l)),t=[],r=[];for(let d=0;d<l;d++){let i=d*c,g=Math.min(i+c,a.length);if(i>=a.length)break;let _=a.subarray(i,g),s=50+Math.floor(Math.random()*100);r.push(s);let p=[];for(let h=0;h<_.length;h++)p.push((_[h]+s+(h+1))%256);t.push("{"+p.join(",")+"}")}return`-- This file was protected by LuaMore [https://luamore.app]
do
  local _timeStart = (os and os.clock) and os.clock() or 0

  -- 1. Watermark Integrity
  local y = {
    l = { u = { a = { m = { o = { r = { e = { ["obfuscator"] = "Protected using LuaMore Obfuscator https://luamore.app/" } } } } } } }
  }
  local function checkWatermark()
    return y and y.l and y.l.u and y.l.u.a and y.l.u.a.m and y.l.u.a.m.o and y.l.u.a.m.o.r and y.l.u.a.m.o.r.e and y.l.u.a.m.o.r.e["obfuscator"] == "Protected using LuaMore Obfuscator https://luamore.app/"
  end
  if not checkWatermark() then
    while true do end
  end

  -- 2. Primitive standard-library & arithmetic invariants
  if math.floor(3.9) ~= 3 or math.floor(math.pi) ~= 3 then while true do end end
  if string.byte("A") ~= 65 or string.char(65) ~= "A" then while true do end end
  if table.concat({"L", "M"}) ~= "LM" then while true do end end

  local _canary = 88
  if _canary ~= _canary or _canary * 0 ~= 0 or _canary < 0 then while true do end end

  -- 3. Comprehensive Roblox Sandbox & Honeypot Detection (Active in real Roblox client)
  local isRoblox = (typeof and typeof(game) == "Instance") or (type(game) == "userdata") or (type(game) == "table" and game.GetService ~= nil)
  if isRoblox then
    local _pcall = pcall
    local _game = game

    -- JobId / Sandbox checks
    local okJob, jobId = _pcall(function() return _game.JobId end)
    if okJob and jobId == "00000000-0000-0000-0000-000000000000" then
      while true do end
    end

    local okPlace, placeId = _pcall(function() return _game.PlaceId end)
    if okPlace and (placeId == 8916037983 or (_game.GameId and _game.GameId == 8916037983)) then
      while true do end
    end

    -- LocalPlayer & sandbox user fingerprints
    local okPlayers, players = _pcall(function() return _game:GetService("Players") end)
    if okPlayers and players then
      local okLp, lp = _pcall(function() return players.LocalPlayer end)
      if okLp and lp then
        local okUid, uid = _pcall(function() return lp.UserId end)
        local okName, uName = _pcall(function() return lp.Name end)
        if (okUid and uid == 123456789) or (okName and uName == "vole7vin") then
          while true do end
        end
      end
      local okPlyrList, plyrList = _pcall(function() return players:GetPlayers() end)
      if okPlyrList and type(plyrList) == "table" and #plyrList > 0 then
        local firstP = plyrList[1]
        if firstP and (firstP.UserId == 123456789 or firstP.Name == "vole7vin") then
          while true do end
        end
      end
    end

    -- Sandbox Lighting fingerprints
    local okLight, light = _pcall(function() return _game:GetService("Lighting") end)
    if okLight and light then
      local okLat, lat = _pcall(function() return light.GeographicLatitude end)
      local okFog, fog = _pcall(function() return light.FogEnd end)
      if okLat and okFog and lat == 41.7 and fog == 100000 then
        while true do end
      end
      local okTime, tod = _pcall(function() return light.TimeOfDay end)
      if okTime and okLat and tod == "12:00:00" and lat == 41.7 then
        while true do end
      end
    end

    -- Sandbox SoundService fingerprints
    local okSound, sound = _pcall(function() return _game:GetService("SoundService") end)
    if okSound and sound then
      local okDf, df = _pcall(function() return sound.DistanceFactor end)
      local okRs, rsScale = _pcall(function() return sound.RolloffScale end)
      if okDf and okRs and df == 3.33 and rsScale == 1 then
        while true do end
      end
    end

    -- Sandbox HttpService check
    local okHttp, http = _pcall(function() return _game:GetService("HttpService") end)
    if okHttp and http then
      local okEn, enabled = _pcall(function() return http.HttpEnabled end)
      if okEn and enabled and okJob and jobId == "00000000-0000-0000-0000-000000000000" then
        while true do end
      end
    end

    -- Workspace sanity
    local okWs, ws = _pcall(function() return _game:GetService("Workspace") end)
    if okWs and ws then
      local okRoot, isRoot = _pcall(function() return ws:IsA("WorldRoot") end)
      if okRoot and isRoot == false then
        while true do end
      end
      local okFn, fn = _pcall(function() return ws:GetFullName() end)
      if okFn and type(fn) == "string" and fn:sub(1, 5) == "Game." then
        while true do end
      end
    end

    -- Periodic Heartbeat Watchdog Integrity Hook
    local okRs, rs = _pcall(function() return _game:GetService("RunService") end)
    if okRs and rs and rs.Heartbeat then
      local _lastTick = (os and os.clock) and os.clock() or tick()
      _pcall(function()
        rs.Heartbeat:Connect(function()
          local _curTick = (os and os.clock) and os.clock() or tick()
          if _curTick - _lastTick >= 0.5 then
            _lastTick = _curTick
            if not checkWatermark() then while true do end end
            if math.floor(3.9) ~= 3 or string.byte("A") ~= 65 then while true do end end
          end
        end)
      end)
    end
  end

  -- 4. Multi-Key Decryption & Assembly
  local chunks = { ${t.join(`,
    `)} }
  local keys = { ${r.join(", ")} }

  local function decrypt(data, key)
    local out = {}
    for i = 1, #data do
      out[i] = (data[i] - key - i) % 256
    end
    return out
  end

  local decrypted_parts = {}
  for i = 1, #chunks do
    local dec = decrypt(chunks[i], keys[i])
    local p = {}
    for j = 1, #dec do
      p[j] = string.char(dec[j])
    end
    decrypted_parts[i] = table.concat(p)
  end

  local original_source = table.concat(decrypted_parts)

  -- 5. Universal Execution Resolver
  local chunk, err
  if type(loadstring) == "function" then
    local _ok, _res = pcall(loadstring, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = _res end
  end
  if not chunk and type(load) == "function" then
    local _ok, _res = pcall(load, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = err or _res end
  end
  if not chunk and getgenv and type(getgenv) == "function" and type(getgenv().loadstring) == "function" then
    local _ok, _res = pcall(getgenv().loadstring, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = err or _res end
  end
  if not chunk and _G and type(_G.loadstring) == "function" then
    local _ok, _res = pcall(_G.loadstring, original_source)
    if _ok and type(_res) == "function" then chunk = _res else err = err or _res end
  end

  if not chunk then error("[LuaMore Execution Error]: " .. tostring(err or "No loading function available in executor environment"), 0) end
  return chunk(...)
end
`}function Pe(e){let n=e.replace(/--\[\[[\s\S]*?\]\]/g,"").split(`
`),a=[];for(let l of n){let c=l.trim();c.length>0&&!c.startsWith("--")&&a.push(c)}return a.join(`
`)}function ce(e){if(!e.length)return 0;let o={};for(let a=0;a<e.length;a++){let l=e[a];o[l]=(o[l]||0)+1}let n=0;for(let a of Object.values(o)){let l=a/e.length;n-=l*Math.log2(l)}return Number(n.toFixed(4))}function Ne(e){return F(e,{dualVm:!1,antiTamper:!0,antiHook:!0,encryptStrings:!0,controlFlowFlattening:!0,oeldAntiTamper:!0})}function F(e,o={}){if(e.length>5e6)throw new Error(`Source code too large for LuaMore VM \u2014 max ${5e6/1e6} MB per build`);let n=new TextEncoder,a=o.antiTamper??!0,l=o.dualVm??!1,c=o.vmDepth?Math.min(o.vmDepth,3):l?2:1,t=we(e,o),r="";a&&(r+=xe(o)+`
`),r+=t;let d=n.encode(r),i="";for(let s=0;s<c;s++){let p=s===c-1,h=s+1,v=Te(d),b=Le(v),u=1e3+$(9e5),m=Se(b.ct,u);i=Re(m.out,b.k1,b.k2,b.k3,b.k4,b.rc4,m.seed,`vm${h}`,""),p||(d=n.encode(i))}let g=Pe(i);if(o.oeldAntiTamper??!0)return ie(g,o);let _=le(g);return`-- This file was protected by LuaMore [https://luamore.app]
local function _b85d(s)local t="`+T+'";local m={};for i=1,85 do m[t:sub(i,i)]=i-1 end;local r={};local i=1;while i<=#s do local c=s:sub(i,i+4);local nb=#c-1;local cp=c..string.rep("~",5-#c);local v=0;for j=1,5 do v=v*85+m[cp:sub(j,j)]end;for k=3,4-nb,-1 do r[#r+1]=string.char(math.floor(v/256^k)%256)end;i=i+5 end;return table.concat(r)end;local _p=_b85d([==['+_+']==]);local _l=(function()if type(loadstring)=="function" then return loadstring elseif type(load)=="function" then return load elseif getgenv and type(getgenv)=="function" and type(getgenv().loadstring)=="function" then return getgenv().loadstring elseif _G and type(_G.loadstring)=="function" then return _G.loadstring end return nil end)();if not _l then error("[LuaMore] loadstring is not supported in this executor environment", 0) end;local _f,_e=_l(_p);if not _f then error("[LuaMore Execution Error]: "..tostring(_e or "Failed to compile bytecode chunk"), 0) end;return _f(...)'}function Ce(e,o={}){let n=F(e,o),a=ce(n),l=o.vmDepth?Math.min(o.vmDepth,3):o.dualVm??!0?2:1;return{code:n,size:new TextEncoder().encode(n).length,originalSize:new TextEncoder().encode(e).length,entropy:a,layers:l,mode:l===2?"Dual Polymorphic Register VM":"Hardened Register VM"}}return me(Ie);})();
