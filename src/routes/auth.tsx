import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — LuaMore" },
      { name: "description", content: "Sign in or create your LuaMore account." },
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block"><Logo size={40} /></Link>
        </div>
        <div className="card-blue p-8">
          <div className="flex rounded-md overflow-hidden border mb-6" style={{ borderColor: "var(--border)" }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2 text-sm font-medium"
                style={{
                  background: mode === m ? "var(--gradient-primary)" : "#ffffff",
                  color: mode === m ? "#ffffff" : "var(--foreground)",
                }}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>DISPLAY NAME</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-blue mt-1" placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>EMAIL</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-blue mt-1" placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>PASSWORD</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input-blue mt-1" placeholder="••••••••" />
            </div>
            {err && <div className="text-sm rounded-md p-2" style={{ background: "#ffecec", color: "var(--destructive)" }}>{err}</div>}
            <button disabled={busy} className="btn-primary w-full">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
            You can link a Discord account later from your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  );
}
