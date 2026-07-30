import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/commands", label: "Commands" },
  { to: "/dashboard", label: "Dashboard" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-xl"
      style={{ background: "rgba(5,6,8,0.72)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-3 md:flex md:justify-between">
        <Link to="/" className="min-w-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = loc.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] transition-colors"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  background: active ? "var(--accent-light)" : "transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/auth" className="btn-ghost font-mono text-xs uppercase tracking-[0.14em]">
            Sign in
          </Link>
          <Link to="/auth" className="btn-primary py-2 text-xs">
            Get Started
          </Link>
        </div>

        <button
          className="btn-ghost shrink-0 px-2 py-1 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div
          className="border-t px-6 py-4 md:hidden"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] hover:bg-[color:var(--accent-light)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/auth" className="btn-outline">Sign in</Link>
            <Link to="/auth" className="btn-primary">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
