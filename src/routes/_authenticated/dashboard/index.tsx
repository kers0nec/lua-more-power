import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Dashboard — LuaMore" }] }),
  component: Dashboard,
});

function Dashboard() {
  const q = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });
  const stats = q.data;

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold">Welcome back{stats?.profile?.display_name ? `, ${stats.profile.display_name}` : ""}</h1>
      <p className="mt-1" style={{ color: "var(--muted-foreground)" }}>Here's what's happening on your account.</p>

      <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Scripts", value: stats?.scripts ?? 0, to: "/dashboard/scripts" },
          { label: "License Keys", value: stats?.keys ?? 0, to: "/dashboard/keys" },
          { label: "Panels", value: stats?.panels ?? 0, to: "/dashboard/panels" },
          { label: "Releases", value: stats?.releases ?? 0, to: "/dashboard/scripts" },
        ].map((c) => (
          <Link key={c.label} to={c.to} className="card-blue p-5 block">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>{c.label.toUpperCase()}</div>
            <div className="mt-1 text-3xl font-bold" style={{ color: "var(--primary)" }}>{c.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link to="/dashboard/scripts" className="card-blue p-6 block">
          <h3 className="text-lg font-semibold">📜 Create a script</h3>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>Upload Luau code and obfuscate it with Larph.</p>
        </Link>
        <Link to="/dashboard/obfuscate" className="card-blue p-6 block">
          <h3 className="text-lg font-semibold">🛡️ Quick obfuscate</h3>
          <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>One-off obfuscation without saving a script.</p>
        </Link>
      </div>
    </div>
  );
}
