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
      { label: "FAQ", to: "/faq" },
      { label: "Changelog", to: "/changelog" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", to: "/login" },
      { label: "Register", to: "/register" },
      { label: "Settings", to: "/settings" },
      { label: "Pricing", to: "/pricing" },
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
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div><Logo size={28} /><p className="mt-3 max-w-sm text-sm text-muted-foreground">Scripts, keys, Discord panels, and hosted delivery in one free workspace.</p></div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
          {COLS.flatMap((col) => col.links).filter((item, index, all) => all.findIndex((x) => x.label === item.label) === index).slice(0, 8).map((l) => l.to ? <Link key={l.label} to={l.to} className="hover:text-foreground">{l.label}</Link> : <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="hover:text-foreground">{l.label}</a>)}
        </nav>
      </div>
      <div className="border-t border-border px-6 py-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">© {new Date().getFullYear()} LuaMore · {SITE_TAGLINE}</div>
    </footer>
  );
}
