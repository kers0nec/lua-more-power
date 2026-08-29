import { useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { HumanCheck } from "@/components/HumanCheck";
import { USERNAME_HINT, USERNAME_RE } from "@/lib/site";

export function AuthForm({ initialMode }: { initialMode: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);
  const [tos, setTos] = useState(false);
  const [human, setHuman] = useState(false);
  const onHuman = useCallback((ok: boolean) => setHuman(ok), []);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

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
    if (mode === "signup") {
      if (!USERNAME_RE.test(username)) {
        setErr(USERNAME_HINT);
        return;
      }
      if (!tos) {
        setErr("Please agree to the Terms of Service and Privacy Policy.");
        return;
      }
      if (!human) {
        setErr("Please complete the human verification.");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: username },
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
            Scripts, keys,
            <br />
            and access.
          </h2>
          <p className="mt-5 max-w-sm text-base" style={{ color: "var(--muted-foreground)" }}>
            Manage scripts, keys, Discord, and loaders in one place. Free forever.
          </p>
        </div>
        <div className="relative font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
          © {new Date().getFullYear()} LuaMore
        </div>
      </div>

      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="rise w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link to="/">
              <Logo size={32} />
            </Link>
          </div>

          <Link to="/" className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            ← Back
          </Link>

          <h1 className="mt-4 font-display text-4xl">
            {mode === "signin" ? "Sign in" : "Create your LuaMore account"}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {mode === "signin"
              ? "Manage scripts, keys, Discord, and access in one place."
              : "Free to start. Protect your first script whenever you're ready."}
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={discordLogin}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
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
                <label className="eyebrow">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-blue mt-2"
                  placeholder="YourName"
                  required
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9]{3,24}"
                />
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {USERNAME_HINT}
                </p>
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
              {mode === "signup" ? (
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  We use this for account recovery and key delivery notices.
                </p>
              ) : null}
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
              {mode === "signin" ? (
                <div
                  className="mt-2 text-right text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <Link to="/reset-password" className="underline underline-offset-2">
                    Forgot password?
                  </Link>
                </div>
              ) : null}
            </div>

            {mode === "signup" && (
              <>
                <label
                  className="flex items-start gap-2 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={tos}
                    onChange={(e) => setTos(e.target.checked)}
                  />
                  <span>
                    I read and agree to the{" "}
                    <Link to="/tos" className="underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <HumanCheck value={human} onChange={onHuman} />
              </>
            )}

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
                  background: "rgba(244,63,94,0.08)",
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
                <Link
                  to="/register"
                  className="underline underline-offset-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="underline underline-offset-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
