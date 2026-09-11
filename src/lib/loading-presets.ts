export type LoadingPreset = {
  id: string;
  name: string;
  blurb: string;
  source: string;
};

function presetSource(opts: {
  title: string;
  subtitle: string;
  barBg: string;
  accent: string;
  text: string;
  subtext: string;
  track: string;
  stroke: string;
}): string {
  return `local GuiService=game:GetService("GuiService")
local TweenService=game:GetService("TweenService")
local RunService=game:GetService("RunService")
local UserInputService=game:GetService("UserInputService")
local _lm_t=task or(type(wait)=="function"and{delay=function(s,f)if delay then delay(s,f)elseif f then f()end end}or{delay=function(_,f)if f then f()end end})
local function isMobile()return UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled end
local function corner(i,r)local c=Instance.new("UICorner")c.CornerRadius=UDim.new(0,r)c.Parent=i end
local function stroke(i,c,t,a)local s=Instance.new("UIStroke")s.Color=c s.Thickness=t or 1 s.Transparency=a or 0 s.Parent=i end
local function smoothTween(i,p,t,e,d)return TweenService:Create(i,TweenInfo.new(t or 0.55,e or Enum.EasingStyle.Quint,d or Enum.EasingDirection.Out),p)end
local function layoutBar(bar)
	local top=GuiService:GetGuiInset().Y
	local pos=type(LOADING_POSITION)=="string" and LOADING_POSITION or "bottom-left"
	if pos=="top" then
		bar.AnchorPoint=Vector2.new(0.5,0)
		bar.Position=UDim2.new(0.5,0,0,10+top)
		bar.Size=isMobile() and UDim2.new(0.94,0,0,66) or UDim2.fromOffset(280,52)
	elseif pos=="bottom-center" then
		bar.AnchorPoint=Vector2.new(0.5,1)
		bar.Position=UDim2.new(0.5,0,1,-(10+top))
		bar.Size=isMobile() and UDim2.new(0.94,0,0,66) or UDim2.fromOffset(300,52)
	elseif pos=="bottom-right" then
		bar.AnchorPoint=Vector2.new(1,1)
		bar.Position=UDim2.new(1,-14,1,-14)
		bar.Size=isMobile() and UDim2.new(0.94,0,0,66) or UDim2.fromOffset(260,50)
	elseif isMobile() then
		bar.AnchorPoint=Vector2.new(0.5,1)
		bar.Position=UDim2.new(0.5,0,1,-(10+top))
		bar.Size=UDim2.new(0.94,0,0,66)
	else
		bar.AnchorPoint=Vector2.new(0,1)
		bar.Position=UDim2.new(0,14,1,-14)
		bar.Size=UDim2.fromOffset(260,50)
	end
end
local function animateBarIn(bar)
	local target=bar.Position
	bar.Position=target+UDim2.fromOffset(0,18)
	bar.BackgroundTransparency=1
	smoothTween(bar,{Position=target,BackgroundTransparency=0.04},0.62,Enum.EasingStyle.Quint):Play()
end
local function addDotSpinner(parent,accent)
	local wrap=Instance.new("Frame")
	wrap.Size=UDim2.fromOffset(28,10)
	wrap.AnchorPoint=Vector2.new(0,0.5)
	wrap.Position=UDim2.new(0,12,0.5,0)
	wrap.BackgroundTransparency=1
	wrap.Parent=parent
	local dots={}
	for i=1,3 do
		local d=Instance.new("Frame")
		d.Size=UDim2.fromOffset(5,5)
		d.Position=UDim2.fromOffset((i-1)*9,2.5)
		d.BackgroundColor3=accent
		d.BorderSizePixel=0
		d.BackgroundTransparency=0.82
		d.Parent=wrap
		corner(d,99)
		dots[i]=d
	end
	local conn
	local t0=os.clock()
	conn=RunService.Heartbeat:Connect(function()
		if not wrap.Parent then if conn then conn:Disconnect()end return end
		local p=(os.clock()-t0)*2.2
		for i,d in ipairs(dots)do
			local wave=0.5+0.5*math.sin(p-i*0.95)
			d.BackgroundTransparency=0.18+0.62*(1-wave)
			local s=3.6+1.4*wave
			d.Size=UDim2.fromOffset(s,s)
			d.Position=UDim2.fromOffset((i-1)*9+(5-s)*0.5,2.5+(5-s)*0.5)
		end
	end)
	return conn
end
local function dismissOverlay(gui,bar,spinConn)
	pcall(function()
		if spinConn then spinConn:Disconnect()end
		if bar and bar.Parent then
			smoothTween(bar,{BackgroundTransparency=1},0.38,Enum.EasingStyle.Quint):Play()
		end
		_lm_t.delay(0.4,function()pcall(function()if gui and gui.Parent then gui:Destroy()end end)end)
	end)
end
local function waitForLocalPlayer()
	local Players=game:GetService("Players")
	local plr=Players.LocalPlayer
	if plr then return plr end
	local t0=os.clock()
	while not plr and (os.clock()-t0)<10 do
		pcall(function() RunService.Heartbeat:Wait() end)
		plr=Players.LocalPlayer
	end
	return plr
end
local function lmGuiHosts(plr)
	local hosts={}
	if type(gethui)=="function" then
		local ok,h=pcall(gethui)
		if ok and typeof(h)=="Instance" then hosts[#hosts+1]=h end
	end
	local okCore,cg=pcall(function() return game:GetService("CoreGui") end)
	if okCore and typeof(cg)=="Instance" then hosts[#hosts+1]=cg end
	if plr then
		local okPg,pg=pcall(function() return plr:FindFirstChildOfClass("PlayerGui") or plr:WaitForChild("PlayerGui",5) end)
		if okPg and typeof(pg)=="Instance" then hosts[#hosts+1]=pg end
	end
	return hosts
end
local function lmMountGui(gui,plr)
	if syn and type(syn.protect_gui)=="function" then pcall(syn.protect_gui,gui) end
	if type(protectgui)=="function" then pcall(protectgui,gui) end
	for _,h in ipairs(lmGuiHosts(plr)) do
		local ok=pcall(function() gui.Parent=h end)
		if ok and gui.Parent==h then return true end
	end
	return false
end
local LOADING_TITLE="${opts.title}"
local LOADING_SUBTITLE="${opts.subtitle}"
local LOADING_POSITION="bottom-left"
local LOADING_BAR_BG=Color3.fromRGB(${opts.barBg})
local LOADING_ACCENT=Color3.fromRGB(${opts.accent})
local LOADING_TEXT=Color3.fromRGB(${opts.text})
local LOADING_SUBTEXT=Color3.fromRGB(${opts.subtext})
local function buildLoadingGui()
	local plr=waitForLocalPlayer()
	if not plr then return {show=function()end,dismiss=function()end} end
	local gui=Instance.new("ScreenGui")
	gui.Name="LuaMore_Loading"
	gui.ResetOnSpawn=false
	gui.IgnoreGuiInset=true
	gui.DisplayOrder=200
	if not lmMountGui(gui,plr) then return {show=function()end,dismiss=function()end} end
	local bar=Instance.new("Frame")
	bar.BackgroundColor3=LOADING_BAR_BG
	bar.BorderSizePixel=0
	bar.Parent=gui
	layoutBar(bar)
	corner(bar,12)
	stroke(bar,Color3.fromRGB(${opts.stroke}),1,0.4)
	local spinConn=addDotSpinner(bar,LOADING_ACCENT)
	local title=Instance.new("TextLabel")
	title.BackgroundTransparency=1
	title.Position=UDim2.fromOffset(38,8)
	title.Size=UDim2.new(1,-48,0,20)
	title.Font=Enum.Font.GothamMedium
	title.Text=LOADING_TITLE
	title.TextColor3=LOADING_TEXT
	title.TextSize=isMobile()and 16 or 14
	title.TextXAlignment=Enum.TextXAlignment.Left
	title.Parent=bar
	local sub=Instance.new("TextLabel")
	sub.Name="Subtitle"
	sub.BackgroundTransparency=1
	sub.Position=UDim2.fromOffset(38,26)
	sub.Size=UDim2.new(1,-48,0,16)
	sub.Font=Enum.Font.Gotham
	sub.Text=LOADING_SUBTITLE
	sub.TextColor3=LOADING_SUBTEXT
	sub.TextSize=isMobile()and 12 or 11
	sub.TextXAlignment=Enum.TextXAlignment.Left
	sub.Parent=bar
	local track=Instance.new("Frame")
	track.Size=UDim2.new(1,-20,0,2)
	track.Position=UDim2.new(0,10,1,-6)
	track.BackgroundColor3=Color3.fromRGB(${opts.track})
	track.BorderSizePixel=0
	track.Parent=bar
	corner(track,99)
	local fill=Instance.new("Frame")
	fill.Size=UDim2.new(0.12,0,1,0)
	fill.BackgroundColor3=LOADING_ACCENT
	fill.BorderSizePixel=0
	fill.Parent=track
	corner(fill,99)
	smoothTween(fill,{Size=UDim2.new(0.92,0,1,0)},3.2,Enum.EasingStyle.Quint):Play()
	animateBarIn(bar)
	return{
		show=function(t,s)if t then title.Text=t end if s then sub.Text=s end end,
		dismiss=function()dismissOverlay(gui,bar,spinConn)end,
	}
end
local loading=buildLoadingGui()
loading.show("Loading script","Please be patient")
-- Paste the loader URL copied from Dashboard → Scripts
_G.script_key="<license-key>"
local ok,err=pcall(function()
	loadstring(game:HttpGet("/scripts/hosted/<public-id>.lua"))()
end)
loading.dismiss()
if not ok then warn("[LuaMore] load failed: ",err) end
`;
}

