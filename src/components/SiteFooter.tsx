import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { DISCORD_INVITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/20">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs font-bold text-muted-foreground">
        <div className="flex items-center gap-4">
          <Logo size={24} />
          <span className="hidden sm:inline text-muted-foreground/60">|</span>
          <span className="hidden sm:inline">LuaMore — protected Luau delivery & obfuscation.</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link to="/vault" className="hover:text-primary transition-colors font-bold">
            Vault
          </Link>
          <Link to="/obfuscators" className="hover:text-primary transition-colors font-bold">
            Obfuscator
          </Link>
          <Link to="/dashboard" className="hover:text-primary transition-colors font-bold">
            Dashboard
          </Link>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary transition-colors font-bold"
          >
            Discord
          </a>
          <Link to="/tos" className="hover:text-primary transition-colors font-bold">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
