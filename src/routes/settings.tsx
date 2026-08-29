import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — LuaMore" },
      {
        name: "description",
        content: "Manage your LuaMore profile, security, sessions, and appearance.",
      },
    ],
  }),
  component: SettingsPage,
});

const settingGroups = [
  ["Profile", "Update your display name and account details."],
  ["Email", "Keep account recovery and delivery notices current."],
  ["Password", "Change your password without leaving LuaMore."],
  ["Security", "Review access and protect your dashboard with MFA."],
  ["Appearance", "Keep the LuaMore dark blue and black workspace consistent."],
  ["Sessions", "Review where your account is signed in."],
];

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSignedIn(Boolean(data.session));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PageShell
      eyebrow="Account"
      title="Your account, in one place."
      subtitle="Profile, password, security, and appearance settings for your LuaMore workspace."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingGroups.map(([title, description], index) => (
          <div key={title} className="card-blue p-5">
            <span className="font-mono text-xs" style={{ color: "var(--primary)" }}>
              0{index + 1}
            </span>
            <h2 className="mt-3 font-display text-xl">{title}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="card-blue mt-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="eyebrow">Settings dashboard</div>
          <h2 className="mt-2 font-display text-2xl">
            {loading
              ? "Checking session…"
              : signedIn
                ? "Continue to your workspace"
                : "Sign in to manage your account"}
          </h2>
          <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--muted-foreground)" }}>
            {signedIn
              ? "Your authenticated dashboard has profile editing, password updates, Discord linking, and the rest of your account controls."
              : "Create a free account or sign in to access the complete settings panel. Your scripts and keys stay protected behind authentication."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          {signedIn ? (
            <Link to="/dashboard/settings" className="btn-primary">
              Open settings
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-outline">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
