import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const NAV: { to: string; label: string; icon: string }[] = [
  { to: "/dashboard", label: "Overview", icon: "🏠" },
  { to: "/dashboard/scripts", label: "Scripts", icon: "📜" },
  { to: "/dashboard/obfuscate", label: "Obfuscate", icon: "🛡️" },
  { to: "/dashboard/validate", label: "Validate", icon: "✅" },
  { to: "/dashboard/keys", label: "Keys", icon: "🔑" },
  { to: "/dashboard/batches", label: "Key Batches", icon: "📦" },
  { to: "/dashboard/panels", label: "Panels", icon: "💬" },
  { to: "/dashboard/hwid", label: "HWID Bans", icon: "🖥️" },
  { to: "/dashboard/api-keys", label: "API Keys", icon: "🗝️" },
  { to: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

function Layout() {
  const nav = useNavigate();
  const loc = useLocation();

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--secondary)" }}>
      <aside className="hidden md:flex flex-col w-64 border-r bg-white" style={{ borderColor: "var(--border)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <Link to="/"><Logo /></Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const active = loc.pathname === item.to || (item.to !== "/dashboard" && loc.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  background: active ? "var(--accent-light)" : "transparent",
                  color: active ? "var(--primary-dark)" : "var(--foreground)",
                  borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
                }}
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={signOut} className="btn-ghost w-full text-sm">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
