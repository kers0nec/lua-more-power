import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  FileCode2,
  KeyRound,
  Link2,
  Shield,
  Zap,
  Lock,
  Terminal,
  Activity,
  Copy,
  Sparkles,
  Cpu,
  Fingerprint,
} from "lucide-react";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { obfuscateLua, calculateEntropy } from "@/lib/obfuscator.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Next-Gen Lua Obfuscation, Anti-Tamper & Key System" },
      {
        name: "description",
        content:
          "Elite Luau/Lua obfuscation with Polymorphic Virtual Machine, anti-dumper shield, honeypot detection, HWID license keys, and Discord bots.",
      },
      { property: "og:title", content: "LuaMore — Next-Gen Lua Obfuscation & Delivery" },
      {
        property: "og:description",
        content:
          "Polymorphic VM, anti-dumper traps, Zstd/Base85 transport, hardware keys, and 1-line loaders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const securityLayers = [
  {
    icon: Shield,
    title: "V19 Anti-Tamper Shield",
    desc: "Rigorous environment integrity checks for rawget, rawset, bit32, and arithmetic canaries with silent fail-close locks.",
    badge: "CORE SHIELD",
  },
  {
    icon: Cpu,
    title: "Anti-Dumper Protection",
    desc: "Specifically neutralizes MoonSec & Luraph dumpers that intercept table.concat, getfenv, unpack, or debug.info.",
    badge: "ANTI-DUMP",
  },
  {
    icon: Fingerprint,
    title: "Sandbox & Bot Detection",
    desc: "Identifies dummy JobIDs, mock PlaceIDs, crawler usernames, and honeypot server environments instantly.",
    badge: "HONEYPOT GUARD",
  },
  {
    icon: Zap,
    title: "Base85 Buffer Transport",
    desc: "High-density Base85 encoding with native Luau EncodingService/Zstd buffer decompression and universal fallback.",
    badge: "HIGH SPEED",
  },
  {
    icon: KeyRound,
    title: "Hardware ID Licensing",
    desc: "Generate timed or permanent keys bound to hardware fingerprints, with remote blacklisting and revocation.",
    badge: "LICENSE CONTROL",
  },
  {
    icon: Bot,
    title: "Discord Bot Automation",
    desc: "Automate key granting, user management, and embed notifications directly from your Discord server.",
    badge: "DISCORD INTEGRATION",
  },
];

const executors = [
  { name: "Solara", status: "Verified 100%" },
  { name: "Wave", status: "Verified 100%" },
  { name: "Delta", status: "Verified 100%" },
  { name: "Codex", status: "Verified 100%" },
  { name: "Arceus X", status: "Verified 100%" },
  { name: "Fluxus", status: "Verified 100%" },
  { name: "Krnl", status: "Verified 100%" },
  { name: "MacSploit", status: "Verified 100%" },
];

const sampleTemplates: Record<string, string> = {
  basic: `print("Protected by LuaMore v19!")
local player = game:GetService("Players").LocalPlayer
print("Hello, " .. player.Name)`,
  gui: `local Rayfield = loadstring(game:HttpGet('https://sirius.menu/rayfield'))()
local Window = Rayfield:CreateWindow({
  Name = "LuaMore Protected Hub",
  LoadingTitle = "Authenticating...",
  LoadingSubtitle = "by LuaMore"
})
print("UI loaded safely!")`,
  esp: `local function highlight(target)
  if target and target.Character then
    print("Highlighting target: " .. target.Name)
  end
end
highlight(game.Players.LocalPlayer)`,
};

