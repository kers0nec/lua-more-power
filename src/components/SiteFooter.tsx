import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

const COLS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Home", to: "/" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "Get started", to: "/auth" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Commands", to: "/commands" },
      { label: "Support", href: "#" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "#" },
      { label: "GitHub", href: "#" },
      { label: "Twitter", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm" style={{ color: "var(--muted-foreground)" }}>
            More Power, More Security, More Lua. Script hosting, licensing, and delivery
            in a single monochrome control room.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="eyebrow mb-4">{col.title}</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className="transition-colors hover:text-[color:var(--foreground)]">
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} className="transition-colors hover:text-[color:var(--foreground)]">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        className="border-t py-5 text-center font-mono text-[11px] uppercase tracking-[0.18em]"
        style={{ color: "var(--muted-foreground)", borderColor: "var(--border)" }}
      >
        © {new Date().getFullYear()} Lua Security — All rights reserved
      </div>
    </footer>
  );
}
