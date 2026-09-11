import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowUpRight, FileCode2, KeyRound, PanelsTopLeft, Shield, Copy, Check } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { listScripts } from "@/lib/scripts.functions";

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
      { name: "description", content: "Your LuaMore workspace: scripts, license keys, panels, and releases at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const statsQuery = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
  const listScriptsFn = useServerFn(listScripts);
  const scriptsQuery = useQuery({ queryKey: ["scripts"], queryFn: () => listScriptsFn() }) as { data?: ScriptItem[] };
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const stats = statsQuery.data;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scripts = (scriptsQuery.data ?? []).slice(0, 5);

  const copyLoader = async (script: ScriptItem) => {
    const path = `${origin}/scripts/hosted/${script.public_id}.lua`;
    const loader = script.ffa
      ? `loadstring(game:HttpGet("${path}"))()`
      : `-- Paste a license key from Dashboard → License Keys\n_G.script_key = "<license-key>"\nloadstring(game:HttpGet("${path}"))()`;
    await navigator.clipboard.writeText(loader);
    setCopiedId(script.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const cards = [
    ["Hosted Scripts", stats?.scripts ?? 0, "/dashboard/scripts", FileCode2],
    ["License Keys", stats?.keys ?? 0, "/dashboard/keys", KeyRound],
    ["Discord Panels", stats?.panels ?? 0, "/dashboard/panels", PanelsTopLeft],
    ["HWID Rules", stats?.releases ?? 0, "/dashboard/hwid", Shield],
  ] as const;

  return (
    <div className="app-page">
      <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="badge-blue text-[10px] tracking-wider">WORKSPACE</div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back{stats?.profile?.display_name ? `, ${stats.profile.display_name}` : ""}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Manage the scripts, keys, bindings, and integrations stored in your account.
          </p>
        </div>
        <Link to="/dashboard/scripts" className="btn-primary text-xs sm:text-sm">Create Script</Link>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, to, Icon]) => (
          <Link key={label} to={to} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-input text-primary"><Icon size={17} /></div>
            <div className="mt-4 font-display text-3xl font-bold">{value}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><ArrowUpRight size={14} /></div>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Recent hosted scripts</h2><Link to="/dashboard/scripts" className="text-xs font-semibold text-primary hover:underline">View all <ArrowUpRight size={12} className="inline" /></Link></div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
          {scripts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No scripts created yet. Create a script to generate a real public loader.</div>
          ) : (
            <div className="divide-y divide-border">{scripts.map((script) => <div key={script.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-input text-primary"><FileCode2 size={16} /></div><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{script.name}</span><span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{script.ffa ? "Public" : "Key protected"}</span></div><div className="mt-1 font-mono text-[11px] text-muted-foreground">{script.public_id}</div></div></div><div className="flex items-center gap-2 self-end sm:self-auto"><button type="button" onClick={() => void copyLoader(script)} className="btn-outline flex h-8 items-center gap-1.5 px-2.5 py-1 text-xs">{copiedId === script.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy loader</>}</button><Link to="/dashboard/scripts/$id" params={{ id: script.id }} className="btn-primary flex h-8 items-center gap-1 px-3 py-1 text-xs">Workspace <ArrowUpRight size={12} /></Link></div></div>)}</div>
          )}
        </div>
      </section>
    </div>
  );
}
