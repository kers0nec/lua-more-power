import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  Copy,
  Terminal,
  Shield,
  Zap,
  KeyRound,
  Bot,
  Layers,
  ArrowRight,
  ExternalLink,
  Code2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { obfuscatePublicCode } from "@/lib/scripts.functions";
import { DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Luau Delivery & Obfuscation Infrastructure" },
      {
        name: "description",
        content:
          "Ship your script. Keep your source. LuaMore turns a Luau file into a key-gated, device-locked loadstring with layered VM obfuscation — and hands your Discord server a whitelist panel to run it all.",
      },
      { property: "og:title", content: "LuaMore — Luau Delivery & Obfuscation" },
      {
        property: "og:description",
        content:
          "Protected Luau delivery, Polymorphic Register VM obfuscation, HWID locking, and Discord whitelist panels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const SAMPLE_SCRIPTS: Record<string, string> = {
  basic: `print("Protected with LuaMore Obfuscator!")
local player = game:GetService("Players").LocalPlayer
print("Authenticated user: " .. player.Name)`,
  rayfield: `local Rayfield = loadstring(game:HttpGet('https://sirius.menu/rayfield'))()
local Window = Rayfield:CreateWindow({
  Name = "LuaMore Script Hub",
  LoadingTitle = "Verifying License...",
  LoadingSubtitle = "Protected by LuaMore",
  ConfigurationSaving = { Enabled = true, FolderName = "LuaMoreHub" }
})
print("UI loaded safely without decompilation risk!")`,
  teleport: `local function safeTeleport(cframe)
  local char = game:GetService("Players").LocalPlayer.Character
  if char and char:FindFirstChild("HumanoidRootPart") then
    char.HumanoidRootPart.CFrame = cframe
  end
end
safeTeleport(CFrame.new(0, 50, 0))`,
};

const FEATURES = [
  {
    title: "Script hosting",
    body: "Paste or upload a .lua / .luau file. LuaMore stores it and serves it only through your protected endpoint.",
  },
  {
    title: "Instant hosting",
    body: "Paste or upload a Luau file of any size and get a protected loadstring link back immediately.",
  },
  {
    title: "HWID whitelist",
    body: "The first execution binds a key to that device's client ID. Mismatched devices are rejected and logged with their IP.",
  },
  {
    title: "Discord panel",
    body: "View Script, Get Key, Redeem Key, View Stats, Reset HWID and Get Buyer Role — all as buttons in your server.",
  },
  {
    title: "Free & paid keys",
    body: "Toggle a one-time 24-hour free key per script, or have your mods issue paid keys with /whitelist @user 10d.",
  },
  {
    title: "Execution stats",
    body: "Every load attempt is logged: key, HWID, IP, success or the exact rejection reason.",
  },
];

const BOT_COMMANDS = [
  ["/panel", "post the whitelist panel"],
  ["/whitelist @user 10d", "issue a paid key"],
  ["/link <api_key>", "link a hosted script to this server"],
  ["/unlink <api_key>", "unlink it again"],
  ["/freekeysettings", "enable or disable the free 24h key"],
  ["/key lookup <key>", "inspect key status, bound HWID & expiry"],
];

function HomePage() {
  // Obfuscator Playground State
  const [sourceCode, setSourceCode] = useState(SAMPLE_SCRIPTS.basic);
  const [obfuscatedOutput, setObfuscatedOutput] = useState<string>("");
  const [isObfuscating, setIsObfuscating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dualVm, setDualVm] = useState(true);
  const [oeldAntiTamper, setOeldAntiTamper] = useState(true);
  const [obfStats, setObfStats] = useState<{
    size: number;
    sourceSize: number;
    entropy: number;
    layers: number;
  } | null>(null);

  // Discord Panel Simulator State
  const [simProjectName, setSimProjectName] = useState("j");
  const [simFreeKeyEnabled, setSimFreeKeyEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [simRedeemKeyInput, setSimRedeemKeyInput] = useState("");
  const [simToast, setSimToast] = useState<string | null>(null);

  const handleObfuscate = async () => {
    if (!sourceCode.trim()) return;
    setIsObfuscating(true);
    try {
      const res = await obfuscatePublicCode({
        data: {
          code: sourceCode,
          dualVm,
          oeldAntiTamper,
        },
      });
      setObfuscatedOutput(res.obfuscated);
      setObfStats({
        size: res.size,
        sourceSize: res.sourceSize,
        entropy: res.entropy,
        layers: res.layers,
      });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setObfuscatedOutput(`-- Error during obfuscation: ${message}`);
    } finally {
      setIsObfuscating(false);
    }
  };

  const showSimToast = (msg: string) => {
    setSimToast(msg);
    setTimeout(() => setSimToast(null), 3500);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SiteNav />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="grid-lines border-b border-border/60">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  Luau delivery & obfuscation infrastructure
                </p>
                <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl leading-tight">
                  Ship your script.
                  <br />
                  Keep your source.
                </h1>
                <p className="mt-5 max-w-xl text-base text-muted-foreground leading-relaxed">
                  LuaMore turns a Luau file into a key-gated, device-locked loadstring with layered
                  VM obfuscation — and hands your Discord server a whitelist panel to run it all.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to="/auth"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 font-mono text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Host a script
                  </Link>
                  <a
                    href="#obfuscator"
                    className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2.5 font-mono text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
                  >
                    LuaMore Obfuscator
                  </a>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center justify-center rounded-md px-4 py-2.5 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"
                  >
                    Open dashboard
                  </Link>
                </div>
              </div>

              {/* CODE BOX COMPONENT */}
              <div className="overflow-hidden rounded-md border border-border bg-[oklch(0.13_0.01_260)] shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-3.5 py-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span>what your users run</span>
                  <span className="flex items-center gap-1.5 text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary inline-block animate-pulse" />
                    live endpoint
                  </span>
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground">
                  <span className="text-muted-foreground">_G</span>.KEY ={" "}
                  <span className="text-primary">"LMK-9fQx2mTvKdRa"</span>
                  {"\n"}
                  <span className="text-blue-400">loadstring</span>(game:
                  <span className="text-amber-300">HttpGet</span>({"\n"}{" "}
                  <span className="text-emerald-400">"https://luamore.app/l/8f0b3629"</span>
                  {"\n"}))()
                  {"\n"}
                  <span className="text-muted-foreground">--&gt; key checked</span>
                  {"\n"}
                  <span className="text-muted-foreground">--&gt; hwid bound to this device</span>
                  {"\n"}
                  <span className="text-muted-foreground">--&gt; ip logged</span>
                  {"\n"}
                  <span className="text-muted-foreground">--&gt; script source returned</span>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="border-b border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-6 text-center">
              <p className="font-mono text-3xl font-bold text-primary">3,420+</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                People hosting
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-6 text-center">
              <p className="font-mono text-3xl font-bold text-primary">28,950+</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                Scripts hosted
              </p>
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-6 pb-12 text-center">
            <Link
              to="/vault"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 font-mono text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-muted"
            >
              Open your Source Vault <ArrowRight className="ml-1.5 h-3.5 w-3.5 text-primary" />
            </Link>
          </div>
        </section>

        {/* DISCORD WHITELIST PANEL PREVIEW (IMG_7322 EXACT REPLICA) */}
        <section className="border-b border-border/60 py-20 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                COMMUNITY INTEGRATION
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Discord Whitelist Panel
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Deploy interactive panels to your Discord server with working slash commands and
                buttons. Try clicking the simulator below:
              </p>
            </div>

            {/* Simulated Discord Window */}
            <div className="mx-auto max-w-xl rounded-xl bg-[#313338] p-5 shadow-2xl border border-[#3f4147] text-white font-sans">
              {/* Discord channel indicator */}
              <div className="flex items-center justify-between border-b border-[#3f4147] pb-3 mb-4 text-xs text-[#949ba4]">
                <div className="flex items-center gap-2">
                  <span className="text-base text-white font-semibold"># whitelist-panel</span>
                  <span className="hidden sm:inline">| Project: {simProjectName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSimFreeKeyEnabled(!simFreeKeyEnabled)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#2b2d31] hover:bg-[#383a40] text-emerald-400 border border-border"
                  >
                    Toggle Free Key ({simFreeKeyEnabled ? "ON" : "OFF"})
                  </button>
                </div>
              </div>

              {/* Bot author row matching IMG_7322 */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="h-9 w-9 rounded-full bg-black flex items-center justify-center text-[#84cc16] text-xs font-mono font-bold shrink-0 border border-[#84cc16]/50 shadow-inner">
                  &#123;&#125;
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-white hover:underline cursor-pointer">
                    LuaMore
                  </span>
                  <span className="bg-[#5865F2] text-[10px] text-white font-bold px-1 py-0.5 rounded leading-none">
                    APP
                  </span>
                  <span className="text-[11px] text-[#949ba4] ml-1">01/09/2026 02:38</span>
                </div>
              </div>

              {/* Embed Body with Lime Green Border (IMG_7322 exact) */}
              <div className="ml-11 rounded bg-[#1e1f22] border-l-4 border-[#84cc16] p-3 text-xs space-y-2">
                <h4 className="text-sm font-bold text-white tracking-wide">
                  LuaMore — {simProjectName}
                </h4>
                <p className="text-[#dbdee1] leading-relaxed whitespace-pre-line text-xs font-normal">
                  Whitelist panel. Use the buttons below to get a key, view the loader, check your
                  stats, or reset your device lock.
                  {"\n\n"}
                  Free key: {simFreeKeyEnabled ? "enabled" : "disabled"}
                </p>
              </div>

              {/* Action Rows / Buttons exactly matching IMG_7322 */}
              <div className="ml-11 mt-3 space-y-2 text-xs font-medium">
                {/* Row 1: View Script & Get Key (Blurple) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveModal("view-script")}
                    className="flex items-center justify-center gap-1.5 rounded bg-[#5865f2] hover:bg-[#4752c4] py-2 text-white cursor-pointer select-none transition-colors font-medium shadow-sm active:translate-y-0.5"
                  >
                    <span>📜</span> View Script
                  </button>
                  <button
                    onClick={() => setActiveModal("get-key")}
                    className="flex items-center justify-center gap-1.5 rounded bg-[#5865f2] hover:bg-[#4752c4] py-2 text-white cursor-pointer select-none transition-colors font-medium shadow-sm active:translate-y-0.5"
                  >
                    <span>🔑</span> Get Key
                  </button>
                </div>

                {/* Row 2: Redeem Key (Grey) */}
                <div>
                  <button
                    onClick={() => setActiveModal("redeem-key")}
                    className="w-full flex items-center justify-center gap-1.5 rounded bg-[#4e5058] hover:bg-[#6d6f78] py-2 text-white cursor-pointer select-none transition-colors font-medium shadow-sm active:translate-y-0.5"
                  >
                    <span>✅</span> Redeem Key
                  </button>
                </div>

                {/* Row 3: View Stats & Reset HWID (Grey) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveModal("view-stats")}
                    className="flex items-center justify-center gap-1.5 rounded bg-[#4e5058] hover:bg-[#6d6f78] py-2 text-white cursor-pointer select-none transition-colors font-medium shadow-sm active:translate-y-0.5"
                  >
                    <span>📊</span> View Stats
                  </button>
                  <button
                    onClick={() => setActiveModal("reset-hwid")}
                    className="flex items-center justify-center gap-1.5 rounded bg-[#4e5058] hover:bg-[#6d6f78] py-2 text-white cursor-pointer select-none transition-colors font-medium shadow-sm active:translate-y-0.5"
                  >
                    <span>♻️</span> Reset HWID
                  </button>
                </div>

                {/* Row 4: Get Buyer Role (Green) */}
                <div>
                  <button
                    onClick={() => setActiveModal("buyer-role")}
                    className="w-full flex items-center justify-center gap-1.5 rounded bg-[#23a55a] hover:bg-[#1a7f45] py-2 text-white cursor-pointer select-none transition-colors font-medium shadow-sm active:translate-y-0.5"
                  >
                    <span>🏅</span> Get Buyer Role
                  </button>
                </div>
              </div>

              {/* Toast Feedback */}
              {simToast && (
                <div className="mt-4 rounded-md bg-black/60 border border-primary/40 px-3 py-2 text-xs font-mono text-primary text-center animate-fade-in">
                  {simToast}
                </div>
              )}
            </div>

            {/* Modal Dialog for Discord Button Interactions */}
            {activeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-lg bg-[#313338] border border-[#3f4147] p-5 text-white font-sans shadow-2xl">
                  {activeModal === "view-script" && (
                    <div>
                      <h3 className="text-base font-bold text-white mb-2">📜 Protected Loader</h3>
                      <p className="text-xs text-[#949ba4] mb-3">
                        Private 1-line loadstring for your script:
                      </p>
                      <pre className="overflow-x-auto rounded bg-[#1e1f22] p-3 font-mono text-xs text-primary border border-border/40">
                        {`script_key = "LMK-YOUR-KEY";\nloadstring(game:HttpGet("https://luamore.app/l/8f0b3629"))()`}
                      </pre>
                    </div>
                  )}

                  {activeModal === "get-key" && (
                    <div>
                      <h3 className="text-base font-bold text-white mb-2">🔑 License Key</h3>
                      <p className="text-xs text-[#949ba4] mb-3">
                        {simFreeKeyEnabled
                          ? "Here is your 24-hour free trial key:"
                          : "Here is your key for LuaMore:"}
                      </p>
                      <div className="rounded bg-[#1e1f22] p-3 font-mono text-sm text-[#84cc16] border border-[#84cc16]/30 select-all text-center">
                        LMK-9FQX-2MTV-KDRA
                      </div>
                      <p className="mt-2 text-[11px] text-[#949ba4]">
                        Click <b>Redeem Key</b> on the panel to link it to your Discord ID.
                      </p>
                    </div>
                  )}

                  {activeModal === "redeem-key" && (
                    <div>
                      <h3 className="text-base font-bold text-white mb-2">✅ Redeem LuaMore Key</h3>
                      <label className="text-xs text-[#949ba4] block mb-1">
                        Enter your license key:
                      </label>
                      <input
                        value={simRedeemKeyInput}
                        onChange={(e) => setSimRedeemKeyInput(e.target.value)}
                        placeholder="LMK-XXXX-XXXX-XXXX"
                        className="w-full rounded bg-[#1e1f22] border border-[#3f4147] px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-primary"
                      />
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            showSimToast(
                              `Key ${simRedeemKeyInput || "LMK-9FQX-..."} redeemed successfully!`,
                            );
                            setActiveModal(null);
                            setSimRedeemKeyInput("");
                          }}
                          className="rounded bg-[#5865f2] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#4752c4]"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}

                  {activeModal === "view-stats" && (
                    <div>
                      <h3 className="text-base font-bold text-white mb-2">📊 Panel Stats</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="rounded bg-[#1e1f22] p-3 border border-border/40">
                          <p className="text-[#949ba4]">Executions</p>
                          <p className="text-lg font-bold text-primary mt-1">1,492</p>
                        </div>
                        <div className="rounded bg-[#1e1f22] p-3 border border-border/40">
                          <p className="text-[#949ba4]">Active Keys</p>
                          <p className="text-lg font-bold text-white mt-1">328</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeModal === "reset-hwid" && (
                    <div>
                      <h3 className="text-base font-bold text-white mb-2">♻️ Reset HWID</h3>
                      <p className="text-xs text-[#dbdee1] mb-4">
                        Your device lock has been cleared. The next execution will bind your key to
                        your current device.
                      </p>
                      <button
                        onClick={() => {
                          showSimToast("HWID reset successfully! Ready for new device.");
                          setActiveModal(null);
                        }}
                        className="w-full rounded bg-[#23a55a] py-2 text-xs font-semibold text-white hover:bg-[#1a7f45]"
                      >
                        Confirm Reset
                      </button>
                    </div>
                  )}

                  {activeModal === "buyer-role" && (
                    <div>
                      <h3 className="text-base font-bold text-white mb-2">🏅 Buyer Role Granted</h3>
                      <p className="text-xs text-[#dbdee1]">
                        Verified whitelist! The{" "}
                        <span className="text-[#5865f2] font-semibold">@Buyer</span> role has been
                        granted to your Discord account.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="rounded bg-[#4e5058] hover:bg-[#6d6f78] px-3.5 py-1.5 text-xs text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* LUAMORE OBFUSCATOR PLAYGROUND SECTION */}
        <section id="obfuscator" className="border-b border-border/60 bg-card/40 py-20 px-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                  POLYMORPHIC REGISTER VM
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  LuaMore Obfuscator
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                  Test the in-browser LuaMore v18 Register VM. Guaranteed 0 errors across Solara,
                  Wave, Delta, Codex, Arceus X, and Krnl.
                </p>
              </div>

              {/* Template Selectors */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">Preset:</span>
                <button
                  onClick={() => setSourceCode(SAMPLE_SCRIPTS.basic)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary"
                >
                  Basic
                </button>
                <button
                  onClick={() => setSourceCode(SAMPLE_SCRIPTS.rayfield)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary"
                >
                  Rayfield UI
                </button>
                <button
                  onClick={() => setSourceCode(SAMPLE_SCRIPTS.teleport)}
                  className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary"
                >
                  Teleport
                </button>
              </div>
            </div>

            {/* Obfuscator Options Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-t-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={dualVm}
                    onChange={(e) => setDualVm(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span>Dual-VM Architecture</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={oeldAntiTamper}
                    onChange={(e) => setOeldAntiTamper(e.target.checked)}
                    className="accent-primary rounded"
                  />
                  <span>OELD Anti-Tamper</span>
                </label>
                <span className="text-muted-foreground hidden sm:inline">|</span>
                <span className="text-primary font-semibold">100% Executor Compatibility</span>
              </div>

              <button
                onClick={handleObfuscate}
                disabled={isObfuscating}
                className="btn-primary py-1.5 px-4 font-mono text-xs font-semibold flex items-center gap-2"
              >
                {isObfuscating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Obfuscating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Obfuscate with LuaMore
                  </>
                )}
              </button>
            </div>

            {/* Code Editors Grid */}
            <div className="grid lg:grid-cols-2 rounded-b-lg border-x border-b border-border bg-[oklch(0.13_0.01_260)] overflow-hidden">
              {/* Input Editor */}
              <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border">
                <div className="flex items-center justify-between border-b border-border/60 bg-card/30 px-4 py-2 font-mono text-xs text-muted-foreground">
                  <span>Source Luau Script</span>
                  <span>{sourceCode.length} bytes</span>
                </div>
                <textarea
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder="-- Paste Luau script here..."
                  className="h-80 w-full resize-none bg-transparent p-4 font-mono text-xs text-foreground focus:outline-none leading-relaxed"
                />
              </div>

              {/* Output Editor */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between border-b border-border/60 bg-card/30 px-4 py-2 font-mono text-xs text-muted-foreground">
                  <span>Protected Bytecode Output</span>
                  {obfuscatedOutput && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(obfuscatedOutput);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-1 text-primary hover:underline text-xs"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy Output"}
                    </button>
                  )}
                </div>
                <textarea
                  readOnly
                  value={
                    obfuscatedOutput ||
                    "-- Click 'Obfuscate with LuaMore' to generate protected code..."
                  }
                  className="h-80 w-full resize-none bg-transparent p-4 font-mono text-xs text-emerald-400 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Obfuscation Metrics Bar */}
            {obfStats && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="rounded-md border border-border bg-card p-3">
                  <span className="text-muted-foreground">Original Size:</span>
                  <span className="ml-2 font-bold text-foreground">{obfStats.sourceSize} B</span>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <span className="text-muted-foreground">Protected Size:</span>
                  <span className="ml-2 font-bold text-primary">{obfStats.size} B</span>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <span className="text-muted-foreground">Entropy:</span>
                  <span className="ml-2 font-bold text-emerald-400">
                    {obfStats.entropy.toFixed(2)} / 8.0
                  </span>
                </div>
                <div className="rounded-md border border-border bg-card p-3">
                  <span className="text-muted-foreground">VM Layers:</span>
                  <span className="ml-2 font-bold text-primary">{obfStats.layers} Layers</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* EVERYTHING IN ONE PLACE (LUASPEC 6 CARDS) */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-bold tracking-tight">Everything in one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <h3 className="font-mono text-sm font-semibold text-primary">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* BOT COMMANDS SECTION (LUASPEC COMMANDS) */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold tracking-tight">Bot commands</h2>
            <div className="mt-6 grid gap-3 font-mono text-sm sm:grid-cols-2">
              {BOT_COMMANDS.map(([cmd, desc]) => (
                <div
                  key={cmd}
                  className="flex flex-col gap-1 rounded-md border border-border bg-background p-4"
                >
                  <span className="text-primary font-semibold">{cmd}</span>
                  <span className="font-sans text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
