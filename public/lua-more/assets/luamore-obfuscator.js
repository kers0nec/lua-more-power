"use strict";var LMObfuscator=(()=>{var F=Object.defineProperty;var ue=Object.getOwnPropertyDescriptor;var se=Object.getOwnPropertyNames;var ce=Object.prototype.hasOwnProperty;var fe=(e,n)=>{for(var t in n)F(e,t,{get:n[t],enumerable:!0})},_e=(e,n,t,r)=>{if(n&&typeof n=="object"||typeof n=="function")for(let a of se(n))!ce.call(e,a)&&a!==t&&F(e,a,{get:()=>n[a],enumerable:!(r=ue(n,a))||r.enumerable});return e};var de=e=>_e(F({},"__esModule",{value:!0}),e);var Pe={};fe(Pe,{analyzeObfuscation:()=>Ce,calculateEntropy:()=>re,obfuscateLua:()=>xe,obfuscateLuaWithOptions:()=>W});var he="LuaMore integrity check failed: execution unauthorized";function y(e){return Math.floor(Math.random()*e)}function x(){return 1+y(254)}function v(e,n){return e+Math.floor(Math.random()*(n-e+1))}var pe=new Set(["and","break","do","else","elseif","end","false","for","function","if","in","local","nil","not","or","repeat","return","then","true","until","while","continue","export","type"]),ge=new Set(["game","workspace","script","Instance","Vector3","Vector2","Vector3int16","Vector2int16","CFrame","Color3","UDim2","UDim","BrickColor","Ray","RaycastParams","RaycastResult","TweenInfo","Enum","Faces","Axes","NumberRange","NumberSequence","NumberSequenceKeypoint","ColorSequence","ColorSequenceKeypoint","PhysicalProperties","Region3","Region3int16","Rect","Random","DateTime","Font","PathWaypoint","OverlapParams","task","debug","bit32","bit","table","string","math","os","coroutine","utf8","pcall","xpcall","setmetatable","getmetatable","rawget","rawset","rawequal","rawlen","type","typeof","tostring","tonumber","error","warn","print","select","next","pairs","ipairs","unpack","require","getfenv","setfenv","getgenv","getrenv","getsenv","getreg","loadstring","load","tick","time","elapsedTime","shared","_G","_VERSION","plugin","newproxy","gcinfo","delay","spawn","Wait","wait","UserSettings","settings","stats","Stats","version","collectgarbage","hookfunction","hookmetamethod","newcclosure","islclosure","iscclosure","checkcaller","getnamecallmethod","setnamecallmethod","identifyexecutor","getexecutorname"]);function $e(e){let n=[],t=0,r=e.length;for(;t<r;){if(/\s/.test(e[t])){let o=t;for(;o<r&&/\s/.test(e[o]);)o++;n.push({type:"WHITESPACE",value:e.slice(t,o),raw:e.slice(t,o)}),t=o;continue}if(e[t]==="-"&&e[t+1]==="-"){let o=t+2;if(e[o]==="["&&(e[o+1]==="["||e[o+1]==="=")){let l=0,f=o+1;for(;e[f]==="=";)l++,f++;if(e[f]==="["){let i="]"+"=".repeat(l)+"]",p=e.indexOf(i,f+1);p!==-1?o=p+i.length:o=r}}else for(;o<r&&e[o]!==`
`&&e[o]!=="\r";)o++;n.push({type:"COMMENT",value:e.slice(t,o),raw:e.slice(t,o)}),t=o;continue}if(e[t]==='"'||e[t]==="'"){let o=e[t],l=t+1;for(;l<r;){if(e[l]==="\\"){l+=2;continue}if(e[l]===o){l++;break}l++}let f=e.slice(t,l),i=f.slice(1,-1);try{i=i.replace(/\\n/g,`
`).replace(/\\t/g,"	").replace(/\\r/g,"\r").replace(/\\"/g,'"').replace(/\\'/g,"'").replace(/\\\\/g,"\\")}catch{}n.push({type:"STRING",value:i,raw:f}),t=l;continue}if(e[t]==="["&&(e[t+1]==="["||e[t+1]==="=")){let o=0,l=t+1;for(;e[l]==="=";)o++,l++;if(e[l]==="["){let f="]"+"=".repeat(o)+"]",i=e.indexOf(f,l+1),p=i!==-1?i+f.length:r,c=e.slice(t,p),_=c.slice(2+o,i!==-1?c.length-(2+o):void 0);n.push({type:"STRING",value:_,raw:c}),t=p;continue}}if(/[0-9]/.test(e[t])||e[t]==="."&&/[0-9]/.test(e[t+1]||"")){let o=t;if(e[o]==="0"&&(e[o+1]==="x"||e[o+1]==="X"))for(o+=2;o<r&&/[0-9a-fA-F]/.test(e[o]);)o++;else{for(;o<r&&/[0-9]/.test(e[o]);)o++;if(e[o]===".")for(o++;o<r&&/[0-9]/.test(e[o]);)o++;if(e[o]==="e"||e[o]==="E")for(o++,(e[o]==="+"||e[o]==="-")&&o++;o<r&&/[0-9]/.test(e[o]);)o++}n.push({type:"NUMBER",value:e.slice(t,o),raw:e.slice(t,o)}),t=o;continue}if(/[a-zA-Z_]/.test(e[t])){let o=t;for(;o<r&&/[a-zA-Z0-9_]/.test(e[o]);)o++;let l=e.slice(t,o);pe.has(l)?n.push({type:"KEYWORD",value:l,raw:l}):n.push({type:"NAME",value:l,raw:l}),t=o;continue}let a=e.slice(t,t+2),u=e.slice(t,t+3);if(u==="..."||u==="..="){n.push({type:"PUNCT",value:u,raw:u}),t+=3;continue}if(["==","~=","<=",">=","..","+=","-=","*=","/=","%=","^="].includes(a)){n.push({type:"PUNCT",value:a,raw:a}),t+=2;continue}n.push({type:"PUNCT",value:e[t],raw:e[t]}),t++}return n}function me(e,n){let t=["l","I","1","o","O","0"],r=e*9301+49297^n.length*1337,a="_";for(let u=0;u<8;u++){let o=Math.abs(r%t.length);a+=t[o],r=Math.floor(r/7)^23130}return a+"_"+e}function be(e){let n=new Map,t=[],r=0,a=Math.random().toString(36).slice(2),u=[],o=e.filter(l=>l.type!=="WHITESPACE"&&l.type!=="COMMENT");for(let l=0;l<e.length;l++){let f=e[l],i=null;for(let c=l-1;c>=0;c--)if(e[c].type!=="WHITESPACE"&&e[c].type!=="COMMENT"){i=e[c];break}let p=null;for(let c=l+1;c<e.length;c++)if(e[c].type!=="WHITESPACE"&&e[c].type!=="COMMENT"){p=e[c];break}if(f.type==="NAME"){let c=i&&(i.value==="."||i.value===":"),_=p&&p.value==="="&&i&&(i.value==="{"||i.value===","),h=ge.has(f.value);if(!c&&!_&&!h&&(i&&(i.value==="local"||i.value==="function"||i.value==="for"||i.value===",")&&(n.has(f.value)||(r++,n.set(f.value,me(r,a)))),n.has(f.value))){u.push({type:"NAME",value:n.get(f.value),raw:n.get(f.value)});continue}}u.push(f)}return{tokens:u,stringTable:t}}function ye(e){let n=[],t=new Map,r=v(30,220),a=v(15,240),u=[];for(let c of e)if(c.type==="STRING"&&c.value.length>0){let _;t.has(c.value)?_=t.get(c.value):(_=n.length,n.push(c.value),t.set(c.value,_)),u.push({type:"NAME",value:`_LM_STR(${_})`,raw:`_LM_STR(${_})`})}else u.push(c);if(n.length===0)return{tokens:e,decoderRuntime:""};let o=[],l=[],f=[];for(let c of n){l.push(o.length),f.push(c.length);for(let _=0;_<c.length;_++){let g=((c.charCodeAt(_)^a)+r+_)%256;o.push(g)}}let p=`
local _LM_CACHE = {}
local _LM_DATA = "${o.map(c=>"\\"+String(c).padStart(3,"0")).join("")}"
local _LM_OFFSETS = {${l.map(c=>c+1).join(",")}}
local _LM_LENS = {${f.join(",")}}
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
      local dec = ((b - ${r} - (i - 1)) % 256 + 256) % 256
      dec = _LM_XOR(dec, ${a})
      res[i] = _LM_CHAR(dec)
    else
      res[i] = ""
    end
  end
  local str = table.concat(res)
  _LM_CACHE[id] = str
  return str
end
`;return{tokens:u,decoderRuntime:p}}function Te(e){let n=v(1e3,9999),t=v(1e4,99999),r=v(1e5,999999),a=0;return`
local _lm_state = ${n}
while _lm_state ~= ${a} do
  if _lm_state == ${n} then
    _lm_state = ${t}
  elseif _lm_state == ${t} then
    ${e}
    _lm_state = ${r}
  elseif _lm_state == ${r} then
    _lm_state = ${a}
  else
    _lm_state = ${a}
  end
end
`}function Ee(e,n){let t={},r=new Set;for(let h=1;h<=15;h++){let g=v(100,899);for(;r.has(g);)g=v(100,899);r.add(g),t[h]=g}let a=$e(e),{tokens:u}=be(a),{tokens:o,decoderRuntime:l}=ye(u),f="";for(let h of o)h.type!=="COMMENT"&&(f+=h.raw);l&&(f=l+`
`+f),(n.controlFlowFlattening??!0)&&(f=Te(f));let i=d(new Set),p=d(new Set),c=d(new Set),_=d(new Set);return`
--[[ LuaMore Register Virtual Machine ]]
local ${p} = (function()
  local gg = pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg) == "table" then return gg end
  return _G or {}
end)()

local function _LM_VM_RUN()
  local ${c} = {}
  local ${i} = ${t[15]}
  while ${i} ~= 0 do
    if ${i} == ${t[15]} then
      ${f}
      ${i} = 0
    else
      ${i} = 0
    end
  end
end

return _LM_VM_RUN()
`}function Se(e){let n=[],t=0,r=e.length;for(;t<r;){let a=1;for(;a<129&&t+a<r&&e[t+a]===e[t];)a++;if(a>=3)n.push(128|a-2),n.push(e[t]),t+=a;else{let u=t,o=0;for(;t<r&&o<128;){let l=1;for(;l<3&&t+l<r&&e[t+l]===e[t];)l++;if(l>=3)break;t++,o++}n.push(o-1);for(let l=0;l<o;l++)n.push(e[u+l])}}return n}function Le(e){let n=[],t=[],r=[],a=[],u=19+y(16),o=23+y(16),l=29+y(16),f=37+y(16);for(let s=0;s<u;s++)n.push(x());for(let s=0;s<o;s++)t.push(x());for(let s=0;s<l;s++)r.push(x());for(let s=0;s<f;s++)a.push(x());let i=[];for(let s=0;s<e.length;s++){let $=e[s];$^=n[s%u],$^=t[s%o],$^=r[s%l],$^=a[s%f],i.push($&255)}let p=32+y(16),c=[];for(let s=0;s<p;s++)c.push(x());let _=new Array(256);for(let s=0;s<256;s++)_[s]=s;let h=0;for(let s=0;s<256;s++){h=h+_[s]+c[s%p]&255;let $=_[s];_[s]=_[h],_[h]=$}let g=0,T=0,S=[];for(let s=0;s<i.length;s++){g=g+1&255,T=T+_[g]&255;let $=_[g];_[g]=_[T],_[T]=$,S.push(i[s]^_[_[g]+_[T]&255])}return{ct:S,k1:n,k2:t,k3:r,k4:a,rc4:c}}function ve(e,n){let t=e.length;if(t<=1)return{out:e.slice(),seed:n};let r=n%65536,a=()=>(r=(r*25173+13849)%65536,r),u=new Array(t);for(let l=0;l<t;l++)u[l]=l;for(let l=t-1;l>0;l--){let f=a()%(l+1),i=u[l];u[l]=u[f],u[f]=i}let o=new Array(t);for(let l=0;l<t;l++)o[l]=e[u[l]];return{out:o,seed:n}}function we(e){let n=[];for(let t=0;t<e.length;t+=4096){let r="",a=Math.min(t+4096,e.length);for(let u=t;u<a;u++)r+="\\"+String(e[u]).padStart(3,"0");n.push(r)}return n.join("")}function Re(e,n){let t=Math.max(1,Math.ceil(e.length/n)),r=[];for(let a=0,u=0;a<e.length;a+=t,u++)r.push({idx:u,data:e.slice(a,a+t)});for(let a=r.length-1;a>0;a--){let u=y(a+1),o=r[a];r[a]=r[u],r[u]=o}return r}function d(e){let n="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";for(;;){let t="_",r=6+y(6);for(let a=0;a<r;a++)t+=n[y(n.length)];if(!e.has(t))return e.add(t),t}}function B(e){if(e<8)return String(e);let n=1+y(Math.max(1,e-1)),t=e-n,r=y(3);return r===0?`(${n}+${t})`:r===1?`(${e+n}-${n})`:`(${n}*1+${t})`}function C(e){let n=[];for(let t=0;t<e.length;t++)n.push(`string.char(${e.charCodeAt(t)})`);return n.join("..")}function ke(e,n,t,r,a,u,o,l,f=""){let i=new Set,p=d(i),c=d(i),_=d(i),h=d(i),g=d(i),T=d(i),S=d(i),s=d(i),$=d(i),w=d(i),D=d(i),I=d(i),j=d(i),X=d(i),K=d(i),q=d(i),z=d(i),Y=d(i),R=d(i),m=d(i),A=d(i),L=d(i),k=d(i),E=d(i),P=d(i),U=d(i),b=d(i),N=d(i),V=d(i),le=6+y(8),J=Re(e,le),G="{";for(let O of J)G+=`[${B(O.idx)}]="${we(O.data)}",`;G+=`n=${B(J.length)}}`;let M=O=>"{"+O.map(ae=>B(ae)).join(",")+"}",ie=Array.from({length:7},()=>100+y(900)),[Z,Q,ee,te,ne,oe]=ie,H=0;return`--[[LM/${l}]]
local ${_}=rawget or function(t,k) return t[k] end
local ${p}=(function()
  local gg=pcall and select(2, pcall(function() return getgenv and getgenv() end))
  if type(gg)=="table" then return gg end
  return _G or {}
end)()
local ${h}=(string and string.byte) or ${_}(_G, ${C("string.byte")})
local _raw_char=(string and string.char) or ${_}(_G, ${C("string.char")})
local ${g}=function(x)
  if type(x)=="number" and type(_raw_char)=="function" then
    return _raw_char(math.floor(x)%256)
  end
  return ""
end
local ${T}=(table and table.concat) or ${_}(_G, ${C("table.concat")})
local ${S}=(function()
  if type(loadstring)=="function" then return loadstring end
  if type(load)=="function" then return load end
  return ${_}(_G, ${C("loadstring")}) or ${_}(_G, ${C("load")})
end)()
${f}
local ${c}=(function()
  if type(getfenv)=="function" then
    local ok,env=pcall(getfenv,1)
    if ok and type(env)=="table" then return env end
  end
  return ${p}
end)()
local ${s}=${G}
local ${$}=${M(n)}
local ${w}=${M(t)}
local ${D}=${M(r)}
local ${I}=${M(a)}
local ${j}=${M(u)}
local ${X},${K},${q},${z},${Y}=#${$},#${w},#${D},#${I},#${j}
local ${R}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,8 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${A},${L},${k},${E},${P},${U}={},{},{},{},{},nil
local ${m}=${Z}
while ${m}~=${H} do
  if ${m}==${Z} then
    local _ptr=1
    for _ci=0,${s}.n-1 do
      local _chk=${s}[_ci]
      if _chk then
        for _bi=1,#_chk do ${A}[_ptr]=${h}(_chk,_bi); _ptr=_ptr+1 end
      end
    end
    ${m}=${Q}
  elseif ${m}==${Q} then
    local ${N}=${B(o%65536)}
    local ${V}=function()
      ${N}=(${N}*25173+13849)%65536
      return ${N}
    end
    for _i=1,#${A} do ${E}[_i]=_i end
    for _i=#${E},2,-1 do
      local _j=(${V}()%_i)+1
      ${E}[_i],${E}[_j]=${E}[_j],${E}[_i]
    end
    for _i=1,#${A} do ${L}[${E}[_i]]=${A}[_i] end
    ${m}=${ee}
  elseif ${m}==${ee} then
    local ${b}={}
    for _i=0,255 do ${b}[_i]=_i end
    local _j=0
    for _i=0,255 do
      _j=(_j+${b}[_i]+${j}[(_i%${Y})+1])%256
      ${b}[_i],${b}[_j]=${b}[_j],${b}[_i]
    end
    local _a,_b=0,0
    for _i=1,#${L} do
      _a=(_a+1)%256
      _b=(_b+${b}[_a])%256
      ${b}[_a],${b}[_b]=${b}[_b],${b}[_a]
      ${L}[_i]=${R}(${L}[_i],${b}[(${b}[_a]+${b}[_b])%256])
    end
    ${m}=${te}
  elseif ${m}==${te} then
    for _i=1,#${L} do
      local _val=${L}[_i]
      _val=${R}(_val,${$}[((_i-1)%${X})+1])
      _val=${R}(_val,${w}[((_i-1)%${K})+1])
      _val=${R}(_val,${D}[((_i-1)%${q})+1])
      _val=${R}(_val,${I}[((_i-1)%${z})+1])
      ${k}[_i]=_val
    end
    ${m}=${ne}
  elseif ${m}==${ne} then
    local _pos,_outPtr=1,1
    local _runLen
    while _pos<=#${k} do
      local _hdr=${k}[_pos]
      _pos=_pos+1
      if not _hdr then break end
      if _hdr>=128 then
        _runLen=(_hdr-128)+2
        local _byteVal=${k}[_pos]
        _pos=_pos+1
        if _byteVal then
          for _=1,_runLen do ${P}[_outPtr]=${g}(_byteVal); _outPtr=_outPtr+1 end
        end
      else
        _runLen=_hdr+1
        for _=1,_runLen do
          local _b=${k}[_pos]
          _pos=_pos+1
          if _b then
            ${P}[_outPtr]=${g}(_b)
            _outPtr=_outPtr+1
          end
        end
      end
    end
    ${U}=${T}(${P})
    ${m}=${oe}
  elseif ${m}==${oe} then
    local _fn,_err=${S}(${U},"=LuaMore")
    if not _fn then return error("[LuaMore Execution Error] "..tostring(_err), 0) end
    if type(setfenv)=="function" then
      pcall(setfenv, _fn, ${c})
    end
    local _res=_fn()
    ${m}=${H}
    return _res
  else
    ${m}=${H}
  end
end
`}function Ae(e){return!e.antiTamper&&!e.antiHook?"":`--[[ LuaMore OELD Anti-Tamper & Security Shield ]]
do
  local _die = function() return error("${he}", 0) end
  if type(pcall) ~= "function" then _die() end
  local _ok, _res = pcall(function()
    if type(string) ~= "table" or type(table) ~= "table" or type(math) ~= "table" then return false end
    if type(string.byte) ~= "function" or type(string.char) ~= "function" or type(table.concat) ~= "function" then return false end
    if string.byte(string.char(76), 1) ~= 76 then return false end
    if table.concat({"L", "M"}) ~= "LM" then return false end
    return true
  end)
  if not _ok or _res ~= true then _die() end
end
`}function Me(e){let t=e.replace(/--\[\[[\s\S]*?\]\]/g,"").split(`
`),r=[];for(let a of t){let u=a.trim();u.length>0&&!u.startsWith("--")&&r.push(u)}return r.join(`
`)}function re(e){if(!e.length)return 0;let n={};for(let r=0;r<e.length;r++){let a=e[r];n[a]=(n[a]||0)+1}let t=0;for(let r of Object.values(n)){let a=r/e.length;t-=a*Math.log2(a)}return Number(t.toFixed(4))}function xe(e){return W(e,{dualVm:!0,antiTamper:!0,antiHook:!0,encryptStrings:!0,controlFlowFlattening:!0})}function W(e,n={}){if(e.length>5e6)throw new Error(`Source code too large for LuaMore VM \u2014 max ${5e6/1e6} MB per build`);let t=new TextEncoder,r=n.antiTamper??!0,a=n.dualVm??!0,u=n.vmDepth?Math.min(n.vmDepth,3):a?2:1,o=Ee(e,n),l="";r&&(l+=Ae(n)+`
`),l+=o;let f=t.encode(l),i="";for(let h=0;h<u;h++){let g=h===u-1,T=h+1,S=Se(f),s=Le(S),$=1e3+y(9e5),w=ve(s.ct,$);i=ke(w.out,s.k1,s.k2,s.k3,s.k4,s.rc4,w.seed,`vm${T}`,""),g||(f=t.encode(i))}let p=Me(i);return`--[[
  LuaMore High-Security Polymorphic VM v18  //  Build ${Math.random().toString(36).slice(2,10)}  //  ${u}-Layer Register VM
  Transformations: Identifier Protection + Dynamic String Table Encryption + Control-Flow Scrambling + 4-Round XOR/RC4 + OELD Security Shield
  Protected with LuaMore https://luamore.app
]]
`+p}function Ce(e,n={}){let t=W(e,n),r=re(t),a=n.vmDepth?Math.min(n.vmDepth,3):n.dualVm??!0?2:1;return{code:t,size:new TextEncoder().encode(t).length,originalSize:new TextEncoder().encode(e).length,entropy:r,layers:a,mode:a===2?"Dual Polymorphic Register VM":"Hardened Register VM"}}return de(Pe);})();
