import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { DISCORD_INVITE } from "@/lib/site";

const LINKS = [
  { to: "/features", label: "Features" },
  { to: "/how", label: "How" },
  { to: "/pricing", label: "Pricing" },
  { to: "/docs", label: "Docs" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{
        background: "color-mix(in srgb, var(--background) 85%, transparent)",
        borderColor: "var(--border)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link to="/" className="min-w-0" aria-label="LuaMore home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {LINKS.map((l) => {
            const active = loc.pathname === l.to || loc.pathname.startsWith(`${l.to}/`);
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={active ? "page" : undefined}
                className="rounded-md px-3 py-1.5 text-xs font-bold transition-colors hover:bg-muted"
                style={{
                  color: active ? "var(--primary)" : "var(--muted-foreground)",
                  fontWeight: active ? 800 : 700,
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="text-xs font-bold transition-colors hover:text-foreground"
            style={{ color: "var(--muted-foreground)" }}
          >
            Sign in
          </Link>
          <Link to="/register" className="btn-primary py-1.5 px-3.5 text-xs font-extrabold">
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="btn-ghost shrink-0 px-2 py-1 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="border-t px-6 py-4 md:hidden"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <nav className="flex flex-col gap-0.5" aria-label="Mobile navigation">
            {LINKS.map((l) => {
              const active = loc.pathname === l.to || loc.pathname.startsWith(`${l.to}/`);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={active ? "page" : undefined}
                  className="rounded-md px-3 py-2.5 text-sm hover:bg-[color:var(--muted)] font-bold"
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/login" className="btn-outline">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
