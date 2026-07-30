import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LuaMore" },
      { name: "description", content: "Sign in or create your LuaMore account to obfuscate, host, and protect Luau scripts." },
      { property: "og:title", content: "Sign in — LuaMore" },
      { property: "og:description", content: "Access your LuaMore dashboard: obfuscation, license keys, HWID protection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName || email.split("@")[0] } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      nav({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />

      <div className="rise relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block"><Logo size={36} /></Link>
          <p className="eyebrow mt-4">
            {mode === "signin" ? "Welcome back" : "Create your workspace"}
          </p>
        </div>

        <div className="card-flat p-7">
          <div
            className="mb-7 grid grid-cols-2 gap-1 rounded-md p-1"
            style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="rounded-[5px] py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
                style={{
                  background: mode === m ? "var(--foreground)" : "transparent",
                  color: mode === m ? "var(--background)" : "var(--muted-foreground)",
                  fontWeight: 700,
                }}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="eyebrow">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-blue mt-2"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="eyebrow">Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-blue mt-2" placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="eyebrow">Password</label>
              <input
                type="password" required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-blue mt-2" placeholder="••••••••"
              />
            </div>

            {err && (
              <div
                className="rounded-md border p-3 text-sm"
                style={{ borderColor: "var(--destructive)", color: "var(--destructive)", background: "rgba(255,107,107,0.07)" }}
              >
                {err}
              </div>
            )}

            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          You can link a Discord account later from dashboard settings.
        </p>
      </div>
    </div>
  );
}
