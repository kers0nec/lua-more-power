-- ============================================================
--  LuaMore · Frost Bar — wide in-game loading bar
--  Run as a LocalScript. Set LOADER_URL to the loader from
--  your LuaMore dashboard. While your script authenticates
--  and downloads, a soft blue pill with a breathing dot
--  spinner keeps players from thinking you froze.
--
--  Mobile-ready: the bar scales wide on phones and settles
--  into a compact pill on desktop.
-- ============================================================

-- ---------------------- your settings ----------------------
local LOADER_URL = "https://www.luamore.win/v1/load/YOUR_PROJECT_ID?e=1&script=YOUR_SCRIPT"
local KEY = "" -- paste your key here, or leave "" for keyless scripts

local LOADING_TITLE = "Loading script"
local LOADING_SUBTITLE = "Please be patient"
local LOADING_POSITION = "bottom-left" -- "top" | "bottom-center" | "bottom-right" | "bottom-left"
local LOADING_BAR_BG = Color3.fromRGB(10, 14, 24)
local LOADING_ACCENT = Color3.fromRGB(100, 170, 255)
local LOADING_TEXT = Color3.fromRGB(245, 248, 255)
local LOADING_SUBTEXT = Color3.fromRGB(130, 145, 175)
local LOADING_DIM = false
local LOADING_SCREEN_BG = Color3.fromRGB(10, 14, 24)
local STROKE_COLOR = Color3.fromRGB(90, 150, 255)
local STROKE_ALPHA = 0.4
local SHOW_STROKE = true
local TRACK_COLOR = Color3.fromRGB(30, 40, 60)
-- -----------------------------------------------------------

local GuiService = game:GetService("GuiService")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local _lm_t = task or (type(wait) == "function" and {
	delay = function(s, f) if delay then delay(s, f) elseif f then f() end end,
} or {
	delay = function(_, f) if f then f() end end,
})

local function isMobile()
	return UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled
end

local function corner(i, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r)
	c.Parent = i
end

local function stroke(i, c, t, a)
	local s = Instance.new("UIStroke")
	s.Color = c
	s.Thickness = t or 1
	s.Transparency = a or 0
	s.Parent = i
end

-- Apple-like motion: soft spring settle (Quint) + gentle fade, no bounce.
local function smoothTween(i, p, t, e, d)
	return TweenService:Create(i, TweenInfo.new(t or 0.55, e or Enum.EasingStyle.Quint, d or Enum.EasingDirection.Out), p)
end

local function fadeIn(i, t)
	if i:IsA("GuiObject") then
		local a = i.BackgroundTransparency
		i.BackgroundTransparency = 1
		smoothTween(i, { BackgroundTransparency = a }, t or 0.5):Play()
	end
	if i:IsA("TextLabel") or i:IsA("TextButton") then
		local a = i.TextTransparency
		i.TextTransparency = 1
		smoothTween(i, { TextTransparency = a }, (t or 0.5) + 0.05):Play()
	end
end

local function layoutBar(bar)
	local top = GuiService:GetGuiInset().Y
	local pos = type(LOADING_POSITION) == "string" and LOADING_POSITION or "bottom-left"
	if pos == "top" then
		bar.AnchorPoint = Vector2.new(0.5, 0)
		bar.Position = UDim2.new(0.5, 0, 0, 10 + top)
		bar.Size = isMobile() and UDim2.new(0.94, 0, 0, 66) or UDim2.fromOffset(280, 52)
	elseif pos == "bottom-center" then
		bar.AnchorPoint = Vector2.new(0.5, 1)
		bar.Position = UDim2.new(0.5, 0, 1, -(10 + top))
		bar.Size = isMobile() and UDim2.new(0.94, 0, 0, 66) or UDim2.fromOffset(300, 52)
	elseif pos == "bottom-right" then
		bar.AnchorPoint = Vector2.new(1, 1)
		bar.Position = UDim2.new(1, -14, 1, -14)
		bar.Size = isMobile() and UDim2.new(0.94, 0, 0, 66) or UDim2.fromOffset(260, 50)
	elseif isMobile() then
		bar.AnchorPoint = Vector2.new(0.5, 1)
		bar.Position = UDim2.new(0.5, 0, 1, -(10 + top))
		bar.Size = UDim2.new(0.94, 0, 0, 66)
	else
		bar.AnchorPoint = Vector2.new(0, 1)
		bar.Position = UDim2.new(0, 14, 1, -14)
		bar.Size = UDim2.fromOffset(260, 50)
	end
end

local function animateBarIn(bar)
	local target = bar.Position
	bar.Position = target + UDim2.fromOffset(0, 18)
	bar.BackgroundTransparency = 1
	bar.Size = bar.Size - UDim2.fromOffset(0, 4)
	local finalSize = bar.Size + UDim2.fromOffset(0, 4)
	smoothTween(bar, { Position = target, BackgroundTransparency = 0.04, Size = finalSize }, 0.62, Enum.EasingStyle.Quint):Play()
	for _, ch in ipairs(bar:GetChildren()) do
		if ch:IsA("TextLabel") then
			ch.TextTransparency = 1
			_lm_t.delay(0.08, function()
				smoothTween(ch, { TextTransparency = 0 }, 0.48, Enum.EasingStyle.Quint):Play()
			end)
		end
	end
