import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileCode2, KeyRound, PanelsTopLeft, Package, ArrowUpRight, Ban } from "lucide-react";
import { getDashboardStats } from "@/lib/dashboard.functions";

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
  const stats = q.data;

  const cards = [
    { label: "Scripts", value: stats?.scripts ?? 0, to: "/dashboard/scripts", icon: FileCode2 },
    { label: "License keys", value: stats?.keys ?? 0, to: "/dashboard/keys", icon: KeyRound },
    { label: "Panels", value: stats?.panels ?? 0, to: "/dashboard/panels", icon: PanelsTopLeft },
    { label: "Releases", value: stats?.releases ?? 0, to: "/dashboard/scripts", icon: Package },
  ];

  const actions = [
    {
      to: "/dashboard/scripts",
      icon: FileCode2,
      title: "Create a script",
      desc: "Upload Luau code and host it behind a secure loader.",
    },
    {
      to: "/dashboard/keys",
      icon: KeyRound,
      title: "Generate keys",
      desc: "Issue single or bulk license keys with expiry.",
    },
    {
      to: "/dashboard/panels",
      icon: PanelsTopLeft,
      title: "Build a panel",
      desc: "Ship redeem and HWID buttons straight to Discord.",
    },
    {
      to: "/dashboard/hwid",
      icon: Ban,
      title: "Manage HWIDs",
      desc: "Ban abusers or reset locked devices.",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <div className="eyebrow">Overview</div>
      <h1 className="mt-3 font-display text-5xl md:text-6xl">
        Welcome <span style={{ fontStyle: "italic" }}>back</span>
        {stats?.profile?.display_name ? `, ${stats.profile.display_name}` : ""}
      </h1>
      <p className="mt-3 max-w-lg text-sm" style={{ color: "var(--muted-foreground)" }}>
        Here's what's happening across your workspace. Everything is free — save scripts, issue
        keys, ship loaders.
      </p>

      <div
        className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-4"
        style={{ borderColor: "var(--border)", background: "var(--border)" }}
      >
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group block p-6 transition-colors hover:bg-[color:var(--muted)]"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between">
              <c.icon size={16} strokeWidth={1.6} style={{ color: "var(--muted-foreground)" }} />
              <ArrowUpRight
                size={14}
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "var(--muted-foreground)" }}
              />
            </div>
            <div className="mt-6 font-display text-5xl">{c.value}</div>
            <div className="eyebrow mt-3">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-16 flex items-center gap-4">
        <h2 className="eyebrow shrink-0">Quick actions</h2>
        <div className="hairline" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {actions.map((a) => (
          <Link key={a.title} to={a.to} className="card-blue group block p-6">
            <div className="flex items-start gap-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-light)", color: "var(--primary)" }}
              >
                <a.icon size={20} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-xl">{a.title}</h3>
                <p className="mt-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {a.desc}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
