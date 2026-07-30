import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const SidebarBody = (
    <>
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <Link to="/"><Logo /></Link>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="md:hidden btn-ghost px-2 py-1 text-lg"
        >
          ✕
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
    </>
  );

  const currentLabel =
    [...NAV].sort((a, b) => b.to.length - a.to.length).find((i) => loc.pathname.startsWith(i.to))?.label ?? "Dashboard";

  return (
    <div className="min-h-screen flex w-full" style={{ background: "var(--secondary)" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 shrink-0 border-r bg-white"
        style={{ borderColor: "var(--border)" }}
      >
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(10,30,50,0.45)" }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative flex flex-col w-72 max-w-[85%] h-full bg-white border-r shadow-xl"
            style={{ borderColor: "var(--border)" }}
          >
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="btn-ghost px-2 py-1 text-xl">
            ☰
          </button>
          <span className="font-semibold truncate">{currentLabel}</span>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