end

local function addDotSpinner(parent, accent)
	local wrap = Instance.new("Frame")
	wrap.Size = UDim2.fromOffset(28, 10)
	wrap.AnchorPoint = Vector2.new(0, 0.5)
	wrap.Position = UDim2.new(0, 12, 0.5, 0)
	wrap.BackgroundTransparency = 1
	wrap.Parent = parent
	local dots = {}
	for i = 1, 3 do
		local d = Instance.new("Frame")
		d.Size = UDim2.fromOffset(5, 5)
		d.Position = UDim2.fromOffset((i - 1) * 9, 2.5)
		d.BackgroundColor3 = accent
		d.BorderSizePixel = 0
		d.BackgroundTransparency = 0.82
		d.Parent = wrap
		corner(d, 99)
		dots[i] = d
	end
	local conn
	local t0 = os.clock()
	conn = RunService.Heartbeat:Connect(function()
		if not wrap.Parent then
			if conn then conn:Disconnect() end
			return
		end
		-- Soft breathing pulse (Apple activity indicator feel)
		local p = (os.clock() - t0) * 2.2
		for i, d in ipairs(dots) do
			local wave = 0.5 + 0.5 * math.sin(p - i * 0.95)
			d.BackgroundTransparency = 0.18 + 0.62 * (1 - wave)
			local s = 3.6 + 1.4 * wave
			d.Size = UDim2.fromOffset(s, s)
			d.Position = UDim2.fromOffset((i - 1) * 9 + (5 - s) * 0.5, 2.5 + (5 - s) * 0.5)
		end
	end)
	return conn
end

local function dismissOverlay(gui, bar, spinConn)
	pcall(function()
		if spinConn then spinConn:Disconnect() end
		if bar and bar.Parent then
			local target = bar.Position
			for _, ch in ipairs(bar:GetChildren()) do
				if ch:IsA("TextLabel") then
					smoothTween(ch, { TextTransparency = 1 }, 0.28, Enum.EasingStyle.Quad):Play()
				end
			end
			smoothTween(bar, { Position = target + UDim2.fromOffset(0, 10), BackgroundTransparency = 1 }, 0.38, Enum.EasingStyle.Quint):Play()
		end
		_lm_t.delay(0.4, function()
			pcall(function()
				if gui and gui.Parent then gui:Destroy() end
			end)
		end)
	end)
end

local function waitForLocalPlayer()
	local Players = game:GetService("Players")
	local plr = Players.LocalPlayer
	if plr then return plr end
	local t0 = os.clock()
	while not plr and (os.clock() - t0) < 10 do
		pcall(function() RunService.Heartbeat:Wait() end)
		plr = Players.LocalPlayer
	end
	if not plr then
		local ok, res = pcall(function() return Players.PlayerAdded:Wait() end)
		if ok then plr = res end
	end
	return plr
end

