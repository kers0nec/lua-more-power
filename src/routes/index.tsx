import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  FileCode2,
  KeyRound,
  Shield,
  Zap,
  Lock,
  Terminal,
  Activity,
  Copy,
  Sparkles,
  Cpu,
  Fingerprint,
  ChevronDown,
  Layers,
  Flame,
} from "lucide-react";
import { useState } from "react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { obfuscateLua, calculateEntropy } from "@/lib/obfuscator.server";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — The Modern Standard for Lua & Luau Script Protection" },
      {
        name: "description",
        content:
          "Elite Luau and Lua script obfuscation with Polymorphic Register VM, OELD multi-key chunked anti-tamper, HWID key licensing, and Discord bot automation.",
      },
      { property: "og:title", content: "LuaMore — Next-Gen Script Protection & Delivery" },
      {
        property: "og:description",
        content:
          "Protect your Lua scripts against reverse engineering, decompilers, and dumpers. 100% free and compatible across all major executors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const securityFeatures = [
  {
    icon: Cpu,
    title: "Polymorphic Virtual Machine",
    desc: "Transforms standard Luau bytecode into randomized opcode dispatch tables and custom virtual registers, rendering decompilers and disassemblers completely useless.",
    tag: "VIRTUAL MACHINE",
  },
  {
    icon: Shield,
    title: "OELD Multi-Key Anti-Tamper",
    desc: "Splits payloads into encrypted memory chunks with randomized runtime keys, dynamic unrolling, watermark integrity, and periodic heartbeat verification.",
    tag: "ANTI-TAMPER",
  },
  {
    icon: Fingerprint,
    title: "Anti-Dumper & Honeypot Guard",
    desc: "Detects sandbox environments, zero JobIDs, crawler accounts, mock PlaceIDs, and active hooking on table.concat, getfenv, or debug.",
    tag: "HONEYPOT SHIELD",
  },
  {
    icon: KeyRound,
    title: "HWID & License Management",
    desc: "Bind loaders to player hardware fingerprints with duration expiration, custom key whitelists, reset quotas, and remote blacklisting.",
    tag: "KEY SYSTEM",
  },
  {
    icon: Bot,
    title: "Discord Bot Automation",
    desc: "Full Discord bot integration with slash commands (/whitelist, /resethwid, /key) and branded embed panels for your community.",
    tag: "DISCORD BOT",
  },
  {
    icon: Zap,
    title: "Universal 1-Line Loader",
    desc: "Global CDN delivery with zero runtime lag. Fully tested and guaranteed to execute smoothly across mobile, PC, and Mac executors.",
    tag: "FAST CDN",
  },
];

const executors = [
  { name: "Solara", version: "v3+", status: "100% Verified" },
  { name: "Wave", version: "Latest", status: "100% Verified" },
  { name: "Delta", version: "Mobile/PC", status: "100% Verified" },
  { name: "Codex", version: "Android/iOS", status: "100% Verified" },
  { name: "Arceus X", version: "Neo", status: "100% Verified" },
  { name: "Fluxus", version: "Universal", status: "100% Verified" },
  { name: "Krnl", version: "Latest", status: "100% Verified" },
  { name: "MacSploit", version: "macOS", status: "100% Verified" },
];

const sampleTemplates: Record<string, string> = {
  basic: `print("Protected with LuaMore OELD Anti-Tamper!")
local player = game:GetService("Players").LocalPlayer
print("Authenticated user: " .. player.Name)`,
  gui: `local Rayfield = loadstring(game:HttpGet('https://sirius.menu/rayfield'))()
local Window = Rayfield:CreateWindow({
  Name = "LuaMore Script Hub",
  LoadingTitle = "Verifying License...",
  LoadingSubtitle = "Protected by LuaMore"
})
print("UI loaded safely!")`,
  teleport: `local function safeTeleport(cframe)
  local char = game.Players.LocalPlayer.Character
  if char and char:FindFirstChild("HumanoidRootPart") then
    char.HumanoidRootPart.CFrame = cframe
  end
end
safeTeleport(CFrame.new(0, 50, 0))`,
};

