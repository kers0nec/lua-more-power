import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LuaMore" },
      {
        name: "description",
        content: "Sign in or create your LuaMore account to host and protect Luau scripts.",
      },
      { property: "og:title", content: "Sign in — LuaMore" },
      {
        property: "og:description",
        content: "Access your LuaMore dashboard: script hosting, license keys, HWID protection.",
      },
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
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName || email.split("@")[0] },
          },
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
    } finally {
      setBusy(false);
    }
  }

  function discordLogin() {
    persistRemember(remember);
    window.location.href = "/api/public/discord/oauth/start";
  }

  return (
    <div className="relative flex min-h-screen">
      {/* Left: brand panel */}
      <div
        className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r p-12 lg:flex"
        style={{ background: "var(--gradient-hero)", borderColor: "var(--border)" }}
      >
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <Link to="/" className="relative inline-block">
          <Logo size={36} />
        </Link>
        <div className="relative">
          <h2 className="font-display text-5xl leading-[1.02]">
            More <span style={{ fontStyle: "italic", color: "var(--primary)" }}>power</span>.
            <br />
            More <span style={{ fontStyle: "italic", color: "var(--primary)" }}>security</span>.
          </h2>
          <p className="mt-5 max-w-sm text-base" style={{ color: "var(--muted-foreground)" }}>
            One dashboard for hosting, licensing, HWID protection, and Discord delivery.
          </p>
        </div>
        <div className="relative font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
          © {new Date().getFullYear()} LuaMore
        </div>
      </div>

      {/* Right: form */}
      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="rise w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link to="/">
              <Logo size={32} />
            </Link>
          </div>

          <h1 className="font-display text-4xl">
            {mode === "signin" ? (
              <>
                Welcome <span style={{ fontStyle: "italic" }}>back</span>
              </>
            ) : (
              <>
                Create your <span style={{ fontStyle: "italic" }}>workspace</span>
              </>
            )}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {mode === "signin"
              ? "Sign in to continue to your dashboard."
              : "It only takes a moment."}
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={discordLogin}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.2.36-.43.844-.59 1.23a18.27 18.27 0 0 0-5.49 0A12.6 12.6 0 0 0 9.2 3a19.74 19.74 0 0 0-4.43 1.372C1.96 8.588 1.196 12.7 1.578 16.752A19.9 19.9 0 0 0 7.68 19.86c.49-.67.928-1.383 1.304-2.13-.717-.27-1.4-.603-2.045-.99.172-.126.34-.257.5-.392 3.94 1.84 8.203 1.84 12.096 0 .163.135.33.266.5.392-.647.39-1.332.722-2.05.992.377.746.813 1.458 1.303 2.128a19.85 19.85 0 0 0 6.107-3.107c.448-4.7-.766-8.777-3.078-12.384ZM8.68 14.3c-1.19 0-2.17-1.09-2.17-2.43 0-1.34.957-2.43 2.17-2.43 1.223 0 2.203 1.1 2.183 2.43 0 1.34-.96 2.43-2.183 2.43Zm6.64 0c-1.19 0-2.17-1.09-2.17-2.43 0-1.34.957-2.43 2.17-2.43 1.222 0 2.202 1.1 2.182 2.43 0 1.34-.95 2.43-2.182 2.43Z" />
              </svg>
              Continue with Discord
            </button>

            <div
              className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.16em]"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span className="h-px flex-1" style={{ background: "var(--border)" }} />
              or with email
              <span className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>
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
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-blue mt-2"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="eyebrow">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-blue mt-2"
                placeholder="••••••••"
              />
            </div>

            <label
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me on this device
            </label>

            {err && (
              <div
                className="rounded-md border p-3 text-sm"
                style={{
                  borderColor: "var(--destructive)",
                  color: "var(--destructive)",
                  background: "rgba(220,38,38,0.06)",
                }}
              >
                {err}
              </div>
            )}

            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            {mode === "signin" ? (
              <>
                New to LuaMore?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="underline underline-offset-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="underline underline-offset-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
