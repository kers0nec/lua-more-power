import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t" style={{ background: "var(--secondary)" }}>
      <div className="mx-auto max-w-6xl px-6 py-12 grid gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            More Power, More Security, More Lua.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Product</h4>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <li><Link to="/" className="hover:text-[color:var(--primary)]">Home</Link></li>
            <li><Link to="/demo" className="hover:text-[color:var(--primary)]">Demo</Link></li>
            <li><Link to="/dashboard" className="hover:text-[color:var(--primary)]">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Resources</h4>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <li><Link to="/commands" className="hover:text-[color:var(--primary)]">Commands</Link></li>
            <li><a href="#" className="hover:text-[color:var(--primary)]">Support</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold">Community</h4>
          <ul className="space-y-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            <li><a href="#" className="hover:text-[color:var(--primary)]">Discord</a></li>
            <li><a href="#" className="hover:text-[color:var(--primary)]">GitHub</a></li>
            <li><a href="#" className="hover:text-[color:var(--primary)]">Twitter</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
        © 2024 LuaMore. All rights reserved.
      </div>
    </footer>
  );
}
