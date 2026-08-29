import { useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { handleIncomingAuth } from "@/lib/auth-client";
import { Logo } from "@/components/Logo";
import { HumanCheck } from "@/components/HumanCheck";
import { USERNAME_HINT, USERNAME_RE } from "@/lib/site";
import { Mail, KeyRound, Sparkles } from "lucide-react";

export function AuthForm({ initialMode }: { initialMode: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [authMethod, setAuthMethod] = useState<"password" | "magiclink">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);
  const [tos, setTos] = useState(false);
  const [human, setHuman] = useState(false);
  const onHuman = useCallback((ok: boolean) => setHuman(ok), []);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canResendEmail, setCanResendEmail] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    setMode(initialMode);
    setErr(null);
    setNotice(null);
  }, [initialMode]);

  useEffect(() => {
    let active = true;

    async function processIncomingAuth() {
      const res = await handleIncomingAuth();
      if (!active) return;

      if (res.error) {
        setErr(res.error);
      } else if (res.user) {
        persistRemember(true);
        if (res.type === "recovery") {
          nav({ to: "/reset-password" });
        } else {
          nav({ to: "/dashboard" });
        }
      }
    }

    void processIncomingAuth();

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        persistRemember(true);
        nav({ to: "/dashboard" });
      }
    });

    return () => {
      active = false;
      authSub?.subscription?.unsubscribe();
    };
  }, [nav]);

  function persistRemember(value: boolean) {
    try {
      localStorage.setItem("lm_remember", value ? "1" : "0");
      sessionStorage.setItem("lm_session_active", "1");
    } catch {
      /* storage unavailable */
    }
  }

  async function resendConfirmation() {
    if (!email.trim()) {
      setErr("Please enter your email address first.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : "https://luamore.wasmer.app/dashboard";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      setNotice("Verification link resent! Please check your email inbox and spam folder.");
      setCanResendEmail(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to resend confirmation email");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setNotice(null);
    setCanResendEmail(false);

    if (mode === "signup") {
      if (!USERNAME_RE.test(username.trim())) {
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
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard`
        : "https://luamore.wasmer.app/dashboard";

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: { display_name: username.trim() },
          },
        });
        if (error) throw error;

        if (data.session) {
          persistRemember(remember);
          nav({ to: "/dashboard" });
          return;
        } else {
          setNotice(
            "Account created! We have sent a confirmation link to your email. Please click the link to verify your account and sign in.",
          );
          setCanResendEmail(true);
          return;
        }
      } else if (authMethod === "magiclink") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        setNotice("Magic sign-in link sent! Check your email to sign in with one click.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setCanResendEmail(true);
          }
          throw error;
        }
        persistRemember(remember);
        nav({ to: "/dashboard" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Authentication request failed";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    persistRemember(remember);
    setErr(null);
    setNotice(null);
    setBusy(true);
    try {
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/dashboard` : "/dashboard";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to initiate Google sign-in");
      setBusy(false);
    }
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
              onClick={googleLogin}
              className="btn-outline w-full flex items-center justify-center gap-3 py-2.5 font-medium transition-all hover:bg-white/5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.4s.2-1.6.4-2.4L1.6 7c-.8 1.6-1.3 3.4-1.3 5.3s.5 3.7 1.3 5.3l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.4-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                />
              </svg>
              Continue with Google
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
            {mode === "signin" && (
              <div
                className="flex rounded-lg border p-1"
                style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.02)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("password");
                    setErr(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === "password"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("magiclink");
                    setErr(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    authMethod === "magiclink"
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Magic Link
                </button>
              </div>
            )}

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
                  We use this for account verification and access recovery.
                </p>
              ) : authMethod === "magiclink" ? (
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  We'll send a 1-click login link directly to your inbox.
                </p>
              ) : null}
            </div>

            {(mode === "signup" || authMethod === "password") && (
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
                    <Link
                      to="/reset-password"
                      className="underline underline-offset-2 hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  </div>
                ) : null}
              </div>
            )}

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

            {notice && (
              <div
                className="rounded-md border p-3 text-sm text-emerald-300 flex flex-col gap-2"
                style={{
                  borderColor: "rgba(16, 185, 129, 0.4)",
                  background: "rgba(16, 185, 129, 0.1)",
                }}
              >
                <div>{notice}</div>
              </div>
            )}

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

            {canResendEmail && (
              <button
                type="button"
                onClick={resendConfirmation}
                disabled={busy}
                className="btn-outline w-full py-2 text-xs flex items-center justify-center gap-2"
              >
                <Mail className="h-3.5 w-3.5" />
                Resend Confirmation Email
              </button>
            )}

            <button disabled={busy} className="btn-primary w-full">
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : authMethod === "magiclink"
                    ? "Send Magic Link"
                    : "Sign in"}
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
