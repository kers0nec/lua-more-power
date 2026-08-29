import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  Cpu,
  Clock,
  Bot,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { CopyCode } from "@/components/CopyCode";
import { HumanCheck } from "@/components/HumanCheck";
import { DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/keys")({
  head: () => ({
    meta: [
      { title: "Key System — LuaMore" },
      {
        name: "description",
        content:
          "Advanced Luau license keys, HWID binding, duration timers, anti-bypass checks, and Discord mapping — 100% free on LuaMore.",
      },
    ],
  }),
  component: KeysPage,
});

function randomKeyChunk() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let str = "";
  for (let i = 0; i < 4; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

function generateDemoKey() {
  return `LM-${randomKeyChunk()}-${randomKeyChunk()}-${randomKeyChunk()}`;
}

function KeysPage() {
  const [testKey, setTestKey] = useState("LM-9K42-X7VP-Q8MR");
  const [testDuration, setTestDuration] = useState("Lifetime");
  const [hwidLock, setHwidLock] = useState(true);
  const [hwidVal, setHwidVal] = useState("WIN-984F-A182-E77C-09B4");
  const [validationResult, setValidationResult] = useState<string | null>(null);
  const [humanOk, setHumanOk] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);

  function handleSimulateGenerate() {
    const newK = generateDemoKey();
    setTestKey(newK);
    setValidationResult(null);
  }

  function handleSimulateValidate() {
    if (!humanOk) {
      setValidationResult("error: Please complete the human verification first.");
      return;
    }
    if (!testKey.startsWith("LM-") || testKey.length < 14) {
      setValidationResult("error: Invalid key format. Key must match LM-XXXX-XXXX-XXXX");
      return;
    }
    setValidationResult(
      `valid: Key ${testKey} is ACTIVE. [Duration: ${testDuration} | HWID: ${hwidLock ? hwidVal : "Unlocked"}]`,
    );
  }

  function copyCurrentKey() {
    navigator.clipboard.writeText(testKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  return (
    <PageShell
      eyebrow="Authentication & Protection"
      title="Advanced Key System"
      subtitle="Issue timed or permanent license keys, lock scripts to single device HWID fingerprints, and automate delivery from Discord or your web dashboard. Free forever."
    >
      {/* Key Feature Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Clock,
            title: "Flexible Durations",
            desc: "Generate Lifetime, 24-Hour, 7-Day, or 30-Day keys with automatic expiry tracking and clock drift tolerance.",
          },
          {
            icon: Cpu,
            title: "HWID Fingerprinting",
            desc: "Binds to the unique hardware signature on first launch. Protects your scripts against sharing and reselling.",
          },
          {
            icon: Bot,
            title: "Discord Bot Sync",
            desc: "Post self-serve redemption panels, slash commands (/createkey, /resethwid), and auto-assign buyer roles.",
          },
          {
            icon: ShieldCheck,
            title: "Anti-Bypass Routing",
            desc: "Encrypted server-side validation streams payload only after key and HWID match verified records.",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="card-blue p-6 flex flex-col justify-between">
              <div>
                <Icon size={22} style={{ color: "var(--primary)" }} />
                <h2 className="mt-4 font-display text-xl font-bold">{f.title}</h2>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {f.desc}
                </p>
              </div>
              <span className="badge-blue mt-4 self-start">Active Feature</span>
            </div>
          );
        })}
      </div>

      {/* Interactive Key Simulator */}
      <div className="mt-14 card-blue p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="badge-solid flex items-center gap-1.5 self-start">
              <Sparkles size={12} /> Interactive Simulator
            </span>
            <h2 className="mt-2 font-display text-3xl">Test Key Generation & Validation</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Experience how LuaMore generates, binds, and validates keys in real-time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSimulateGenerate}
            className="btn-outline flex items-center gap-2"
          >
            <Sparkles size={15} /> Generate New Key
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Key configuration panel */}
          <div
            className="p-5 rounded-xl border space-y-4"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            <div>
              <label className="eyebrow">Generated License Key</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  className="input-blue font-mono font-bold text-sm tracking-wider"
                />
                <button
                  type="button"
                  onClick={copyCurrentKey}
                  className="btn-outline shrink-0 p-2.5"
                  title="Copy Key"
                >
                  {copiedKey ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="eyebrow">Duration</label>
                <select
                  value={testDuration}
                  onChange={(e) => setTestDuration(e.target.value)}
                  className="input-blue mt-2 text-sm"
                >
                  <option>Lifetime</option>
                  <option>24 Hours</option>
                  <option>7 Days</option>
                  <option>30 Days</option>
                </select>
              </div>
              <div>
                <label className="eyebrow">HWID Locking</label>
                <button
                  type="button"
                  onClick={() => setHwidLock(!hwidLock)}
                  className="input-blue mt-2 text-sm text-left flex items-center justify-between"
                >
                  <span>{hwidLock ? "Locked to Device" : "Unlocked"}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: hwidLock ? "var(--primary)" : "#666" }}
                  />
                </button>
              </div>
            </div>

            {hwidLock && (
              <div>
                <label className="eyebrow">Simulated Device HWID</label>
                <input
                  value={hwidVal}
                  onChange={(e) => setHwidVal(e.target.value)}
                  className="input-blue mt-2 font-mono text-xs opacity-80"
                />
              </div>
            )}

            <div className="pt-2">
              <label className="eyebrow mb-2 block">Bot Challenge</label>
              <HumanCheck value={humanOk} onChange={setHumanOk} />
            </div>

            <button
              type="button"
              onClick={handleSimulateValidate}
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
            >
              <Zap size={16} /> Authenticate Key In Simulator
            </button>
          </div>

          {/* Validation preview panel */}
          <div
            className="p-5 rounded-xl border flex flex-col justify-between"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div>
              <span className="eyebrow">Authentication Response</span>
              <div
                className="mt-3 p-4 rounded-lg font-mono text-xs border leading-relaxed"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <div className="text-gray-400">-- LuaMore Authentication Dispatch</div>
                <div className="mt-1">
                  POST /api/public/v1/auth/verify HTTP/1.1
                  <br />
                  Host: luamore.win
                  <br />
                  Authorization: Key {testKey}
                </div>
                <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                  {validationResult ? (
                    validationResult.startsWith("error:") ? (
                      <div className="text-red-400 flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{validationResult.replace("error: ", "")}</span>
                      </div>
                    ) : (
                      <div className="text-emerald-400 flex items-start gap-2">
                        <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                        <span>{validationResult.replace("valid: ", "")}</span>
                      </div>
                    )
                  ) : (
                    <div className="text-gray-500 italic">
                      Click "Authenticate Key In Simulator" to test the response output.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--muted-foreground)" }}>Status</span>
                <span className="font-mono text-emerald-400">200 OK (0.04s)</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span style={{ color: "var(--muted-foreground)" }}>Protection Mode</span>
                <span className="font-mono" style={{ color: "var(--primary)" }}>
                  LuaMore VM v2.4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Luau Script Integration Guide */}
      <div className="mt-14 space-y-4">
        <h2 className="font-display text-2xl">Luau Script Loader Usage</h2>
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          Pass the key variable <code className="font-mono text-xs">_G.script_key</code> before
          fetching your protected loader URL.
        </p>
        <CopyCode
          label="loader-usage.lua"
          code={`-- Set the key variable for LuaMore authentication
_G.script_key = "${testKey}"

-- Fetch and execute the encrypted payload from LuaMore
local loader = game:HttpGet("https://luamore.app/api/public/r/YOUR_PUBLIC_ID", true)
loadstring(loader)()`}
        />
      </div>

      {/* Discord Bot Slash Commands Section */}
      <div className="mt-14 card-blue p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Bot size={24} style={{ color: "var(--primary)" }} />
          <div>
            <h2 className="font-display text-2xl">Discord Bot Commands</h2>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Manage your key system directly from your Discord community server.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 font-mono text-xs">
          {[
            { cmd: "/createkey duration:<time>", desc: "Generate a new license key" },
            { cmd: "/resethwid key:<key>", desc: "Clear HWID lock for a customer" },
            { cmd: "/keyinfo key:<key>", desc: "Check key status, owner & expiry" },
            { cmd: "/revoke key:<key>", desc: "Instantly terminate access" },
            { cmd: "/panel setup", desc: "Embed an interactive self-serve panel" },
            { cmd: "/login <api_key>", desc: "Link bot to your LuaMore account" },
          ].map((c) => (
            <div
              key={c.cmd}
              className="p-3 rounded-lg border space-y-1"
              style={{ background: "var(--background)", borderColor: "var(--border)" }}
            >
              <div style={{ color: "var(--primary)" }} className="font-bold">
                {c.cmd}
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                {c.desc}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="btn-outline flex items-center gap-2"
          >
            <Bot size={15} /> Join Discord Support
          </a>
          <Link to="/dashboard/keys" className="btn-primary">
            Open Key Manager
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
