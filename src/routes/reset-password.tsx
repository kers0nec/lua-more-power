import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { handleIncomingAuth } from "@/lib/auth-client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — LuaMore" },
      { name: "description", content: "Choose a new password for your LuaMore account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function init() {
      const res = await handleIncomingAuth();
      if (res.error) {
        setStatus(res.error);
      }
      setHasSession(Boolean(res.user));
      setReady(true);
    }
    void init();

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setHasSession(true);
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setStatus("Enter the email attached to your account.");
      return;
    }
    setBusy(true);
    setStatus("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) setStatus(error.message);
    else {
      setSent(true);
      setStatus("Reset link sent. Check your inbox and open the secure link.");
    }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setStatus("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("Passwords do not match.");
      return;
    }
    setBusy(true);
    setStatus("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setStatus(error.message);
    else {
      setPassword("");
      setConfirm("");
      setStatus("Password updated. You can sign in with the new password.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-5" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-6xl">
          <Link to="/" aria-label="LuaMore home">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-14">
        <div className="w-full max-w-md rise">
          <div className="eyebrow">Account recovery</div>
          <h1 className="mt-3 font-display text-4xl">Reset your password</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {!ready
              ? "Checking your secure reset session…"
              : hasSession
                ? "Choose a new password for your LuaMore account."
                : "Enter your account email and we will send a secure reset link."}
          </p>

          {ready && hasSession ? (
            <form onSubmit={updatePassword} className="card-blue mt-8 space-y-4 p-6">
              <div>
                <label className="eyebrow">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-blue mt-2"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div>
                <label className="eyebrow">Repeat password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="input-blue mt-2"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Repeat it"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <span>Update password</span>
                )}
              </button>
            </form>
          ) : ready ? (
            <form onSubmit={requestReset} className="card-blue mt-8 space-y-4 p-6">
              <div>
                <label className="eyebrow">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input-blue mt-2"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={busy || sent}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>Sending email...</span>
                  </>
                ) : sent ? (
                  "Email sent"
                ) : (
                  "Send reset email"
                )}
              </button>
            </form>
          ) : null}

          {status ? (
            <p
              className="mt-4 rounded-md border p-3 text-sm"
              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
            >
              {status}
            </p>
          ) : null}
          <p className="mt-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            <Link to="/login" className="underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
