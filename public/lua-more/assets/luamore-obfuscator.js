"use strict";var LMObfuscator=(()=>{var ee=Object.defineProperty;var Pe=Object.getOwnPropertyDescriptor;var Ae=Object.getOwnPropertyNames;var Oe=Object.prototype.hasOwnProperty;var Ce=(t,e)=>{for(var n in e)ee(t,n,{get:e[n],enumerable:!0})},Re=(t,e,n,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of Ae(e))!Oe.call(t,r)&&r!==n&&ee(t,r,{get:()=>e[r],enumerable:!(o=Pe(e,r))||o.enumerable});return t};var Ee=t=>Re(ee({},"__esModule",{value:!0}),t);var Qe={};Ce(Qe,{obfuscateLua:()=>Ze,obfuscateLuaWithOptions:()=>xe});var F="you cant deobfuscate luamore dumbass ";function d(t){return Math.floor(Math.random()*t)}function X(){return 1+d(254)}var we=["\u0430","\u0435","\u03BF","\u0440","\u0441","\u0445","\u0501","\u04BB","\u051B"];function a(t){let e="abcdefghijklmnopqrstuvwxyz";for(;;){let n="_",o=5+d(6);for(let r=0;r<o;r++)n+=e[d(e.length)];if(!t.has(n))return t.add(n),n}}function x(){let t="",e=4+d(8);for(let r=0;r<e;r++)t+=we[d(we.length)];let n=new TextEncoder().encode(t),o='"';for(let r of n)o+="\\"+r;return o+'"'}function je(t){let e=2166136261;for(let n=0;n<t.length;n++){e^=t[n];let o=e*403,r=e%256*16777216;e=o+r>>>0}return e>>>0}function ke(t){let e=5381;for(let n=0;n<t.length;n++)e=e*33+t[n]>>>0;return e>>>0}function De(t){let e=[];for(let o=0;o<t.length;o+=4096){let r="",u=Math.min(o+4096,t.length);for(let l=o;l<u;l++)r+="\\"+t[l];e.push(r)}return e.join("")}function Ue(t,e){let n=Math.max(1,Math.ceil(t.length/e)),o=[];for(let r=0,u=0;r<t.length;r+=n,u++)o.push({idx:u,data:t.slice(r,r+n)});for(let r=o.length-1;r>0;r--){let u=d(r+1);[o[r],o[u]]=[o[u],o[r]]}return o}function z(t){if(t<8)return String(t);let e=1+d(t-1),n=t-e,o=d(3);return o===0?`(${e}+${n})`:o===1?`(${t+e}-${e})`:`(${e}*1+${n})`}function w(t){let e=[];for(let n=0;n<t.length;n++)e.push(`string.char(${t.charCodeAt(n)})`);return e.join("..")}function Ne(t){let e=[],n=0,o=t.length;for(;n<o;){let r=1;for(;r<129&&n+r<o&&t[n+r]===t[n];)r++;if(r>=3)e.push(128|r-2),e.push(t[n]),n+=r;else{let u=n,l=0;for(;n<o&&l<128;){let s=1;for(;s<3&&n+s<o&&t[n+s]===t[n];)s++;if(s>=3)break;n++,l++}e.push(l-1);for(let s=0;s<l;s++)e.push(t[u+s])}}return e}function Be(t){let e=[],n=[],o=[],r=[],u=17+d(16),l=23+d(16),s=31+d(16),f=37+d(16);for(let c=0;c<u;c++)e.push(X());for(let c=0;c<l;c++)n.push(X());for(let c=0;c<s;c++)o.push(X());for(let c=0;c<f;c++)r.push(X());let i=[];for(let c=0;c<t.length;c++){let M=t[c];M^=e[c%u],M^=n[c%l],M^=o[c%s],M^=r[c%f],i.push(M&255)}let S=24+d(24),v=[];for(let c=0;c<S;c++)v.push(X());let p=new Array(256);for(let c=0;c<256;c++)p[c]=c;let _=0;for(let c=0;c<256;c++)_=_+p[c]+v[c%S]&255,[p[c],p[_]]=[p[_],p[c]];let k=0,L=0,R=[];for(let c=0;c<i.length;c++)k=k+1&255,L=L+p[k]&255,[p[k],p[L]]=[p[L],p[k]],R.push(i[c]^p[p[k]+p[L]&255]);return{ct:R,k1:e,k2:n,k3:o,k4:r,rc4:v}}function Ie(t,e){let n=t.map((l,s)=>s),o=e>>>0,r=()=>(o^=o<<13,o>>>=0,o^=o>>>17,o^=o<<5,o>>>=0,o);for(let l=n.length-1;l>0;l--){let s=r()%(l+1);[n[l],n[s]]=[n[s],n[l]]}let u=new Array(t.length);for(let l=0;l<t.length;l++)u[n[l]]=t[l];return{out:u,seed:e}}function Se(t){var r;let e=t.replace(/--\[\[[\s\S]*?\]\]/g,"");e=e.replace(/--[^\n]*/g,"");let n=[],o=0;for(;o<e.length;){let u=e[o];if(u==='"'||u==="'"){let s=u,f=o+1;for(;f<e.length;){if(e[f]==="\\"){f+=2;continue}if(e[f]===s){f++;break}f++}n.push(e.slice(o,f)),o=f;continue}if(u===" "||u===`
`||u==="	"||u==="\r"){let s=o;for(;s<e.length&&(e[s]===" "||e[s]===`
`||e[s]==="	"||e[s]==="\r");)s++;let f=n.length?n[n.length-1].slice(-1):"",i=(r=e[s])!=null?r:"",S=v=>/[A-Za-z0-9_]/.test(v);S(f)&&S(i)&&n.push(" "),o=s;continue}let l=o;for(;l<e.length&&e[l]!==" "&&e[l]!==`
`&&e[l]!=="	"&&e[l]!=="\r"&&e[l]!=='"'&&e[l]!=="'";)l++;n.push(e.slice(o,l)),o=l}return n.join("")}function Fe(t,e,n,o,r,u,l,s,f){let i=new Set,S=a(i),v=a(i),p=a(i),_=a(i),k=a(i),L=a(i),R=a(i),c=a(i),M=a(i),m=a(i),y=a(i),C=a(i),B=a(i),j=a(i),T=a(i),P=a(i),D=a(i),$=a(i),A=a(i),E=a(i),ne=a(i),W=a(i),te=a(i),U=a(i),O=a(i),oe=a(i),re=a(i),ie=a(i),le=a(i),ae=a(i),g=a(i),N=a(i),I=a(i),h=a(i),b=a(i),ce=a(i),J=a(i),$e=a(i),se=a(i),K=a(i),Y=a(i),V=a(i),ue=a(i),G=a(i),ve=6+d(8),de=Ue(t,ve),Me=je(t),Ge=ke(t),Z="{";for(let q of de)Z+=`[${z(q.idx)}]="${De(q.data)}",`;Z+=`n=${z(de.length)}}`;let H=q=>"{"+q.map(Te=>z(Te)).join(",")+"}",Le=Array.from({length:8},()=>100+d(900)),[fe,pe,he,_e,ge,me,be,ye]=Le,Q=0;return`--[[LM/${s}]]
local ${b}=rawget
local ${S}=(function()
  local gg=${b}(_G, ${w("getgenv")})
  if type(gg)=="function" then
    local ok,g=pcall(gg)
    if ok and type(g)=="table" then
      local mt
      pcall(function() mt=getmetatable(g) end)
      if not mt or (not ${b}(mt or {}, ${w("__index")}) and not ${b}(mt or {}, ${w("__newindex")})) then
        return g
      end
    end
  end
  return _G
end)()
local ${ce}=${b}(${b}(_G, ${w("string")}) or string, ${w("byte")}) or string.byte
local ${J}=${b}(${b}(_G, ${w("string")}) or string, ${w("char")}) or string.char
local ${$e}=${b}(${b}(_G, ${w("table")}) or table, ${w("concat")}) or table.concat
local ${se}=${b}(_G, ${w("loadstring")}) or ${b}(_G, ${w("load")}) or loadstring or load
${f}
local ${v}=(function()
  local gf=${b}(_G, ${w("getfenv")})
  if type(gf)=="function" then local ok,e=pcall(gf,1) if ok then return e end end
  return ${S}
end)()
local ${p}=${Z}
local ${k}=${H(e)}
local ${L}=${H(n)}
local ${R}=${H(o)}
local ${c}=${H(r)}
local ${M}=${H(u)}
local ${oe},${re},${ie},${le},${ae}=#${k},#${L},#${R},#${c},#${M}
local ${y}=(bit32 and bit32.bxor) or (bit and bit.bxor) or function(a,b)
  local r,p=0,1
  for _=1,32 do
    local x,y=a%2,b%2
    if x~=y then r=r+p end
    a,b,p=(a-x)/2,(b-y)/2,p*2
  end
  return r
end
local ${_},${U},${C},${E},${K},${B}={},{},{},{},{},nil
local ${P}=2166136261
local ${D}=5381
local ${h}=${fe}
while ${h}~=${Q} do
  if ${h}==${fe} then
    local ${$}=1
    for ${A}=0,${p}.n-1 do
      local ${W}=${p}[${A}]
      for ${ne}=1,#${W} do ${_}[${$}]=${ce}(${W},${ne}); ${$}=${$}+1 end
    end
    ${h}=${pe}
  elseif ${h}==${pe} then
    for ${$}=1,#${_} do
      ${P}=${y}(${P},${_}[${$}])
      local _lo=${P}*403
      local _hi=(${P}%256)*16777216
      ${P}=(_lo+_hi)%4294967296
    end
    if ${P}~=${Me} then return error("${F}") end
    ${h}=${he}
  elseif ${h}==${he} then
    for ${$}=1,#${_} do
      ${D}=(${D}*33+${_}[${$}])%4294967296
    end
    if ${D}~=${Ge} then return error("${F}") end

    ${h}=${_e}
  elseif ${h}==${_e} then
    local ${m}=${z(l)}
    local ${te}=function()
      ${m}=${y}(${m},(${m}*8192)%4294967296)
      ${m}=${y}(${m},math.floor(${m}/131072))
      ${m}=${y}(${m},(${m}*32)%4294967296)
      return ${m}
    end
    for ${$}=1,#${_} do ${E}[${$}]=${$} end
    for ${$}=#${E},2,-1 do
      local ${A}=(${te}()%${$})+1
      ${E}[${$}],${E}[${A}]=${E}[${A}],${E}[${$}]
    end
    for ${$}=1,#${_} do ${U}[${$}]=${_}[${E}[${$}]] end
    ${h}=${ge}
  elseif ${h}==${ge} then
    local ${g}={}
    for ${$}=0,255 do ${g}[${$}]=${$} end
    local ${A}=0
    for ${$}=0,255 do
      ${A}=(${A}+${g}[${$}]+${M}[(${$}%${ae})+1])%256
      ${g}[${$}],${g}[${A}]=${g}[${A}],${g}[${$}]
    end
    local ${N},${I}=0,0
    for ${$}=1,#${U} do
      ${N}=(${N}+1)%256
      ${I}=(${I}+${g}[${N}])%256
      ${g}[${N}],${g}[${I}]=${g}[${I}],${g}[${N}]
      ${U}[${$}]=${y}(${U}[${$}],${g}[(${g}[${N}]+${g}[${I}])%256])
    end
    ${h}=${me}
  elseif ${h}==${me} then
    for ${$}=1,#${U} do
      local ${O}=${U}[${$}]
      ${O}=${y}(${O},${k}[((${$}-1)%${oe})+1])
      ${O}=${y}(${O},${L}[((${$}-1)%${re})+1])
      ${O}=${y}(${O},${R}[((${$}-1)%${ie})+1])
      ${O}=${y}(${O},${c}[((${$}-1)%${le})+1])
      ${C}[${$}]=${O}
    end
    ${h}=${be}
  elseif ${h}==${be} then
    local ${G},${$}=1,1
    local ${V}
    while ${G}<=#${C} do
      local ${Y}=${C}[${G}]; ${G}=${G}+1
      if ${Y}>=128 then
        ${V}=(${Y}-128)+2
        local ${ue}=${C}[${G}]; ${G}=${G}+1
        for _=1,${V} do ${K}[${$}]=${J}(${ue}); ${$}=${$}+1 end
      else
        ${V}=${Y}+1
        for _=1,${V} do ${K}[${$}]=${J}(${C}[${G}]); ${$}=${$}+1; ${G}=${G}+1 end
      end
    end
    ${B}=${$e}(${K})
    ${h}=${ye}
  elseif ${h}==${ye} then
    local ${j},${T}=${se}(${B},"=LuaMore")
    if not ${j} then return error("[LuaMore] "..tostring(${T})) end
    local sf=${b}(_G, ${w("setfenv")})
    if type(sf)=="function" then
      local _proxy=setmetatable({}, {
        __index=function(_,k) return ${v}[k] end,
        __newindex=function(_,k,v) ${v}[k]=v end,
        __metatable=false,
      })
      pcall(sf,${j},_proxy)
    end
    local _r=${j}()
    ${h}=${Q}
    return _r
  else
    ${h}=${Q}
  end
end
`}function Ve(){let t=new Set,e=a(t),n=a(t),o=a(t);return`
local ${o}={}
local ${e},${n}=pcall(function()
  setmetatable(${o},{__index=function(_,k) if k=="lm" then return 731 end end,__metatable=false})
  return ${o}.lm
end)
if not ${e} or ${n}~=731 then return error("${F}",0) end
`}function He(){let t=new Set,e=a(t),n=a(t),o=a(t),r=a(t),u=a(t),l=1+d(1e6),s=1+d(1e6),f=d(8);return f===0?`local ${e}=${l}
local ${n}=function(x) return x*x+${s} end
local ${o}=${x()}
if (${n}(${e})>=0) then local ${r}=${o} end
if (${n}(${e})+1==0) then return error(${x()}) end
`:f===1?`local ${e},${n}=${l},${s}
local ${o}=(${e}%2)*(${e}%2)+(${n}%2)*(${n}%2)
if ${o}<0 then ${e}=${x()} end
local ${r}=${x()}
while false do ${r}=${r}..${r} end
`:f===2?`local ${e}=function() return ${l} end
local ${n}=${e}()*${e}()
if ${n}~=${l*l} then return error(${x()}) end
local ${o}=${x()}
repeat break until true
`:f===3?`local ${e}={${x()},${x()},${x()}}
local ${n}=#${e}
if ${n}*${n}<0 then ${e}=nil end
local ${o},${r}=${l},${s}
if (${o}-${o})~=0 then return error(${x()}) end
`:f===4?`local ${e},${n}=${l},${s}
while (${e}*${e}+1)==0 do
  ${n}=${n}+${e}
  while (${n}*${n}+7)<0 do ${e}=${e}*${n}; ${n}=${n}+1 end
  repeat ${e}=${e}+${n} until (${e}*${e})<0
end
`:f===5?`local function ${e}(x) return ${e}(x+1) end
local ${n}=${l}
if (${n}%2)*(${n}%2)<0 then ${e}(${n}) end
while (${n}-${n})~=0 do ${e}(${n}) end
`:f===6?`local ${e},${n},${o}=${l},${s},0
while ${e}<${e} do
  while ${n}<${n} do
    while ${o}<${o} do ${o}=${o}+1 end
    ${n}=${n}+${o}
  end
  ${e}=${e}+${n}
end
repeat ${o}=${o}+1 until (${o}*${o})>=0
`:`local ${e}=${l}
local ${n}=function()
  while true do ${e}=${e}+1; coroutine.yield(${e}) end
end
if (${e}*${e}+1)==0 then
  local ${o}=coroutine.create(${n})
  while true do coroutine.resume(${o}) end
end
local ${r},${u}=${x()},${x()}
for _=1,0 do ${r}=${r}..${u} end
`}function Xe(t){let e=1e4+d(9e5),n=1e4+d(9e5),o=(e*33+n)%2147483647;return`
do
  local _lm_fail=function() return error("${F}",0) end
  local _lm_ok,_lm_value
  if type(rawget)~="function" or type(rawset)~="function" or type(pcall)~="function" or type(xpcall)~="function" then _lm_fail() end
  if type(string)~="table" or type(table)~="table" or type(math)~="table" then _lm_fail() end
  if type(string.byte)~="function" or type(string.char)~="function" or type(string.sub)~="function" or type(table.concat)~="function" then _lm_fail() end
  if string.byte(string.char(76,77),1)~=76 or string.sub("LuaMore",1,3)~="Lua" or table.concat({"V","M"})~="VM" then _lm_fail() end
  if math.floor(7.75)~=7 or (${e}*33+${n})%2147483647~=${o} then _lm_fail() end
  _lm_ok=pcall(error,"LuaMore probe",0); if _lm_ok then _lm_fail() end
  local _lm_probe={}
  local _lm_mt={__index=function(_,k) if k=="layer" then return ${t} end end,__metatable="LuaMore"}
  setmetatable(_lm_probe,_lm_mt)
  if _lm_probe.layer~=${t} or getmetatable(_lm_probe)~="LuaMore" then _lm_fail() end
  _lm_ok,_lm_value=pcall(function()
    local gg=rawget(_G,"getgenv")
    if type(gg)=="function" then return gg() end
    return _G
  end)
  if not _lm_ok or type(_lm_value)~="table" then _lm_fail() end
  if debug and type(debug.gethook)=="function" then
    _lm_ok,_lm_value=pcall(debug.gethook)
    if _lm_ok and _lm_value~=nil then _lm_fail() end
  end
end
`}function Ke(t,e,n,o,r){let u=Ne(t),l=Be(u),s=1+d(4294967295),f=Ie(l.ct,s),i=r?`if io and io.write then io.write("LUAMORE_VM${n}_INTEGRITY_PASS\\n") end`:"",S=Xe(n)+(o?Ve():"")+i;return Fe(f.out,l.k1,l.k2,l.k3,l.k4,l.rc4,f.seed,e,S)}function Ye(t){return t<=512?6:t<=4e3?5:t<=16e3?4:t<=8e4?3:t<=4e5?2:1}function qe(t){return t<=4e3?220+d(120):t<=4e4?120+d(60):t<=2e5?60+d(40):t<=1e6?24+d(16):8+d(8)}function ze(t){let e=Array.from(new TextEncoder().encode(t.slice(0,128))),n=ke(e);return`-- LuaMore Protection v2
do
  local _die=function() return error("${F}",0) end
  if type(string)~="table" or type(math)~="table" or type(table)~="table" then _die() end
  if type(string.byte)~="function" or type(string.char)~="function" or type(table.concat)~="function" then _die() end
  if type(pcall)~="function" or type(rawget)~="function" or type(setmetatable)~="function" then _die() end
  if string.byte(string.char(76,77),1)~=76 or table.concat({"L","M"})~="LM" or math.floor(9.75)~=9 then _die() end
  local _ok=pcall(error,"LuaMore probe",0); if _ok then _die() end
  local _b={${e.join(",")}}
  local _h2=5381
  for _i=1,#_b do _h2=(_h2*33+_b[_i])%4294967296 end
  if _h2~=${n} then _die() end
end
`}var We=`-- This File Was Fetched From Galactic https://discord.gg/qy2neXET6W-- [[ Rscripts Risk Notice ]]
-- This script is not verified by rscripts.net. Deal with caution.
--
-- Stay safe:
--   \u2022 Never log in on unofficial Roblox sites or lookalike domains.
--   \u2022 Real Roblox links use roblox.com (check the .com ending).
--   \u2022 Treat fake Roblox login / "claim reward" pages as phishing.
-- [[ End Rscripts Risk Notice ]]
-- 1
local Players = game:GetService("Players")

local ok, player = pcall(function()
    return Players:GetPlayerFromCharacter(workspace)
end)

if ok and player == nil then
else
   print'1' -- inf loop here
end

-- code below runs fine in a exec.
print'pass'

-- 2
local GuiService = game:GetService("GuiService")
local origSelected = GuiService.SelectedObject
GuiService.SelectedObject = nil
task.wait()
if GuiService.SelectedObject ~= nil then
   print'1' -- inf loop
end
local fakePart = Instance.new("Part")
local setOk = pcall(function()
    GuiService.SelectedObject = fakePart
end)
if setOk then
   print'2' -- inf loop
end
GuiService.SelectedObject = origSelected

-- code below runs fine in a exec.
print'pass'

-- 3
local Tween123 = game:GetService("TweenService")
local part21 = Instance.new("Part")
local badGoal23 = {
    Position = "detected fr?",
    CFrame = true,
    Transparency = "how sad T_T"
}
local tweenOk = pcall(function()
    Tween123:Create(part21, TweenInfo.new(1), badGoal23)
end)
if tweenOk then
    print'1'
else
end
local goodTween = Tween123:Create(part21, TweenInfo.new(0.1), {
    Transparency = 1
})
goodTween:Play()
task.wait()
goodTween:Cancel()

-- code below runs fine in a exec.
print'pass'

-- 4
local DS = game:GetService("DataStoreService")
local invalidName = "logger_trap//invalid@chars"
local dsOk, store = pcall(DS.GetDataStore, DS, invalidName, "scope")

if dsOk and store then
    print'1'
end

if not dsOk and not tostring(store):lower():find("invalid") and not tostring(store):find("name") then
else
    print'2'
end

local globalOk = pcall(DS.GetGlobalDataStore, DS)
if not globalOk then
else
    print'3'
end

-- code below runs fine in a exec.
print'pass'

-- 5
local StarterPlayer = game:GetService("StarterPlayer")
local sps = StarterPlayer:FindFirstChild("StarterPlayerScripts")

if not sps then
    print'1' -- inf loop here
end

local childCount = #sps:GetChildren()
if childCount < 2 then
    print'2' -- inf loop here
end

local testScript = Instance.new("LocalScript")
testScript.Source = "sigma boi"
testScript.Parent = sps

local stillThere = sps:FindFirstChild(testScript.Name)
testScript:Destroy()

if not stillThere then
    print'3' -- inf loop here
end

-- code below runs fine in a exec.
print'pass'

-- 6
local PromptService = game:GetService("ProximityPromptService")
local shown, hidden = false, false
local conShown = PromptService.PromptShown:Connect(function() shown = true end)
local conHidden = PromptService.PromptHidden:Connect(function() hidden = true end)
local part = Instance.new("Part")
part.Parent = workspace
local prompt = Instance.new("ProximityPrompt")
prompt.Parent = part
task.wait()
conShown:Disconnect()
conHidden:Disconnect()
prompt:Destroy()
part:Destroy()

if not shown or not hidden then
else
    print'1' -- inf loop here or whatever
end

-- code below runs fine in a exec.
print'pass'

-- 7
local Teams = game:GetService("Teams")
local neutral = Teams:FindFirstChild("Neutral")
if neutral and neutral.TeamColor ~= BrickColor.new("Medium stone grey") then
    print'1' -- inf loop
end

-- code below runs fine in a exec.
print'pass'

-- 8
local GroupService = game:GetService("GroupService")

local ok, groups = pcall(function()
    return GroupService:GetGroupsAsync(game.Players.LocalPlayer.UserId)
end)

if ok and groups then
    if #groups < 1 then
    else
        print'1' -- inf loop
    end
else
    print'2' -- inf loop
end

-- code below runs fine in a exec.
print'pass'
`;function Je(){let t=1+d(1048575),e=1+d(1048575),n=(t*33+e)%2147483647,o=1+d(1048575),r=1+d(1048575),u=(o*131+r)%2147483647;return`-- LuaMore Anti-Tamper v2 (combined prelude)
do
  local _die=function() return error("${F}",0) end
  if type(string)~="table" or type(table)~="table" or type(math)~="table" then _die() end
  if type(string.byte)~="function" or type(string.char)~="function" or type(string.sub)~="function" or type(string.rep)~="function" or type(string.format)~="function" or type(string.len)~="function" then _die() end
  if type(table.concat)~="function" or type(table.insert)~="function" or type(pcall)~="function" or type(xpcall)~="function" then _die() end
  if type(rawget)~="function" or type(rawset)~="function" or type(setmetatable)~="function" or type(getmetatable)~="function" then _die() end
  if type(next)~="function" or type(tostring)~="function" or type(tonumber)~="function" or type(select)~="function" or type(unpack)~="function" then _die() end
  if type(loadstring)~="function" and type(load)~="function" then _die() end
  if string.byte(string.char(76,77),1)~=76 then _die() end
  if string.sub("LuaMore",1,3)~="Lua" then _die() end
  if table.concat({"L","M",""})~="LM" then _die() end
  if string.rep("x",3)~="xxx" or string.len("LuaMore")~=7 or string.format("%d",9)~="9" then _die() end
  if math.floor(9.75)~=9 or math.abs(-3)~=3 or math.max(1,5,3)~=5 or math.min(4,2)~=2 then _die() end
  local _ins={}
  table.insert(_ins,5)
  if _ins[1]~=5 or #_ins~=1 then _die() end
  local _tbl={1,2,3}
  if #_tbl~=3 or _tbl[2]~=2 or _tbl[1]+_tbl[2]~=3 then _die() end
  local _ok=pcall(error,"LuaMore probe",0)
  if _ok then _die() end
  local _probe={}
  local _mt={__index=function(_,k) if k=="LuaMore" then return 92617 end end,__metatable="LuaMore"}
  setmetatable(_probe,_mt)
  if _probe.LuaMore~=92617 or getmetatable(_probe)~="LuaMore" then _die() end
  if (${t}*33+${e})%2147483647~=${n} then _die() end
  if (${o}*131+${r})%2147483647~=${u} then _die() end
  local _opaque=((7*7+3)%11)
  if _opaque~=8 then _die() end
  local _genv=rawget(_G,"getgenv")
  if type(_genv)=="function" then
    local _a,_b=pcall(_genv)
    if not _a or type(_b)~="table" then _die() end
  end
  if type(rawget(_G,"hookfunction"))=="function" then _die() end
  if type(rawget(_G,"hookmetamethod"))=="function" then _die() end
  if type(rawget(_G,"getrawmetatable"))=="function" then _die() end
  local _dbg=rawget(_G,"debug")
  if type(_dbg)=="table" and type(rawget(_dbg,"gethook"))=="function" then
    local _a,_h=pcall(rawget(_dbg,"gethook"))
    if _a and _h~=nil then _die() end
  end
end
`}function Ze(t){return xe(t,{dualVm:!0})}function xe(t,e={}){var m,y,C,B,j;if(t.length>2e6)throw new Error(`source too large for the LuaMore VM \u2014 max ${2e6/1e6} MB per build`);let n=new TextEncoder,o=(m=e.antiLogger)!=null?m:!0,r=(y=e.antiTamper)!=null?y:!0,u="";r&&(u+=Je()+`
`),o&&(u+=We+`
`);let l=u+t,s=ze(t)+`
`+l,f=(C=e.dualVm)!=null?C:!0,i=f?Math.max(Ye(s.length),(B=e.vmDepth)!=null?B:0):1,S=4.4,v=12e6;for(;i>1&&s.length*Math.pow(S,i)>v;)i--;let p=n.encode(s),_="";for(let T=0;T<i;T++){let P=T===i-1,D=T+1,$=`vm${D}`;_=Ke(p,$,D,P,(j=e.validationMarkers)!=null?j:!1),P||(p=n.encode(_))}let k=Se(_),R=`--[[
  LuaMore Obfuscation VM v11  //  build ${Math.random().toString(36).slice(2,10)}  //  ${i}-layer ${f?"dual+":"single"} VM
  parse -> optimize -> pseudo-bytecode -> flatten -> shuffle opcodes
  -> compress (RLE) -> encrypt (4xor + RC4) -> sign (FNV-1a + djb2)
  -> polymorphic nested VM -> LuaMore Protection prelude -> env-proxy -> minify
  LuaMore Protection: compatibility-safe runtime checks, anti-tamper prelude,
  anti-logger/anti-executor trap, isolated execution environment, and
  independent per-layer ciphertext integrity verification.
  do not edit \u2014 integrity guards will refuse to run
]]
`,c="",M=qe(t.length);for(let T=0;T<M;T++)c+=`do
`+He()+`end
`;return R+Se(c)+`
`+k}return Ee(Qe);})();
