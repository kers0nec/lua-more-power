"use strict";var LMObfuscator=(()=>{var H=Object.defineProperty;var se=Object.getOwnPropertyDescriptor;var ue=Object.getOwnPropertyNames;var ce=Object.prototype.hasOwnProperty;var fe=(e,n)=>{for(var t in n)H(e,t,{get:n[t],enumerable:!0})},_e=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let i of ue(n))!ce.call(e,i)&&i!==t&&H(e,i,{get:()=>n[i],enumerable:!(r=se(n,i))||r.enumerable});return e};var he=e=>_e(H({},"__esModule",{value:!0}),e);var Pe={};fe(Pe,{analyzeObfuscation:()=>Ce,calculateEntropy:()=>re,obfuscateLua:()=>xe,obfuscateLuaWithOptions:()=>W});var de="LuaMore integrity check failed: execution unauthorized";function y(e){return Math.floor(Math.random()*e)}function C(){return 1+y(254)}function R(e,n){return e+Math.floor(Math.random()*(n-e+1))}var ge=new Set(["and","break","do","else","elseif","end","false","for","function","if","in","local","nil","not","or","repeat","return","then","true","until","while","continue","export","type"]),$e=new Set(["game","workspace","script","Instance","Vector3","Vector2","Vector3int16","Vector2int16","CFrame","Color3","UDim2","UDim","BrickColor","Ray","RaycastParams","RaycastResult","TweenInfo","Enum","Faces","Axes","NumberRange","NumberSequence","NumberSequenceKeypoint","ColorSequence","ColorSequenceKeypoint","PhysicalProperties","Region3","Region3int16","Rect","Random","DateTime","Font","PathWaypoint","OverlapParams","task","debug","bit32","bit","table","string","math","os","coroutine","utf8","pcall","xpcall","setmetatable","getmetatable","rawget","rawset","rawequal","rawlen","type","typeof","tostring","tonumber","error","warn","print","select","next","pairs","ipairs","unpack","require","getfenv","setfenv","getgenv","getrenv","getsenv","getreg","loadstring","load","tick","time","elapsedTime","shared","_G","_VERSION","plugin","newproxy","gcinfo","delay","spawn","Wait","wait","UserSettings","settings","stats","Stats","version","collectgarbage","hookfunction","hookmetamethod","newcclosure","islclosure","iscclosure","checkcaller","getnamecallmethod","setnamecallmethod","identifyexecutor","getexecutorname"]);function pe(e){let n=[],t=0,r=e.length;for(;t<r;){if(/\s/.test(e[t])){let o=t;for(;o<r&&/\s/.test(e[o]);)o++;n.push({type:"WHITESPACE",value:e.slice(t,o),raw:e.slice(t,o)}),t=o;continue}if(e[t]==="-"&&e[t+1]==="-"){let o=t+2;if(e[o]==="["&&(e[o+1]==="["||e[o+1]==="=")){let l=0,c=o+1;for(;e[c]==="=";)l++,c++;if(e[c]==="["){let a="]"+"=".repeat(l)+"]",d=e.indexOf(a,c+1);d!==-1?o=d+a.length:o=r}}else for(;o<r&&e[o]!==`
`&&e[o]!=="\r";)o++;n.push({type:"COMMENT",value:e.slice(t,o),raw:e.slice(t,o)}),t=o;continue}if(e[t]==='"'||e[t]==="'"){let o=e[t],l=t+1;for(;l<r;){if(e[l]==="\\"){l+=2;continue}if(e[l]===o){l++;break}l++}let c=e.slice(t,l),a=c.slice(1,-1);try{a=a.replace(/\\n/g,`
`).replace(/\\t/g,"	").replace(/\\r/g,"\r").replace(/\\"/g,'"').replace(/\\'/g,"'").replace(/\\\\/g,"\\")}catch{}n.push({type:"STRING",value:a,raw:c}),t=l;continue}if(e[t]==="["&&(e[t+1]==="["||e[t+1]==="=")){let o=0,l=t+1;for(;e[l]==="=";)o++,l++;if(e[l]==="["){let c="]"+"=".repeat(o)+"]",a=e.indexOf(c,l+1),d=a!==-1?a+c.length:r,f=e.slice(t,d),_=f.slice(2+o,a!==-1?f.length-(2+o):void 0);n.push({type:"STRING",value:_,raw:f}),t=d;continue}}if(/[0-9]/.test(e[t])||e[t]==="."&&/[0-9]/.test(e[t+1]||"")){let o=t;if(e[o]==="0"&&(e[o+1]==="x"||e[o+1]==="X"))for(o+=2;o<r&&/[0-9a-fA-F]/.test(e[o]);)o++;else{for(;o<r&&/[0-9]/.test(e[o]);)o++;if(e[o]===".")for(o++;o<r&&/[0-9]/.test(e[o]);)o++;if(e[o]==="e"||e[o]==="E")for(o++,(e[o]==="+"||e[o]==="-")&&o++;o<r&&/[0-9]/.test(e[o]);)o++}n.push({type:"NUMBER",value:e.slice(t,o),raw:e.slice(t,o)}),t=o;continue}if(/[a-zA-Z_]/.test(e[t])){let o=t;for(;o<r&&/[a-zA-Z0-9_]/.test(e[o]);)o++;let l=e.slice(t,o);ge.has(l)?n.push({type:"KEYWORD",value:l,raw:l}):n.push({type:"NAME",value:l,raw:l}),t=o;continue}let i=e.slice(t,t+2),s=e.slice(t,t+3);if(s==="..."||s==="..="){n.push({type:"PUNCT",value:s,raw:s}),t+=3;continue}if(["==","~=","<=",">=","..","+=","-=","*=","/=","%=","^="].includes(i)){n.push({type:"PUNCT",value:i,raw:i}),t+=2;continue}n.push({type:"PUNCT",value:e[t],raw:e[t]}),t++}return n}function me(e,n){let t=["l","I","1","o","O","0"],r=e*9301+49297^n.length*1337,i="_";for(let s=0;s<8;s++){let o=Math.abs(r%t.length);i+=t[o],r=Math.floor(r/7)^23130}return i+"_"+e}function be(e){let n=new Map,t=[],r=0,i=Math.random().toString(36).slice(2),s=[],o=e.filter(l=>l.type!=="WHITESPACE"&&l.type!=="COMMENT");for(let l=0;l<e.length;l++){let c=e[l],a=null;for(let f=l-1;f>=0;f--)if(e[f].type!=="WHITESPACE"&&e[f].type!=="COMMENT"){a=e[f];break}let d=null;for(let f=l+1;f<e.length;f++)if(e[f].type!=="WHITESPACE"&&e[f].type!=="COMMENT"){d=e[f];break}if(c.type==="NAME"){let f=a&&(a.value==="."||a.value===":"),_=d&&d.value==="="&&a&&(a.value==="{"||a.value===","),g=$e.has(c.value);if(!f&&!_&&!g&&(a&&(a.value==="local"||a.value==="function"||a.value==="for"||a.value===",")&&(n.has(c.value)||(r++,n.set(c.value,me(r,i)))),n.has(c.value))){s.push({type:"NAME",value:n.get(c.value),raw:n.get(c.value)});continue}}s.push(c)}return{tokens:s,stringTable:t}}function ye(e){let n=[],t=new Map,r=R(30,220),i=R(15,240),s=[];for(let f of e)if(f.type==="STRING"&&f.value.length>0){let _;t.has(f.value)?_=t.get(f.value):(_=n.length,n.push(f.value),t.set(f.value,_)),s.push({type:"NAME",value:`_LM_STR(${_})`,raw:`_LM_STR(${_})`})}else s.push(f);if(n.length===0)return{tokens:e,decoderRuntime:""};let o=[],l=[],c=[];for(let f of n){l.push(o.length),c.push(f.length);for(let _=0;_<f.length;_++){let $=((f.charCodeAt(_)^i)+r+_)%256;o.push($)}}let d=`
local _LM_CACHE = {}
local _LM_DATA = "${o.map(f=>`\\${f}`).join("")}"
local _LM_OFFSETS = {${l.map(f=>f+1).join(",")}}
local _LM_LENS = {${c.join(",")}}
local _LM_CHAR = string.char
local _LM_BYTE = string.byte
local _LM_XOR = (bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,32 do
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
  if not offset or not len then return "" end
  local res = {}
  for i = 1, len do
    local b = _LM_BYTE(_LM_DATA, offset + i - 1)
    local dec = ((b - ${r} - (i - 1)) % 256 + 256) % 256
    dec = _LM_XOR(dec, ${i})
    res[i] = _LM_CHAR(dec)
  end
  local str = table.concat(res)
  _LM_CACHE[id] = str
  return str
end
`;return{tokens:s,decoderRuntime:d}}function Ee(e){let n=e.split(`
`).filter(l=>l.trim().length>0);if(n.length<4)return e;let t=[],r=[];for(let l of n)r.push(l),r.length>=3&&!l.trim().endsWith("then")&&!l.trim().endsWith("do")&&(t.push(r.join(`
`)),r=[]);if(r.length>0&&t.push(r.join(`
`)),t.length<2)return e;let i=t.map(()=>R(1e3,99999)),s=0,o=`
local _lm_state = ${i[0]}
while _lm_state ~= ${s} do
`;for(let l=0;l<t.length;l++){let c=l===t.length-1?s:i[l+1],a=l===0?`if _lm_state == ${i[l]} then`:`elseif _lm_state == ${i[l]} then`;o+=`  ${a}
    ${t[l]}
    _lm_state = ${c}
`}return o+=`  else
    _lm_state = ${s}
  end
end
`,o}function Te(e,n){let t={},r=new Set;for(let g=1;g<=15;g++){let $=R(100,899);for(;r.has($);)$=R(100,899);r.add($),t[g]=$}let i=pe(e),{tokens:s}=be(i),{tokens:o,decoderRuntime:l}=ye(s),c="";for(let g of o)g.type!=="COMMENT"&&(c+=g.raw);l&&(c=l+`
`+c),(n.controlFlowFlattening??!0)&&(c=Ee(c));let a=h(new Set),d=h(new Set),f=h(new Set),_=h(new Set);return`
--[[ LuaMore Register Virtual Machine ]]
local ${d} = (function()
  local gg = pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg) == "table" then return gg end
  return _G or {}
end)()

local function _LM_VM_RUN()
  local ${f} = {}
  local ${a} = ${t[15]}
  while ${a} ~= 0 do
    if ${a} == ${t[15]} then
      ${c}
      ${a} = 0
    else
      ${a} = 0
    end
  end
end

return _LM_VM_RUN()
`}function Se(e){let n=[],t=0,r=e.length;for(;t<r;){let i=1;for(;i<129&&t+i<r&&e[t+i]===e[t];)i++;if(i>=3)n.push(128|i-2),n.push(e[t]),t+=i;else{let s=t,o=0;for(;t<r&&o<128;){let l=1;for(;l<3&&t+l<r&&e[t+l]===e[t];)l++;if(l>=3)break;t++,o++}n.push(o-1);for(let l=0;l<o;l++)n.push(e[s+l])}}return n}function Le(e){let n=[],t=[],r=[],i=[],s=19+y(16),o=23+y(16),l=29+y(16),c=37+y(16);for(let u=0;u<s;u++)n.push(C());for(let u=0;u<o;u++)t.push(C());for(let u=0;u<l;u++)r.push(C());for(let u=0;u<c;u++)i.push(C());let a=[];for(let u=0;u<e.length;u++){let p=e[u];p^=n[u%s],p^=t[u%o],p^=r[u%l],p^=i[u%c],a.push(p&255)}let d=32+y(16),f=[];for(let u=0;u<d;u++)f.push(C());let _=new Array(256);for(let u=0;u<256;u++)_[u]=u;let g=0;for(let u=0;u<256;u++){g=g+_[u]+f[u%d]&255;let p=_[u];_[u]=_[g],_[g]=p}let $=0,T=0,v=[];for(let u=0;u<a.length;u++){$=$+1&255,T=T+_[$]&255;let p=_[$];_[$]=_[T],_[T]=p,v.push(a[u]^_[_[$]+_[T]&255])}return{ct:v,k1:n,k2:t,k3:r,k4:i,rc4:f}}function ve(e,n){let t=e.map((o,l)=>l),r=n>>>0,i=()=>(r^=r<<13,r>>>=0,r^=r>>>17,r^=r<<5,r>>>=0,r);for(let o=t.length-1;o>0;o--){let l=i()%(o+1),c=t[o];t[o]=t[l],t[l]=c}let s=new Array(e.length);for(let o=0;o<e.length;o++)s[t[o]]=e[o];return{out:s,seed:n}}function we(e){let n=[];for(let t=0;t<e.length;t+=4096){let r="",i=Math.min(t+4096,e.length);for(let s=t;s<i;s++)r+="\\"+e[s];n.push(r)}return n.join("")}function Re(e,n){let t=Math.max(1,Math.ceil(e.length/n)),r=[];for(let i=0,s=0;i<e.length;i+=t,s++)r.push({idx:s,data:e.slice(i,i+t)});for(let i=r.length-1;i>0;i--){let s=y(i+1),o=r[i];r[i]=r[s],r[s]=o}return r}function h(e){let n="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(;;){let t="_",r=6+y(6);for(let i=0;i<r;i++)t+=n[y(n.length)];if(!e.has(t))return e.add(t),t}}function B(e){if(e<8)return String(e);let n=1+y(Math.max(1,e-1)),t=e-n,r=y(3);return r===0?`(${n}+${t})`:r===1?`(${e+n}-${n})`:`(${n}*1+${t})`}function P(e){let n=[];for(let t=0;t<e.length;t++)n.push(`string.char(${e.charCodeAt(t)})`);return n.join("..")}function ke(e,n,t,r,i,s,o,l,c=""){let a=new Set,d=h(a),f=h(a),_=h(a),g=h(a),$=h(a),T=h(a),v=h(a),u=h(a),p=h(a),k=h(a),j=h(a),D=h(a),I=h(a),X=h(a),K=h(a),q=h(a),z=h(a),Y=h(a),S=h(a),m=h(a),M=h(a),w=h(a),A=h(a),L=h(a),N=h(a),U=h(a),b=h(a),E=h(a),V=h(a),le=6+y(8),Z=Re(e,le),G="{";for(let O of Z)G+=`[${B(O.idx)}]="${we(O.data)}",`;G+=`n=${B(Z.length)}}`;let x=O=>"{"+O.map(ae=>B(ae)).join(",")+"}",ie=Array.from({length:7},()=>100+y(900)),[J,Q,ee,te,ne,oe]=ie,F=0;return`--[[LM/${l}]]
local ${_}=rawget or function(t,k) return t[k] end
local ${d}=(function()
  local gg=pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg)=="table" then return gg end
  return _G or {}
end)()
local ${g}=(string and string.byte) or ${_}(_G, ${P("string.byte")})
local ${$}=(string and string.char) or ${_}(_G, ${P("string.char")})
local ${T}=(table and table.concat) or ${_}(_G, ${P("table.concat")})
local ${v}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
  return ${_}(_G, ${P("loadstring")}) or ${_}(_G, ${P("load")})
end)()
${c}
local ${f}=(function()
  if type(getfenv)=="function" then
    local ok,env=pcall(getfenv,1)
    if ok and type(env)=="table" then return env end
  end
  return ${d}
end)()
local ${u}=${G}
local ${p}=${x(n)}
local ${k}=${x(t)}
local ${j}=${x(r)}
local ${D}=${x(i)}
local ${I}=${x(s)}
local ${X},${K},${q},${z},${Y}=#${p},#${k},#${j},#${D},#${I}
local ${S}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,32 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${M},${w},${A},${L},${N},${U}={},{},{},{},{},nil
local ${m}=${J}
while ${m}~=${F} do
  if ${m}==${J} then
    local _ptr=1
    for _ci=0,${u}.n-1 do
      local _chk=${u}[_ci]
      for _bi=1,#_chk do ${M}[_ptr]=${g}(_chk,_bi); _ptr=_ptr+1 end
    end
    ${m}=${Q}
  elseif ${m}==${Q} then
    local ${E}=${B(o)}
    local ${V}=function()
      ${E}=${S}(${E},(${E}*8192)%4294967296)
      ${E}=${S}(${E},math.floor(${E}/131072))
      ${E}=${S}(${E},(${E}*32)%4294967296)
      return ${E}
    end
    for _i=1,#${M} do ${L}[_i]=_i end
    for _i=#${L},2,-1 do
      local _j=(${V}()%_i)+1
      ${L}[_i],${L}[_j]=${L}[_j],${L}[_i]
    end
    for _i=1,#${M} do ${w}[_i]=${M}[${L}[_i]] end
    ${m}=${ee}
  elseif ${m}==${ee} then
    local ${b}={}
    for _i=0,255 do ${b}[_i]=_i end
    local _j=0
    for _i=0,255 do
      _j=(_j+${b}[_i]+${I}[(_i%${Y})+1])%256
      ${b}[_i],${b}[_j]=${b}[_j],${b}[_i]
    end
    local _a,_b=0,0
    for _i=1,#${w} do
      _a=(_a+1)%256
      _b=(_b+${b}[_a])%256
      ${b}[_a],${b}[_b]=${b}[_b],${b}[_a]
      ${w}[_i]=${S}(${w}[_i],${b}[(${b}[_a]+${b}[_b])%256])
    end
    ${m}=${te}
  elseif ${m}==${te} then
    for _i=1,#${w} do
      local _val=${w}[_i]
      _val=${S}(_val,${p}[((_i-1)%${X})+1])
      _val=${S}(_val,${k}[((_i-1)%${K})+1])
      _val=${S}(_val,${j}[((_i-1)%${q})+1])
      _val=${S}(_val,${D}[((_i-1)%${z})+1])
      ${A}[_i]=_val
    end
    ${m}=${ne}
  elseif ${m}==${ne} then
    local _pos,_outPtr=1,1
    local _runLen
    while _pos<=#${A} do
      local _hdr=${A}[_pos]; _pos=_pos+1
      if _hdr>=128 then
        _runLen=(_hdr-128)+2
        local _byteVal=${A}[_pos]; _pos=_pos+1
        for _=1,_runLen do ${N}[_outPtr]=${$}(_byteVal); _outPtr=_outPtr+1 end
      else
        _runLen=_hdr+1
        for _=1,_runLen do ${N}[_outPtr]=${$}(${A}[_pos]); _outPtr=_outPtr+1; _pos=_pos+1 end
      end
    end
    ${U}=${T}(${N})
    ${m}=${oe}
  elseif ${m}==${oe} then
    local _fn,_err=${v}(${U},"=LuaMore")
    if not _fn then return error("[LuaMore Execution Error] "..tostring(_err), 0) end
    if type(setfenv)=="function" then
      pcall(setfenv, _fn, ${f})
    end
    local _res=_fn()
    ${m}=${F}
    return _res
  else
    ${m}=${F}
  end
