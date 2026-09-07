import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs font-bold text-muted-foreground">
        <div className="flex items-center gap-4">
          <Logo size={24} />
          <span className="hidden sm:inline text-muted-foreground/60">|</span>
          <span className="hidden sm:inline">LuaMore — Protect lua scripts</span>
        </div>

        <nav className="flex items-center gap-4">
          <a
            href="https://discord.gg/F2uYN9gWCk"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary transition-colors font-bold"
          >
            Discord
          </a>
          <Link to="/tos" className="hover:text-primary transition-colors font-bold">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-primary transition-colors font-bold">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
