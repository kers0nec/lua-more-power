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
  Globe,
  Sparkles,
  ExternalLink,
  Users,
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

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutGrid },
      { to: "/dashboard/scripts", label: "Scripts", icon: FileCode2 },
      { to: "/dashboard/obfuscate", label: "Obfuscator", icon: Shield, badge: "PRO" },
    ],
  },
  {
    label: "Protection & Licensing",
    items: [
      { to: "/dashboard/keys", label: "Keys", icon: KeyRound },
      { to: "/dashboard/batches", label: "Key Batches", icon: Layers },
      { to: "/dashboard/access", label: "My Access", icon: Users },
      { to: "/dashboard/hwid", label: "HWID Bans", icon: Ban },
      { to: "/dashboard/logs", label: "Execution Logs", icon: Activity, badge: "LIVE" },
    ],
  },
  {
    label: "Integrations & API",
    items: [
      { to: "/dashboard/panels", label: "Discord Panels", icon: PanelsTopLeft },
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
  const [activeHost, setActiveHost] = useState("luamore.app");
  const { user } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveHost(window.location.host || "luamore.app");
    }
  }, []);

  const labelName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    user.email ||
    "Account";

  const userInitial = labelName.charAt(0).toUpperCase();

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  }

  const SidebarBody = (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Logo & Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/80 px-4 bg-card/40">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={28} />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="btn-ghost px-2 py-1 md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Auto-Domain & Status Indicator */}
        <div className="mx-3 mt-3.5 p-2.5 rounded-lg border border-border bg-gradient-to-br from-card/80 to-muted/40 shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Engine Online
            </span>
            <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30">
              v2.4
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1 text-xs font-mono text-foreground/90">
            <span className="flex items-center gap-1 truncate" title={`Active Host: ${activeHost}`}>
              <Globe size={11} className="text-primary shrink-0" />
              <span className="truncate text-[11px] font-medium">{activeHost}</span>
            </span>
            <span className="text-[9px] text-muted-foreground uppercase">Auto</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-5 overflow-y-auto px-3 py-4 max-h-[calc(100vh-250px)]">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="eyebrow px-3 pb-1.5 text-[10px] text-muted-foreground/80 font-semibold tracking-wider">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    loc.pathname === item.to ||
                    (item.to !== "/dashboard" && loc.pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`group relative flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? "border-primary/40 bg-primary/10 text-primary font-semibold shadow-sm"
                          : "border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon
                          size={15}
                          strokeWidth={1.8}
                          className={`shrink-0 transition-colors ${
                            active
                              ? "text-primary"
                              : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                            item.badge === "LIVE"
                              ? "bg-primary/20 text-primary border-primary/40"
                              : "bg-primary/20 text-primary/80 border-primary/40"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Card & Logout */}
      <div className="border-t border-border/80 p-3 bg-card/40">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-input/80 border border-border">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white font-bold text-xs shadow-sm">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground">{labelName}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="text-primary font-medium">Developer Tier</span>
            </div>
          </div>
          <Link
            to="/dashboard/settings"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Settings"
          >
            <Settings size={14} />
          </Link>
        </div>
        <button
          onClick={signOut}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut size={13} strokeWidth={1.7} /> Sign out
        </button>
      </div>
    </div>
  );

  const currentLabel =
    [...ALL_ITEMS]
      .sort((a, b) => b.to.length - a.to.length)
      .find((i) => loc.pathname.startsWith(i.to))?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-[color:var(--sidebar)] md:flex shadow-xl z-20">
        {SidebarBody}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[88%] flex-col border-r border-border bg-[color:var(--sidebar)] shadow-2xl z-10">
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Modern Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 md:px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="btn-ghost shrink-0 px-2 py-1 md:hidden"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-semibold text-foreground truncate">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard/scripts"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary-dark transition-colors shadow-sm"
            >
              <FileCode2 size={13} /> New Script
            </Link>
            <Link
              to="/features/key-system-gui"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md border border-border hover:bg-card transition-colors"
            >
              <Sparkles size={12} className="text-primary" /> Docs
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
