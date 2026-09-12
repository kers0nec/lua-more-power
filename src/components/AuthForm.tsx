import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { handleIncomingAuth } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import {
  Shield,
  Check,
  KeyRound,
  Zap,
  Loader2,
} from "lucide-react";

export function AuthForm({ initialMode }: { initialMode: "signin" | "signup" }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    setErr(null);
  }, [initialMode]);

  useEffect(() => {
    let active = true;

    async function processIncomingAuth() {
      const res = await handleIncomingAuth();
      if (!active) return;

      if (res.error) {
        setErr(res.error);
      } else if (res.user) {
        nav({ to: "/dashboard" });
      }
    }

    void processIncomingAuth();

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        nav({ to: "/dashboard" });
      }
    });

    return () => {
      active = false;
      authSub?.subscription?.unsubscribe();
    };
  }, [nav]);

  function discordHref() {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/public/discord/oauth/start`;
    }
    return "/api/public/discord/oauth/start";
  }

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Left branding and security feature panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex bg-secondary/20">
        <div
          className="grid-bg mask-fade pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
        />
        <Link to="/" className="relative inline-block">
          <Logo size={36} />
        </Link>
        <div className="relative max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary mb-6">
            <Shield size={12} />
            <span>LuaMore Security Console</span>
          </div>
          <h2 className="font-display text-5xl leading-[1.04] tracking-tight">
            Script security & instant delivery.
          </h2>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">
            Protect your scripts with polymorphic VM encryption, LuaMore obfuscator anti-tamper
            shields, and hardware-bound license keys.
          </p>

          <div className="mt-8 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card/60 p-2.5 text-muted-foreground">
              <Check size={14} className="text-primary" />
              <span>Anti-Tamper & Anti-Dumper Traps Active</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card/60 p-2.5 text-muted-foreground">
              <Zap size={14} className="text-primary" />
              <span>Zstd Base85 Buffer Transport</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg border border-border/80 bg-card/60 p-2.5 text-muted-foreground">
              <KeyRound size={14} className="text-primary" />
              <span>Hardware ID Lock & Discord Bot Ready</span>
            </div>
          </div>
        </div>
        <div className="relative flex items-center justify-between font-mono text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} LuaMore</span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Systems Operational
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="rise w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link to="/">
              <Logo size={32} />
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to site
            </Link>
          </div>

          <h1 className="mt-6 font-display text-4xl">
            Welcome to LuaMore
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with Discord to access your scripts and dashboard.
          </p>

          <div className="mt-8 space-y-4">
            <a
              href={discordHref()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 transition-all"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Sign in with Discord
            </a>

            {err && (
              <div
                className="rounded-md border p-3 text-sm flex flex-col gap-2"
                style={{
                  borderColor: "var(--destructive)",
                  color: "var(--destructive)",
                  background: "rgba(244,63,94,0.08)",
                }}
              >
                <div>{err}</div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            By signing in, you agree to our <Link to="/terms" className="underline underline-offset-2" style={{ color: "var(--foreground)" }}>Terms of Service</Link> and <Link to="/privacy" className="underline underline-offset-2" style={{ color: "var(--foreground)" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}