const faqs = [
  {
    q: "How does the OELD Anti-Tamper protect my script?",
    a: "OELD divides your compiled bytecode into multiple independent chunks, each encrypted with unique randomized runtime keys. It verifies watermark integrity, standard-library invariants, and performs periodic heartbeat checks in Roblox while checking for honeypots.",
  },
  {
    q: "Will my scripts execute on mobile executors like Delta and Codex?",
    a: "Yes! LuaMore includes universal loadstring and environment resolvers with dual VM fallback support, ensuring seamless execution across Solara, Wave, Delta, Codex, Arceus X, Fluxus, and MacSploit.",
  },
  {
    q: "Is LuaMore really 100% free to use?",
    a: "Yes, LuaMore provides unlimited script hosting, obfuscation, Discord bot integration, and HWID key generation for all developers.",
  },
  {
    q: "Can I reset user HWIDs or blacklist leaked keys?",
    a: "Absolutely. The dashboard and Discord bot commands (/resethwid and /blacklist) give you instant real-time control over every generated key and device binding.",
  },
];

function Home() {
  const [activeTab, setActiveTab] = useState<"source" | "protected">("source");
  const [demoInput, setDemoInput] = useState(sampleTemplates.basic);
  const [demoOutput, setDemoOutput] = useState<string>("");
  const [demoStats, setDemoStats] = useState<{ size: number; entropy: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function runDemoObfuscation() {
    setIsProcessing(true);
    try {
      const out = obfuscateLua(demoInput);
      setDemoOutput(out);
      setDemoStats({
        size: new TextEncoder().encode(out).length,
        entropy: calculateEntropy(out),
      });
      setActiveTab("protected");
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary">
      <SiteNav />

      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-border/80">
          <div
            className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]"
            aria-hidden
          />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[25rem] bg-primary/15 rounded-full blur-3xl pointer-events-none" />

          <div className="site-section relative z-10 text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur-md">
              <Sparkles size={13} className="text-primary" />
              <span>Next-Generation Luau Protection & Anti-Tamper</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-6 font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.08]">
              The Modern Solution to <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-primary to-indigo-300">
                Lua Script Protection.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
              Protect your Lua scripts against reverse engineering, decompilers, and dumpers.
              Featuring Polymorphic Register VM, OELD multi-key chunked anti-tamper, and instant
              HWID licensing.
            </p>

            {/* Call To Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                to="/register"
                className="w-full sm:w-auto btn-primary py-3 px-8 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/obfuscators"
                className="w-full sm:w-auto btn-outline py-3 px-6 text-sm font-medium flex items-center justify-center gap-2 bg-card/80 hover:bg-card border-border hover:border-primary/50"
              >
                <Terminal size={16} />
                <span>Web Obfuscator</span>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="mt-12 pt-8 border-t border-border/50 grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">10K+</p>
                <p className="text-xs text-muted-foreground mt-0.5">Scripts Protected</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-400">
                  99.9%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Deobfuscator Failure</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-primary">100%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Executor Compatibility</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold text-indigo-400">
                  &lt;1ms
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Runtime Overhead</p>
              </div>
            </div>
          </div>

          {/* CODE DEMO SHOWCASE */}
          <div className="site-section mt-14 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border bg-card/90 shadow-2xl overflow-hidden backdrop-blur-md">
              {/* Window Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-secondary/60">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <span className="ml-2 text-xs font-mono text-muted-foreground">
                    LuaMore Studio Demo
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex rounded-md bg-background/80 p-0.5 border border-border text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setActiveTab("source")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        activeTab === "source"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Original Script
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("protected")}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        activeTab === "protected"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Protected Output
                    </button>
                  </div>
                </div>
              </div>

              {/* Code Panel Body */}
              <div className="p-4 sm:p-5">
                {activeTab === "source" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">Preset Template:</span>
                      <div className="flex gap-2">
                        {["basic", "gui", "teleport"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setDemoInput(sampleTemplates[t]);
                              setDemoOutput("");
                            }}
                            className="rounded border border-border/70 px-2 py-0.5 text-[11px] font-mono hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={demoInput}
                      onChange={(e) => setDemoInput(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-border bg-black/50 p-3 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Paste your Lua script here..."
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={runDemoObfuscation}
                        disabled={isProcessing}
                        className="btn-primary py-2 px-5 text-xs font-medium flex items-center gap-2 shadow-md shadow-primary/20"
                      >
                        <Sparkles size={13} />
                        <span>{isProcessing ? "Protecting with OELD..." : "Protect Script"}</span>
                      </button>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Includes OELD Multi-Key & VM Layer
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400">Hardened OELD Bytecode</span>
                        {demoStats && (
                          <span className="text-muted-foreground text-[11px]">
                            ({demoStats.size} bytes, H={demoStats.entropy})
                          </span>
                        )}
                      </div>

                      {demoOutput && (
                        <button
                          type="button"
                          onClick={() => handleCopy(demoOutput)}
                          className="btn-outline py-1 px-2.5 text-[11px] flex items-center gap-1.5"
                        >
                          {copied ? (
                            <>
                              <Check size={12} className="text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy Code
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-black/70 p-3 max-h-48 overflow-y-auto">
                      <pre className="font-mono text-[11px] text-emerald-400/90 whitespace-pre-wrap break-all">
                        {demoOutput ||
                          `--[[ Click "Protect Script" on the left tab to generate instant protected payload ]]
-- Protected using LuaMore Obfuscator
-- Includes multi-key chunked loader, LuaMore Obfuscator watermark verification,
-- anti-sandbox honeypot traps, and polymorphic register VM.`}
                      </pre>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTab("source")}
                        className="text-primary hover:underline text-xs"
                      >
                        ← Edit Original Code
                      </button>
                      <Link
                        to="/register"
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1"
                      >
                        Get Started Free <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="site-section py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold tracking-wider text-primary uppercase">
              Military-Grade Defense
            </span>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Engineered to defeat reverse engineers and dumpers.
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Standard obfuscators rely on simple string replacement. LuaMore constructs an
              impenetrable register VM with active honeypot traps and multi-key encryption.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {securityFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-xl border border-border bg-card/70 p-6 transition-all hover:border-primary/50 hover:bg-card hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Icon size={20} />
                    </div>
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* EXECUTOR COMPATIBILITY */}
        <section className="border-y border-border bg-secondary/30 py-16">
          <div className="site-section">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-semibold tracking-wider text-primary uppercase">
                  Universal Compatibility
                </span>
                <h3 className="mt-2 font-display text-3xl font-bold text-foreground">
                  Tested on every major executor.
                </h3>
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
                  className="flex items-center justify-between rounded-lg border border-border bg-card/90 px-4 py-3 font-mono text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground block">{ex.name}</span>
                    <span className="text-[10px] text-muted-foreground">{ex.version}</span>
                  </div>
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                    <Check size={13} />
                    {ex.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS (3 STEPS) */}
        <section className="site-section py-20 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-mono font-semibold tracking-wider text-primary uppercase">
              Simple Workflow
            </span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold">
              Protect and deploy in three simple steps.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/60 p-6 relative">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-mono font-bold flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h3 className="font-display text-lg font-bold">Input Your Script</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Paste your raw Luau or Lua 5.1 script or link your hosted script project in the
                dashboard.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-6 relative">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-mono font-bold flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h3 className="font-display text-lg font-bold">Apply OELD Protection</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                LuaMore compiles your code into a Polymorphic VM with chunked multi-key encryption
                and anti-tamper guards.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/60 p-6 relative">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-mono font-bold flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h3 className="font-display text-lg font-bold">Deploy 1-Line Loader</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Distribute your protected script via 1-line loadstring with automated HWID checking
                and Discord bot whitelisting.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="site-section pb-20 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-mono font-semibold tracking-wider text-primary uppercase">
              Frequently Asked Questions
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold">
              Got questions? We have answers.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={faq.q}
                  className="rounded-xl border border-border bg-card/70 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-display font-semibold text-sm sm:text-base hover:text-primary transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={18}
                      className={`text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION BANNER */}
        <section className="site-section pb-24">
          <div className="mx-auto max-w-4xl rounded-2xl border border-primary/40 bg-gradient-to-b from-card via-blue-950/20 to-card p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

            <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 font-mono text-xs text-primary font-semibold">
              Ready in under 2 minutes
            </span>
            <h2 className="mt-4 font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Ready to protect your Lua scripts?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
              Join script developers securing their scripts with Polymorphic VM protection, HWID
              licensing, and Discord bot integration.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                to="/register"
                className="w-full sm:w-auto btn-primary py-3 px-8 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/obfuscators"
                className="w-full sm:w-auto btn-outline py-3 px-6 text-sm font-medium flex items-center justify-center gap-2 bg-card/80 hover:bg-card border-border hover:border-primary/50"
              >
                <Terminal size={16} />
                <span>Try Web Obfuscator</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
