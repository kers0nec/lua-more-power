import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { DISCORD_INVITE, DISCORD_SUPPORT, SITE_TAGLINE } from "@/lib/site";

const COLS: { title: string; links: { label: string; to?: string; href?: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/features" },
      { label: "How it works", to: "/how" },
      { label: "Key system", to: "/keys" },
      { label: "Obfuscators", to: "/obfuscators" },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", to: "/docs" },
      { label: "Loading screens", to: "/loading-screens" },
      { label: "Commands", to: "/commands" },
      { label: "API", to: "/api/docs" },
      { label: "Settings", to: "/settings" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", to: "/tos" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Discord", href: DISCORD_INVITE },
      { label: "Support", href: DISCORD_SUPPORT },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer
      className="border-t"
      style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm" style={{ color: "var(--muted-foreground)" }}>
            LuaMore is free. Store scripts, issue keys, and copy a loader — no billing, no paywalls.
          </p>
          <p
            className="font-mono text-[11px] uppercase tracking-[0.16em]"
            style={{ color: "var(--primary)" }}
          >
            {SITE_TAGLINE}
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="eyebrow mb-4">{col.title}</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link
                      to={l.to}
                      className="transition-colors hover:text-[color:var(--foreground)]"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      target={l.href?.startsWith("http") ? "_blank" : undefined}
                      rel={l.href?.startsWith("http") ? "noreferrer" : undefined}
                      className="transition-colors hover:text-[color:var(--foreground)]"
                    >
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
        © {new Date().getFullYear()} LuaMore
      </div>
    </footer>
  );
}