export const LOADING_PRESETS: LoadingPreset[] = [
  {
    id: "frost",
    name: "Frost Bar",
    blurb: "Bottom-left pill + progress",
    source: presetSource({
      title: "Loading script",
      subtitle: "Please be patient",
      barBg: "10,14,24",
      accent: "100,170,255",
      text: "245,248,255",
      subtext: "130,145,175",
      track: "30,40,60",
      stroke: "90,150,255",
    }),
  },
  {
    id: "neon",
    name: "Neon Bar",
    blurb: "Cyan glow progress line",
    source: presetSource({
      title: "Loading script",
      subtitle: "Authenticating",
      barBg: "6,10,18",
      accent: "34,211,238",
      text: "236,254,255",
      subtext: "103,232,249",
      track: "8,47,73",
      stroke: "34,211,238",
    }),
  },
  {
    id: "clean",
    name: "Clean Bar",
    blurb: "Minimal light bar",
    source: presetSource({
      title: "Loading script",
      subtitle: "Almost there",
      barBg: "248,250,252",
      accent: "37,99,235",
      text: "15,23,42",
      subtext: "100,116,139",
      track: "226,232,240",
      stroke: "148,163,184",
    }),
  },
  {
    id: "gold",
    name: "Gold Bar",
    blurb: "Gold accent rail",
    source: presetSource({
      title: "Loading script",
      subtitle: "LuaMore",
      barBg: "12,10,6",
      accent: "234,179,8",
      text: "254,243,199",
      subtext: "202,138,4",
      track: "41,37,16",
      stroke: "202,138,4",
    }),
  },
];

export const LOADER_USAGE = `-- Paste the loader URL copied from Dashboard → Scripts
_G.script_key="<license-key>"
loadstring(game:HttpGet("/scripts/hosted/<public-id>.lua"))()`;
