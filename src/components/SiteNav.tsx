import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ background: "rgba(255,255,255,0.85)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          <Link to="/" className="hover:text-[color:var(--primary)]">Home</Link>
          <Link to="/demo" className="hover:text-[color:var(--primary)]">Demo</Link>
          <Link to="/commands" className="hover:text-[color:var(--primary)]">Commands</Link>
          <Link to="/dashboard" className="hover:text-[color:var(--primary)]">Dashboard</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="btn-ghost text-sm">Sign in</Link>
          <Link to="/auth" className="btn-primary text-sm">Get Started</Link>
        </div>
      </div>
    </header>
  );
}
