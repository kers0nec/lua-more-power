import { createFileRoute, Outlet, redirect, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  FileCode2,
  Shield,
  CheckCircle2,
  KeyRound,
  Layers,
  Ban,
  PanelsTopLeft,
  Terminal,
  Settings,
  Menu,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
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

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutGrid },
      { to: "/dashboard/scripts", label: "Scripts", icon: FileCode2 },
      { to: "/dashboard/obfuscate", label: "Obfuscate", icon: Shield },
      { to: "/dashboard/validate", label: "Validate", icon: CheckCircle2 },
    ],
  },
  {
    label: "Protection",
    items: [
      { to: "/dashboard/keys", label: "Keys", icon: KeyRound },
      { to: "/dashboard/batches", label: "Key Batches", icon: Layers },
      { to: "/dashboard/hwid", label: "HWID Bans", icon: Ban },
    ],
  },
  {
    label: "Integrations",
    items: [
      { to: "/dashboard/panels", label: "Panels", icon: PanelsTopLeft },
      { to: "/dashboard/api-keys", label: "API Keys", icon: Terminal },
      { to: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const SidebarBody = (
    <>
      <div
        className="flex items-center justify-between border-b px-5 py-4"
        style={{ borderColor: "var(--border)" }}
      >
        <Link to="/"><Logo size={26} /></Link>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="btn-ghost px-2 py-1 md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="eyebrow px-3 pb-3">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  loc.pathname === item.to || (item.to !== "/dashboard" && loc.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                    style={{
                      background: active ? "var(--accent-light)" : "transparent",
                      color: active ? "var(--foreground)" : "var(--muted-foreground)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-1.5 bottom-1.5 left-0 w-[2px] rounded-full"
                      style={{ background: active ? "var(--foreground)" : "transparent" }}
                    />
                    <item.icon size={16} strokeWidth={1.7} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        <button onClick={signOut} className="btn-ghost w-full justify-start text-sm">
          <LogOut size={16} strokeWidth={1.7} /> Sign out
        </button>
      </div>
    </>
  );

  const currentLabel =
    [...ALL_ITEMS].sort((a, b) => b.to.length - a.to.length).find((i) => loc.pathname.startsWith(i.to))?.label ??
    "Dashboard";

  return (
    <div className="flex min-h-screen w-full" style={{ background: "var(--background)" }}>
      {/* Desktop sidebar */}
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r md:flex"
        style={{ borderColor: "var(--border)", background: "var(--sidebar)" }}
      >
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setOpen(false)}
          />
          <aside
            className="relative flex h-full w-72 max-w-[85%] flex-col border-r shadow-xl"
            style={{ borderColor: "var(--border)", background: "var(--sidebar)" }}
          >
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-xl md:hidden"
          style={{ borderColor: "var(--border)", background: "rgba(7,7,7,0.85)" }}
        >
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="btn-ghost shrink-0 px-2 py-1">
            <Menu size={20} />
          </button>
          <span className="truncate font-display font-bold">{currentLabel}</span>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
