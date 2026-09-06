import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  FileCode2,
  KeyRound,
  PanelsTopLeft,
  ArrowUpRight,
  Ban,
  Shield,
  Copy,
  Check,
  Sparkles,
  Zap,
  Activity,
} from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { listScripts } from "@/lib/scripts.functions";
import { useServerFn } from "@tanstack/react-start";

interface ScriptItem {
  id: string;
  name: string;
  public_id: string;
  ffa?: boolean;
  code?: string;
}

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — LuaMore" },
      {
        name: "description",
        content: "Your LuaMore workspace: scripts, license keys, panels, and releases at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const q = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
  const listScriptsFn = useServerFn(listScripts);
  const scriptsQ = useQuery({ queryKey: ["scripts"], queryFn: () => listScriptsFn() }) as {
    data?: ScriptItem[];
  };

  const stats = q.data;
  const [copiedSample, setCopiedSample] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://luamore.app";

  const sampleLoader = `loadstring(game:HttpGet("${origin}/files/loaders/87b653a7b59a722de8.lua"))()`;

  const copyText = (text: string, isSample = false, scriptId?: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (isSample) {
        setCopiedSample(true);
        setTimeout(() => setCopiedSample(false), 2000);
      }
      if (scriptId) {
        setCopiedId(scriptId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    }
  };

  const cards = [
    {
      label: "Hosted Scripts",
      value: stats?.scripts ?? 0,
      to: "/dashboard/scripts",
      icon: FileCode2,
      sub: "100% Protected",
      color: "from-blue-500/20 to-blue-600/5",
    },
    {
      label: "License Keys",
      value: stats?.keys ?? 0,
      to: "/dashboard/keys",
      icon: KeyRound,
      sub: "HWID Bound",
      color: "from-amber-500/20 to-amber-600/5",
    },
    {
      label: "Discord Panels",
      value: stats?.panels ?? 0,
      to: "/dashboard/panels",
      icon: PanelsTopLeft,
      sub: "Realtime Bot",
      color: "from-indigo-500/20 to-indigo-600/5",
    },
    {
      label: "HWID Ban Filters",
      value: stats?.releases ?? 0,
      to: "/dashboard/hwid",
      icon: Ban,
      sub: "Active Enforcer",
      color: "from-rose-500/20 to-rose-600/5",
    },
  ];

  const actions = [
    {
      to: "/dashboard/scripts",
      icon: FileCode2,
      title: "Host Lua Script",
      badge: "LOADER",
      desc: "Upload Luau code and deploy it behind a protected Luarmor-style loader.",
    },
    {
      to: "/dashboard/keys",
      icon: KeyRound,
      title: "Generate License Keys",
      badge: "AUTH",
      desc: "Issue single or bulk license keys with hardware locking and custom expiry.",
    },
    {
      to: "/dashboard/obfuscate",
      icon: Shield,
      title: "Obfuscation Studio",
      badge: "SECURITY",
      desc: "Protect raw Luau code with multi-pass AST control-flow virtualization.",
    },
    {
      to: "/dashboard/panels",
      icon: PanelsTopLeft,
      title: "Discord Bot Panel",
      badge: "INTEGRATION",
      desc: "Ship interactive key redeem, loader fetch, and HWID reset buttons directly to Discord.",
    },
  ];

  const recentScripts = (scriptsQ.data ?? []).slice(0, 5);

  return (
    <div className="app-page">
      {/* Hero Welcome Header */}
      <header className="flex flex-col gap-4 pb-6 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-blue text-[10px] tracking-wider font-semibold">
              <Sparkles size={11} className="text-amber-400" /> SYSTEM ACTIVE
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              LuaMore v19 Polymorphic Engine
            </span>
          </div>
          <h1 className="mt-2.5 font-display text-3xl sm:text-4xl text-foreground font-bold tracking-tight">
            Welcome back{stats?.profile?.display_name ? `, ${stats.profile.display_name}` : ""}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-xl">
            Manage your Lua script loaders, anti-tamper security, hardware bindings, Discord
            integrations, and license keys.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/dashboard/scripts" className="btn-primary text-xs sm:text-sm">
            <FileCode2 size={15} /> Create Script
          </Link>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-40 group-hover:opacity-100 transition-opacity`}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-input border border-border text-primary group-hover:scale-105 transition-transform">
                  <c.icon size={17} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] font-mono font-medium text-muted-foreground bg-input/80 px-2 py-0.5 rounded border border-border">
                  {c.sub}
                </span>
              </div>
              <div className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground">
                {c.value}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
                <ArrowUpRight
                  size={14}
                  className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-primary"
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">
              Quick Operations
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">High-performance tools</span>
        </div>

        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
          {actions.map((a) => (
            <Link
              key={a.title}
              to={a.to}
              className="group relative flex flex-col justify-between p-5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all hover:shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <a.icon size={19} strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {a.title}
                    </h3>
                    <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-input border border-border text-muted-foreground">
                      {a.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Live Hosted Scripts Quick Access Table */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-400" />
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground">
              Recent Hosted Scripts
            </h2>
          </div>
          <Link
            to="/dashboard/scripts"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            View All ({scriptsQ.data?.length ?? 0}) <ArrowUpRight size={12} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {recentScripts.length > 0 ? (
            <div className="divide-y divide-border">
              {recentScripts.map((s: ScriptItem) => {
                const loaderCode = s.ffa
                  ? `loadstring(game:HttpGet("${origin}/files/loaders/${s.public_id}.lua"))()`
                  : `script_key = "YOUR_KEY";\nloadstring(game:HttpGet("${origin}/files/loaders/${s.public_id}.lua"))()`;
                const isCopied = copiedId === s.id;

                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-input border border-border text-primary">
                        <FileCode2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {s.name}
                          </span>
                          {s.ffa ? (
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-medium bg-blue-950/80 text-blue-300 border border-blue-800">
                              Public FFA
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-medium bg-amber-950/80 text-amber-300 border border-amber-800">
                              Key Protected
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                          <span className="truncate text-[11px] select-all bg-input/80 px-1.5 py-0.5 rounded border border-border">
                            {s.public_id}
                          </span>
                          <span>·</span>
                          <span className="text-[11px]">
                            {s.code ? `${s.code.length.toLocaleString()} chars` : "Empty source"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => copyText(loaderCode, false, s.id)}
                        className="btn-outline text-xs py-1 px-2.5 h-8 flex items-center gap-1.5"
                        title="Copy Loadstring"
                      >
                        {isCopied ? (
                          <>
                            <Check size={12} className="text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Copy Loader
                          </>
                        )}
                      </button>
                      <Link
                        to="/dashboard/scripts/$id"
                        params={{ id: s.id }}
                        className="btn-primary text-xs py-1 px-3 h-8 flex items-center gap-1"
                      >
                        Workspace <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No scripts created yet. Click "Create Script" to host your first Luau project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