function Home() {
  const [activeTab, setActiveTab] = useState<"demo" | "loader" | "antitamper">("demo");
  const [demoInput, setDemoInput] = useState(sampleTemplates.basic);
  const [demoOutput, setDemoOutput] = useState<string>("");
  const [demoStats, setDemoStats] = useState<{ size: number; entropy: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  function runDemoObfuscation() {
    setIsProcessing(true);
    try {
      const out = obfuscateLua(demoInput);
      setDemoOutput(out);
      setDemoStats({
        size: new TextEncoder().encode(out).length,
        entropy: calculateEntropy(out),
      });
    } catch {
      // Fallback
    } finally {
      setIsProcessing(false);
    }
  }

  function handleCopy(text: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden border-b border-border py-20 lg:py-28">
          <div
            className="grid-bg mask-fade pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
          />
          <div className="absolute left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 h-96 w-[40rem] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="site-section relative z-10 grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div className="rise">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary">
                <Sparkles size={13} />
                <span>LuaMore v19 Engine — Luraph & Aqua Anti-Tamper</span>
              </div>

              <h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Unbreachable script protection & delivery.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Polymorphic Register Virtual Machine, anti-dumper traps, Roblox honeypot detection,
                and high-density Base85 Zstd buffer execution. All in one free workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="btn-primary flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <span>Start for free</span>
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/obfuscators"
                  className="btn-outline flex items-center justify-center gap-2"
                >
                  <Terminal size={15} />
                  <span>Web Obfuscator</span>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Anti-Tamper v19 Active
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Zstd Buffer Transport
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  100% Free Forever
                </span>
              </div>
            </div>

            {/* INTERACTIVE WORKSPACE WIDGET */}
            <div className="rise relative rounded-xl border border-border bg-card/80 p-1 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-secondary/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("demo")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      activeTab === "demo"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Terminal size={13} />
                    Live Obfuscator
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("loader")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      activeTab === "loader"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Link2 size={13} />
                    Loader
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("antitamper")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      activeTab === "antitamper"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Shield size={13} />
                    Anti-Tamper
                  </button>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  live
                </span>
              </div>

              {activeTab === "demo" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-mono">Select Code Preset:</span>
                    <div className="flex gap-2">
                      {["basic", "gui", "esp"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setDemoInput(sampleTemplates[t]);
                            setDemoOutput("");
                          }}
                          className="rounded border border-border/60 px-2 py-0.5 text-[11px] font-mono hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-border bg-background/90 p-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none"
                    placeholder="Enter Lua script..."
                  />

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={runDemoObfuscation}
                      disabled={isProcessing}
                      className="btn-primary py-1.5 px-4 text-xs font-medium flex items-center gap-2"
                    >
                      <Sparkles size={13} />
                      <span>{isProcessing ? "Protecting..." : "Obfuscate Code"}</span>
                    </button>

                    {demoStats && (
                      <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                        <span>
                          Entropy: <strong className="text-primary">{demoStats.entropy}</strong>
                        </span>
                        <span>
                          Size: <strong className="text-foreground">{demoStats.size}B</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {demoOutput && (
                    <div className="relative mt-2 rounded-lg border border-border bg-black/60 p-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40 text-[11px] font-mono text-muted-foreground">
                        <span>Protected Output (Base85 + Zstd Loader)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(demoOutput)}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <pre className="mt-2 max-h-24 overflow-x-auto overflow-y-auto text-[10px] font-mono text-emerald-400/90 whitespace-pre">
                        {demoOutput.slice(0, 300)}...
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "loader" && (
                <div className="p-4 space-y-3 font-mono text-xs">
                  <p className="text-muted-foreground">1-Line Production Loader:</p>
                  <div className="rounded-lg border border-border bg-black/70 p-3 text-primary">
                    <code>
                      script_key = &quot;YOUR_HWID_KEY&quot;
                      <br />
                      loadstring(game:HttpGet(&quot;https://luamore.app/api/public/r/LM9281x&quot;))()
                    </code>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px]">
                    <div className="rounded border border-border p-2 bg-secondary/30">
                      <span className="block text-muted-foreground">Speed</span>
                      <strong className="text-foreground">24ms</strong>
                    </div>
                    <div className="rounded border border-border p-2 bg-secondary/30">
                      <span className="block text-muted-foreground">Delivery</span>
                      <strong className="text-foreground">Global CDN</strong>
                    </div>
                    <div className="rounded border border-border p-2 bg-secondary/30">
                      <span className="block text-muted-foreground">Security</span>
                      <strong className="text-primary">HWID Bound</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "antitamper" && (
                <div className="p-4 space-y-2.5 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Basic Environment Validation</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Anti-Dumper table.concat Traps</span>
                    <span className="text-emerald-400">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Roblox Honeypot PlaceId Detector</span>
                    <span className="text-emerald-400">ARMED</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Arithmetic Canary Invariants</span>
                    <span className="text-emerald-400">VERIFIED</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fail-Close Hardlock Fallback</span>
                    <span className="text-emerald-400">ENABLED</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/80 px-4 py-2.5 bg-secondary/30 rounded-b-lg text-[11px] font-mono text-muted-foreground">
                <span>LuaMore v19 Architecture</span>
                <Link
                  to="/obfuscators"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <span>Open Full Studio</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECURITY MATRIX SECTION */}
        <section className="site-section py-20 md:py-24">
          <div className="max-w-2xl">
            <span className="eyebrow text-primary">Multi-Layer Architecture</span>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">
              Engineered to defeat reverse engineers and dumpers.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Standard obfuscators rely on simple string replacement. LuaMore constructs an
              impenetrable virtual machine with active anti-dumper canaries and sandbox detection.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {securityLayers.map((layer) => {
              const Icon = layer.icon;
              return (
                <div
                  key={layer.title}
                  className="rounded-xl border border-border bg-card/60 p-6 transition-all hover:border-primary/50 hover:bg-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Icon size={20} />
                    </div>
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5">
                      {layer.badge}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl">{layer.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{layer.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* EXECUTOR COMPATIBILITY GRID */}
        <section className="border-y border-border bg-secondary/40 py-16">
          <div className="site-section">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="eyebrow text-primary">Compatibility</span>
                <h3 className="mt-2 font-display text-3xl">Tested on every major executor.</h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Dual fallback execution guarantees your script runs identically whether on Solara,
                Wave, Codex, Delta, or Mac.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {executors.map((ex) => (
                <div
                  key={ex.name}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/80 px-4 py-3 font-mono text-xs"
                >
                  <span className="font-semibold text-foreground">{ex.name}</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check size={12} />
                    {ex.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING & CALL TO ACTION */}
        <section className="site-section py-20 md:py-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-primary/50 bg-gradient-to-b from-card to-background p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="text-center">
              <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
                100% Free Forever
              </span>
              <h2 className="mt-4 font-display text-4xl sm:text-5xl">
                Deploy your script in seconds.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground leading-relaxed">
                No credit cards. No tiers. Unlimited scripts, license keys, hardware locking,
                Discord integration, and hosted delivery for all creators.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/register"
                  className="btn-primary flex items-center gap-2 px-8 py-3 text-sm"
                >
                  <span>Create Account</span>
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/obfuscators"
                  className="btn-outline flex items-center gap-2 px-6 py-3 text-sm"
                >
                  <span>Try Web Obfuscator</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