end
`}function Ae(e){let n=R(1e4,99999),t=R(1e4,99999),r=(n*33+t)%2147483647;return`--[[ LuaMore OELD Anti-Tamper & Security Shield ]]
do
  local _die = function() return error("${de}", 0) end
  if type(string) ~= "table" or type(table) ~= "table" or type(math) ~= "table" or type(pcall) ~= "function" then _die() end
  if type(string.byte) ~= "function" or type(string.char) ~= "function" or type(table.concat) ~= "function" then _die() end
  if string.byte(string.char(76, 77), 1) ~= 76 then _die() end
  if table.concat({"L", "M", ""}) ~= "LM" then _die() end
  if math.floor(9.75) ~= 9 or math.abs(-3) ~= 3 then _die() end
  if (${n} * 33 + ${t}) % 2147483647 ~= ${r} then _die() end
end
`}function Me(e){let n=e.replace(/--\[\[[\s\S]*?\]\]/g,"");n=n.replace(/--[^\n]*/g,"");let t=[],r=0;for(;r<n.length;){let i=n[r];if(i==='"'||i==="'"){let o=i,l=r+1;for(;l<n.length;){if(n[l]==="\\"){l+=2;continue}if(n[l]===o){l++;break}l++}t.push(n.slice(r,l)),r=l;continue}if(i===" "||i===`
`||i==="	"||i==="\r"){let o=r;for(;o<n.length&&(n[o]===" "||n[o]===`
`||n[o]==="	"||n[o]==="\r");)o++;let l=t.length?t[t.length-1].slice(-1):"",c=n[o]??"",a=d=>/[A-Za-z0-9_]/.test(d);a(l)&&a(c)&&t.push(" "),r=o;continue}let s=r;for(;s<n.length&&n[s]!==" "&&n[s]!==`
`&&n[s]!=="	"&&n[s]!=="\r"&&n[s]!=='"'&&n[s]!=="'";)s++;t.push(n.slice(r,s)),r=s}return t.join("")}function re(e){if(!e.length)return 0;let n={};for(let r=0;r<e.length;r++){let i=e[r];n[i]=(n[i]||0)+1}let t=0;for(let r of Object.values(n)){let i=r/e.length;t-=i*Math.log2(i)}return Number(t.toFixed(4))}function xe(e){return W(e,{dualVm:!0,antiTamper:!0,antiHook:!0,encryptStrings:!0,controlFlowFlattening:!0})}function W(e,n={}){if(e.length>5e6)throw new Error(`Source code too large for LuaMore VM \u2014 max ${5e6/1e6} MB per build`);let t=new TextEncoder,r=n.antiTamper??!0,i=n.dualVm??!0,s=n.vmDepth?Math.min(n.vmDepth,3):i?2:1,o=Te(e,n),l="";r&&(l+=Ae(n)+`
`),l+=o;let c=t.encode(l),a="";for(let g=0;g<s;g++){let $=g===s-1,T=g+1,v=Se(c),u=Le(v),p=1e3+y(9e5),k=ve(u.ct,p);a=ke(k.out,u.k1,u.k2,u.k3,u.k4,u.rc4,k.seed,`vm${T}`,""),$||(c=t.encode(a))}let d=Me(a);return`--[[
  LuaMore High-Security Polymorphic VM v18  //  Build ${Math.random().toString(36).slice(2,10)}  //  ${s}-Layer Register VM
  Transformations: Identifier Protection + Dynamic String Table Encryption + Control-Flow Scrambling + 4-Round XOR/RC4 + OELD Security Shield
  Protected with LuaMore https://luamore.app
]]
`+d}function Ce(e,n={}){let t=W(e,n),r=re(t),i=n.vmDepth?Math.min(n.vmDepth,3):n.dualVm??!0?2:1;return{code:t,size:new TextEncoder().encode(t).length,originalSize:new TextEncoder().encode(e).length,entropy:r,layers:i,mode:i===2?"Dual Polymorphic Register VM":"Hardened Register VM"}}return he(Pe);})();
