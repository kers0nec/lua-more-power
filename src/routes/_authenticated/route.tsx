import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  FileCode2,
  KeyRound,
  Layers,
  Ban,
  PanelsTopLeft,
  Terminal,
  Shield,
  Settings,
  Menu,
  X,
  LogOut,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { handleIncomingAuth } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { user } = await handleIncomingAuth();
    if (!user) {
      throw redirect({ to: "/auth" });
    }
    return { user };
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
      { to: "/dashboard/obfuscate", label: "Obfuscator", icon: Shield },
    ],
  },
  {
    label: "Protection",
    items: [
      { to: "/dashboard/keys", label: "Keys", icon: KeyRound },
      { to: "/dashboard/batches", label: "Key Batches", icon: Layers },
      { to: "/dashboard/hwid", label: "HWID Bans", icon: Ban },
      { to: "/dashboard/logs", label: "Execution Logs", icon: Activity },
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
  const { user } = Route.useRouteContext();
  const labelName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    user.email ||
    "Account";

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const SidebarBody = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link to="/">
          <Logo size={29} />
        </Link>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="btn-ghost px-2 py-1 md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="eyebrow px-3 pb-2">{group.label}</div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  loc.pathname === item.to ||
                  (item.to !== "/dashboard" && loc.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`group flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${active ? "border-border-strong bg-accent text-foreground" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <item.icon
                      size={16}
                      strokeWidth={1.7}
                      className={active ? "text-primary" : ""}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <Link
          to="/dashboard/settings"
          className="mb-1 block truncate rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {labelName}
        </Link>
        <button onClick={signOut} className="btn-ghost w-full justify-start text-sm">
          <LogOut size={16} strokeWidth={1.7} /> Sign out
        </button>
      </div>
    </>
  );

  const currentLabel =
    [...ALL_ITEMS]
      .sort((a, b) => b.to.length - a.to.length)
      .find((i) => loc.pathname.startsWith(i.to))?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-[color:var(--sidebar)] md:flex">
        {SidebarBody}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[88%] flex-col border-r border-border bg-[color:var(--sidebar)] shadow-2xl">
            {SidebarBody}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="btn-ghost shrink-0 px-2 py-1"
          >
            <Menu size={20} />
          </button>
          <span className="truncate font-display text-lg">{currentLabel}</span>
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
