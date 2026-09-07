import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { ShieldCheck, Sparkles, Zap, Bug, Bot, Lock } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Updates & Releases | LuaMore" },
      {
        name: "description",
        content: "See the latest updates, engine releases, and new features introduced to LuaMore.",
      },
    ],
  }),
  component: ChangelogPage,
});

interface Release {
  version: string;
  date: string;
  badge?: string;
  highlights: string[];
  changes: {
    type: "feature" | "security" | "improvement" | "fix";
    text: string;
  }[];
}

const RELEASES: Release[] = [
  {
    version: "v1.0.0",
    date: "August 2026",
    badge: "Latest Release",
    highlights: [
      "Hardened Anti-Hook Engine with Silent Entropy Poisoning",
      "Native C-Closure verification & metatable detour detection",
      "Dynamic Constant String XOR encoding",
    ],
    changes: [
      {
        type: "security",
        text: "Added Silent Entropy Poisoning: detours on string.byte, string.char, table.concat, and pcall silently corrupt decryption keys rather than throwing telltale errors.",
      },
      {
        type: "security",
        text: "Implemented string metatable __index proxy tamper detection to defeat Lua dumpers.",
      },
      {
        type: "feature",
        text: "Introduced Dual-VM and Single-VM toggle options in Obfuscator Studio.",
      },
      {
        type: "improvement",
        text: "Unified theme across all pages with Deep Midnight Black and Navy Blue contrast styling.",
      },
      {
        type: "fix",
        text: "Fixed script persistence store ensuring scripts are never dropped across sessions.",
      },
    ],
  },
  {
    version: "v12.2.0",
    date: "August 2026",
    highlights: [
      "Universal Roblox Executor Compatibility Layer",
      "Dual FNV-1a & djb2 32-bit Cryptographic Checksums",
    ],
    changes: [
      {
        type: "feature",
        text: "Streamlined bootstrap VM to support Wave, Solara, Synapse Z, Delta, Fluxus, KRNL, and Swift.",
      },
      {
        type: "improvement",
        text: "Optimized bytecode compression reducing final payload sizes by up to 34%.",
      },
      {
        type: "security",
        text: "Dual 32-bit integrity checks preventing in-memory byte substitution attacks.",
      },
    ],
  },
  {
    version: "v11.0.0",
    date: "July 2026",
    highlights: [
      "Discord HTTP Interactions Bot Integration",
      "Interactive Slash Command Panels & HWID Management",
    ],
    changes: [
      {
        type: "feature",
        text: "Added `/panel post <script_id>` for posting rich embed script buttons in Discord channels.",
      },
      {
        type: "feature",
        text: "Added `/keys create duration:<time>` for issuing instant timed or permanent license keys.",
      },
      {
        type: "feature",
        text: "Added `/hwid reset` allowing server admins to reset device locks for script buyers.",
      },
    ],
  },
];

function ChangelogPage() {
  return (
    <PageShell
      eyebrow="Release Notes"
      title="Changelog & Updates"
      subtitle="Follow the ongoing development, security upgrades, and new capabilities of the LuaMore platform."
    >
      <div className="mx-auto max-w-4xl space-y-12">
        {RELEASES.map((rel) => (
          <div
            key={rel.version}
            className="card-blue relative overflow-hidden p-6 md:p-8"
            style={{
              background: "linear-gradient(180deg, #071224 0%, #030814 100%)",
              borderColor: "var(--border)",
            }}
          >
            {/* Header */}
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-b pb-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-bold text-white md:text-3xl">
                  {rel.version}
                </span>
                {rel.badge && (
                  <span className="badge-blue text-[11px] font-semibold">{rel.badge}</span>
                )}
              </div>
              <span className="font-mono text-xs text-[color:var(--muted-foreground)]">
                {rel.date}
              </span>
            </div>

            {/* Highlights */}
            <div className="my-6 space-y-2">
              <h4 className="eyebrow text-[10px] text-[color:var(--primary)]">Key Highlights</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {rel.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2 text-sm text-[color:var(--foreground)]"
                  >
                    <Sparkles size={14} className="shrink-0 text-[color:var(--primary)]" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Changes */}
            <div className="space-y-3">
              <h4 className="eyebrow text-[10px] text-[color:var(--muted-foreground)]">
                All Changes
              </h4>
              <div className="space-y-2.5">
                {rel.changes.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    {c.type === "security" && (
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-lime-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-lime-400 border border-lime-800/40">
                        <Lock size={10} /> Security
                      </span>
                    )}
                    {c.type === "feature" && (
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-lime-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-lime-400 border border-lime-800/40">
                        <Zap size={10} /> New
                      </span>
                    )}
                    {c.type === "improvement" && (
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300 border border-slate-700">
                        <ShieldCheck size={10} /> Improved
                      </span>
                    )}
                    {c.type === "fix" && (
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded bg-rose-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-400 border border-rose-800/40">
                        <Bug size={10} /> Fix
                      </span>
                    )}
                    <span className="leading-relaxed text-[color:var(--muted-foreground)]">
                      {c.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
