import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LuaMore" },
      { name: "description", content: "Sign in or create your LuaMore account to host and protect Luau scripts." },
      { property: "og:title", content: "Sign in — LuaMore" },
      { property: "og:description", content: "Access your LuaMore dashboard: script hosting, license keys, HWID protection." },
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
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const oauthErr = new URLSearchParams(window.location.search).get("error");
    if (oauthErr) setErr(oauthErr);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  function persistRemember(value: boolean) {
    try {
      localStorage.setItem("lm_remember", value ? "1" : "0");
      sessionStorage.setItem("lm_session_active", "1");
    } catch {
      /* storage unavailable */
    }
  }

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
      persistRemember(remember);
      nav({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  function discordLogin() {
    persistRemember(remember);
    window.location.href = "/api/public/discord/oauth/start";
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

            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me on this device
            </label>

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

            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span className="h-px flex-1" style={{ background: "var(--border)" }} />
              OR
              <span className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>

            <button
              type="button"
              onClick={discordLogin}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.2.36-.43.844-.59 1.23a18.27 18.27 0 0 0-5.49 0A12.6 12.6 0 0 0 9.2 3a19.74 19.74 0 0 0-4.43 1.372C1.96 8.588 1.196 12.7 1.578 16.752A19.9 19.9 0 0 0 7.68 19.86c.49-.67.928-1.383 1.304-2.13-.717-.27-1.4-.603-2.045-.99.172-.126.34-.257.5-.392 3.94 1.84 8.203 1.84 12.096 0 .163.135.33.266.5.392-.647.39-1.332.722-2.05.992.377.746.813 1.458 1.303 2.128a19.85 19.85 0 0 0 6.107-3.107c.448-4.7-.766-8.777-3.078-12.384ZM8.68 14.3c-1.19 0-2.17-1.09-2.17-2.43 0-1.34.957-2.43 2.17-2.43 1.223 0 2.203 1.1 2.183 2.43 0 1.34-.96 2.43-2.183 2.43Zm6.64 0c-1.19 0-2.17-1.09-2.17-2.43 0-1.34.957-2.43 2.17-2.43 1.222 0 2.202 1.1 2.182 2.43 0 1.34-.95 2.43-2.182 2.43Z" />
              </svg>
              Continue with Discord
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>
          Signing in with Discord links your account automatically.
        </p>

      </div>
    </div>
  );
}
