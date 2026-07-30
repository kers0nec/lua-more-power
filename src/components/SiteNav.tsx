import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/demo", label: "Demo" },
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
    <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: "rgba(255,255,255,0.85)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-[color:var(--primary)]">{l.label}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Link to="/auth" className="btn-ghost text-sm">Sign in</Link>
          <Link to="/auth" className="btn-primary text-sm">Get Started</Link>
        </div>
        <button
          className="md:hidden btn-ghost px-2 py-1 text-xl"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-white px-6 py-4" style={{ borderColor: "var(--border)" }}>
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-md px-3 py-2 hover:bg-[color:var(--accent-light)]">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link to="/auth" className="btn-outline text-sm">Sign in</Link>
            <Link to="/auth" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