-- PlayerGui gets swept by game anti-exploit scripts, so
-- prefer the executor's hidden container and fall back down the chain.
local function lmGuiHosts(plr)
	local hosts = {}
	if type(gethui) == "function" then
		local ok, h = pcall(gethui)
		if ok and typeof(h) == "Instance" then hosts[#hosts + 1] = h end
	end
	local okCore, cg = pcall(function() return game:GetService("CoreGui") end)
	if okCore and typeof(cg) == "Instance" then hosts[#hosts + 1] = cg end
	if plr then
		local okPg, pg = pcall(function()
			return plr:FindFirstChildOfClass("PlayerGui") or plr:WaitForChild("PlayerGui", 5)
		end)
		if okPg and typeof(pg) == "Instance" then hosts[#hosts + 1] = pg end
	end
	return hosts
end

local function lmMountGui(gui, plr)
	if syn and type(syn.protect_gui) == "function" then pcall(syn.protect_gui, gui) end
	if type(protectgui) == "function" then pcall(protectgui, gui) end
	for _, h in ipairs(lmGuiHosts(plr)) do
		local ok = pcall(function() gui.Parent = h end)
		if ok and gui.Parent == h then return true end
	end
	return false
end

local function emptyLoadingGui()
	return { show = function() end, dismiss = function() end }
end

-- Optional preset decoration (glow, rails, …). Override per preset.
local function decorate(bar) end

local function buildLoadingGui()
	local plr = waitForLocalPlayer()
	if not plr then return emptyLoadingGui() end
	local gui = Instance.new("ScreenGui")
	gui.Name = "LuaMore_Loading"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = true
	gui.DisplayOrder = 200
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	if not lmMountGui(gui, plr) then return emptyLoadingGui() end

	local bar = Instance.new("Frame")
	bar.BackgroundColor3 = LOADING_BAR_BG
	bar.BorderSizePixel = 0
	bar.Parent = gui
	layoutBar(bar)
	corner(bar, 12)
	if SHOW_STROKE then stroke(bar, STROKE_COLOR, 1, STROKE_ALPHA) end

	local accent = LOADING_ACCENT
	local spinConn = addDotSpinner(bar, accent)

	local title = Instance.new("TextLabel")
	title.BackgroundTransparency = 1
	title.Position = UDim2.fromOffset(38, 8)
	title.Size = UDim2.new(1, -48, 0, 20)
	title.Font = Enum.Font.GothamMedium
	title.Text = LOADING_TITLE
	title.TextColor3 = Color3.fromRGB(245, 248, 255)
	title.TextSize = isMobile() and 16 or 14
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.TextTruncate = Enum.TextTruncate.AtEnd
	title.Parent = bar

	local sub = Instance.new("TextLabel")
	sub.Name = "Subtitle"
	sub.BackgroundTransparency = 1
	sub.Position = UDim2.fromOffset(38, 26)
	sub.Size = UDim2.new(1, -48, 0, 16)
	sub.Font = Enum.Font.Gotham
	sub.Text = LOADING_SUBTITLE
	sub.TextColor3 = Color3.fromRGB(130, 145, 175)
	sub.TextSize = isMobile() and 12 or 11
	sub.TextXAlignment = Enum.TextXAlignment.Left
	sub.TextTruncate = Enum.TextTruncate.AtEnd
	sub.Parent = bar

	local track = Instance.new("Frame")
	track.Size = UDim2.new(1, -20, 0, 2)
	track.Position = UDim2.new(0, 10, 1, -6)
	track.BackgroundColor3 = TRACK_COLOR
	track.BorderSizePixel = 0
	track.BackgroundTransparency = 0.2
	track.Parent = bar
	corner(track, 99)

	local fill = Instance.new("Frame")
	fill.Size = UDim2.new(0.12, 0, 1, 0)
	fill.BackgroundColor3 = accent
	fill.BorderSizePixel = 0
	fill.Parent = track
	corner(fill, 99)
	smoothTween(fill, { Size = UDim2.new(0.92, 0, 1, 0) }, 3.2, Enum.EasingStyle.Quint):Play()

	decorate(bar)
	animateBarIn(bar)

	return {
		show = function(t, s)
			if t then title.Text = t end
			if s then sub.Text = s end
		end,
		dismiss = function() dismissOverlay(gui, bar, spinConn) end,
	}
end

-- Re-apply the color settings to any mounted instance (guards against
-- a second copy of this preset loading in the same session).
local _lm_raw_build = buildLoadingGui
function buildLoadingGui()
	local result = _lm_raw_build()
	if type(result) ~= "table" then return result end
	pcall(function()
		local Players = game:GetService("Players")
		local plr = Players.LocalPlayer
		local hosts = {}
		if type(gethui) == "function" then
			local ok, h = pcall(gethui)
			if ok and typeof(h) == "Instance" then hosts[#hosts + 1] = h end
		end
		local okCore, cg = pcall(function() return game:GetService("CoreGui") end)
		if okCore and typeof(cg) == "Instance" then hosts[#hosts + 1] = cg end
		if plr then
			local okPg, pg = pcall(function() return plr:FindFirstChildOfClass("PlayerGui") end)
			if okPg and typeof(pg) == "Instance" then hosts[#hosts + 1] = pg end
		end
		local screen = nil
		for _, h in ipairs(hosts) do
			local g = h:FindFirstChild("LuaMore_Loading")
			if g then
				screen = g
				break
			end
		end
		if not screen then return end
		if LOADING_DIM then
			local veil = Instance.new("Frame")
			veil.Name = "LuaMore_LoadingDim"
			veil.Size = UDim2.fromScale(1, 1)
			veil.BackgroundColor3 = LOADING_SCREEN_BG
			veil.BackgroundTransparency = 0.42
			veil.BorderSizePixel = 0
			veil.ZIndex = 0
			veil.Parent = screen
		end
		local bar = screen:FindFirstChildWhichIsA("Frame")
		if bar then
			bar.BackgroundColor3 = LOADING_BAR_BG
			for _, ch in ipairs(bar:GetDescendants()) do
				if ch:IsA("TextLabel") then
					if ch.Name == "Subtitle" then ch.TextColor3 = LOADING_SUBTEXT else ch.TextColor3 = LOADING_TEXT end
				elseif ch:IsA("Frame") and ch.BackgroundTransparency < 1 then
					local parent = ch.Parent
					if parent and parent:IsA("Frame") and parent ~= bar and ch.Size.Y.Scale == 1 then
						ch.BackgroundColor3 = LOADING_ACCENT
					end
				end
			end
		end
	end)
	return result
end

-- ---------------------- run your script ---------------------
local loading = buildLoadingGui()
local url = LOADER_URL
if KEY ~= "" then
	url = url .. (url:find("%?") and "&key=" or "?key=") .. KEY
end
local ok, err = pcall(function()
	loadstring(game:HttpGet(url, true))()
end)
loading.dismiss()
if not ok then
	warn("[LuaMore] script failed to load: " .. tostring(err))
end
