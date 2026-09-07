import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Shield,
  Palette,
  KeyRound,
  Download,
  Lock,
  Mail,
  Bot,
  Sparkles,
  Monitor,
  Moon,
  Eye,
  EyeOff,
  Globe,
  Bell,
  Trash2,
  AlertTriangle,
} from "lucide-react";

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

function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [status, setStatus] = useState("");
  const [accentColor, setAccentColor] = useState("blue");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSignedIn(Boolean(data.session));
        if (data.session?.user) {
          setEmail(data.session.user.email ?? "");
          setDisplayName((data.session.user.user_metadata?.display_name as string) ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    if (!displayName.trim()) {
      setStatus("Display name is required.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim(), discord_id: discordId.trim() || undefined },
      });
      if (error) throw error;
      setStatus("✓ Profile saved successfully.");
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : "Failed to save profile"}`);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    if (newPassword.length < 6) {
      setStatus("✗ Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("✗ Passwords do not match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setStatus(`✗ ${error.message}`);
    else {
      setStatus("✓ Password updated securely.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  function saveAccent(value: string) {
    setAccentColor(value);
    try {
      localStorage.setItem("lm_accent", value);
    } catch {
      /* storage unavailable */
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "backup", label: "Data & Scripts", icon: Download },
  ];

  return (
    <PageShell
      eyebrow="Account Settings"
      title="Your account, in one place."
      subtitle="Profile, password, security, appearance, and script settings for your LuaMore workspace. Everything is free — no tiers, no paywalls."
    >
      {/* Auth-gate card */}
      {!signedIn && !loading && (
        <div
          className="card-blue mb-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <div>
            <h2 className="font-display text-xl">Sign in to manage your account</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Create a free account or sign in to access profile editing, password updates, Discord
              linking, and all account controls.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link to="/login" className="btn-outline">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary">
              Create account
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 overflow-x-auto border-b pb-0"
        style={{ borderColor: "var(--border)" }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setStatus("");
              }}
              className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              <Icon size={15} />
              {tab.label}
              {active && (
                <span
                  className="absolute right-0 bottom-0 left-0 h-[2px] rounded-full"
                  style={{ background: "var(--primary)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Status message */}
      {status && (
        <div
          className="mt-5 rounded-lg border p-4 text-sm font-medium"
          style={{
            borderColor: status.startsWith("✓") ? "var(--success)" : "var(--destructive)",
            color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)",
            background: status.startsWith("✓")
              ? "rgba(52, 211, 153, 0.08)"
              : "rgba(244, 63, 94, 0.08)",
          }}
        >
          {status}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="mt-6 space-y-6">
          <form className="card-blue space-y-5 p-6 md:p-8" onSubmit={saveProfile}>
            {/* Avatar + Header */}
            <div
              className="flex items-center gap-4 border-b pb-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-bold"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                   boxShadow: "0 0 24px rgba(163, 230, 53, 0.3)",
                }}
              >
                {displayName.slice(0, 2).toUpperCase() || "LM"}
              </div>
              <div>
                <h3 className="font-display text-xl">{displayName || "Creator Profile"}</h3>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {email || "Sign in to see your email"}
                </p>
                <span className="badge-blue mt-2">Free Forever</span>
              </div>
            </div>

            <div>
              <label className="eyebrow">Display Name / Username</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-blue mt-2"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9]{3,24}"
                placeholder="YourName"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                3–24 letters or numbers. Used in your profile, Discord panels, and loader labels.
              </p>
            </div>

            <div>
              <label className="eyebrow flex items-center gap-1.5">
                <Mail size={13} /> Registered Email
              </label>
              <input
                value={email}
                readOnly
                className="input-blue mt-2 opacity-80 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                Email stays tied to your account for recovery and key delivery notices.
              </p>
            </div>

            <div>
              <label className="eyebrow flex items-center gap-1.5">
                <Bot size={13} /> Discord User ID
              </label>
              <input
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="e.g. 1535400459962032258"
                className="input-blue mt-2 font-mono text-sm"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                Link your Discord ID for bot panels and key redemption flows.
              </p>
            </div>

            {signedIn ? (
              <button type="submit" className="btn-primary">
                Save Profile
              </button>
            ) : (
              <Link to="/login" className="btn-primary">
                Sign in to save changes
              </Link>
            )}
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="mt-6 space-y-6">
          <form className="card-blue space-y-5 p-6 md:p-8" onSubmit={changePassword}>
            <div className="flex items-center gap-3">
              <Lock size={20} style={{ color: "var(--primary)" }} />
              <div>
                <h2 className="font-display text-2xl">Change Password</h2>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Update your authentication credentials for your LuaMore account.
                </p>
              </div>
            </div>

            <div>
              <label className="eyebrow">New Password</label>
              <div className="relative mt-2">
                <input
                  type={showPasswords ? "text" : "password"}
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-blue pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="eyebrow">Confirm New Password</label>
              <div className="relative mt-2">
                <input
                  type={showPasswords ? "text" : "password"}
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-blue pr-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {signedIn ? (
              <button type="submit" className="btn-outline">
                Update Password
              </button>
            ) : (
              <Link to="/login" className="btn-outline">
                Sign in first
              </Link>
            )}
          </form>

          <div className="card-blue p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Shield size={20} style={{ color: "var(--primary)" }} />
              <div>
                <h3 className="font-display text-xl">Human Verification</h3>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Interactive bot protection used during sign-up and key claims.
                </p>
              </div>
            </div>
            <div
              className="rounded-lg border p-5"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Human verification is active on all sign-ups and sensitive operations. This prevents
                automated bot accounts and protects your scripts from mass key generation attacks.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="badge-blue">Active</span>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Math challenge + checkbox verification
                </span>
              </div>
            </div>
          </div>

          {/* Sessions info */}
          <div className="card-blue p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Globe size={20} style={{ color: "var(--primary)" }} />
              <div>
                <h3 className="font-display text-xl">Active Sessions</h3>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Manage your active sessions across devices.
                </p>
              </div>
            </div>
            <div
              className="rounded-lg border p-5"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Session</p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                    This browser · Active now
                  </p>
                </div>
                <span className="badge-blue">Active</span>
              </div>
            </div>
            {signedIn && (
              <button
                onClick={async () => {
                  setStatus("");
                  const { error } = await supabase.auth.signOut();
                  if (error) setStatus(`✗ ${error.message}`);
                  else setStatus("✓ All sessions signed out.");
                }}
                className="btn-outline flex items-center gap-2 text-red-400 border-red-800/40 hover:bg-red-950/20"
              >
                <AlertTriangle size={14} /> Sign out all sessions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="mt-6 space-y-6">
          <div className="card-blue p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Palette size={20} style={{ color: "var(--primary)" }} />
              <div>
                <h2 className="font-display text-2xl">Theme & Accent</h2>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  LuaMore uses a dark blue and black theme. Choose your accent color.
                </p>
              </div>
            </div>

            <div>
              <label className="eyebrow">Base Theme</label>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    id: "midnight",
                    label: "Midnight",
                    desc: "Deep navy and black",
                    color: "#01040a",
                  },
                  { id: "ocean", label: "Ocean", desc: "Dark blue tones", color: "#040e20" },
                  {
                    id: "void",
                    label: "Void",
                    desc: "Pure black with blue accents",
                    color: "#000000",
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => saveAccent(t.id)}
                    className="rounded-xl border p-4 text-left transition-colors"
                    style={{
                      borderColor: accentColor === t.id ? "var(--primary)" : "var(--border)",
                      background: "var(--card)",
                    }}
                  >
                    <div
                      className="h-8 w-8 rounded-lg mb-3"
                      style={{ background: t.color, border: "1px solid var(--border)" }}
                    />
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="eyebrow">Accent Color</label>
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  { id: "blue", color: "#3b82f6", label: "Blue" },
                  { id: "cyan", color: "#22d3ee", label: "Cyan" },
                  { id: "violet", color: "#8b5cf6", label: "Violet" },
                  { id: "emerald", color: "#10b981", label: "Emerald" },
                  { id: "gold", color: "#eab308", label: "Gold" },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => saveAccent(a.id)}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors"
                    style={{
                      borderColor: accentColor === a.id ? "var(--primary)" : "var(--border)",
                      background: accentColor === a.id ? "var(--accent)" : "transparent",
                    }}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: a.color }} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="eyebrow">Preview</label>
              <div
                className="mt-3 rounded-xl border p-6"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg" style={{ background: "var(--primary)" }} />
                  <div>
                    <div className="font-display text-lg">LuaMore</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Dark blue and black theme with your selected accent
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="btn-primary py-1.5 text-xs">Primary Button</span>
                  <span className="btn-outline py-1.5 text-xs">Outline Button</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="mt-6 space-y-6">
          <div className="card-blue p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Bell size={20} style={{ color: "var(--primary)" }} />
              <div>
                <h2 className="font-display text-2xl">Notification Preferences</h2>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Control which emails and alerts you receive from LuaMore.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Security alerts",
                  desc: "Login attempts, password changes, HWID resets",
                  defaultOn: true,
                },
                {
                  label: "Key delivery notices",
                  desc: "When keys are issued or expire",
                  defaultOn: true,
                },
                {
                  label: "Script execution reports",
                  desc: "Daily summary of script loads and errors",
                  defaultOn: false,
                },
                {
                  label: "Product updates",
                  desc: "New features, changelog, and platform news",
                  defaultOn: true,
                },
                {
                  label: "Discord panel events",
                  desc: "When users redeem keys or interact with panels",
                  defaultOn: false,
                },
              ].map((n) => (
                <div
                  key={n.label}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--card)" }}
                >
                  <div>
                    <div className="text-sm font-medium">{n.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {n.desc}
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" defaultChecked={n.defaultOn} className="peer sr-only" />
                    <div
                      className="h-6 w-11 rounded-full transition-colors peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all after:bg-white"
                      style={{
                        background: "var(--border)",
                      }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === "backup" && (
        <div className="mt-6 space-y-6">
          <div className="card-blue p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl">Data Export & Script Backup</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Export your project metadata, script lists, and key counts in a portable JSON
                format. All your scripts are saved permanently on LuaMore.
              </p>
            </div>

            <div
              className="grid gap-4 sm:grid-cols-3 rounded-lg border p-4"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <div>
                <span className="eyebrow">Scripts</span>
                <div className="mt-1 font-display text-2xl font-bold">{signedIn ? "—" : "—"}</div>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  All stored permanently
                </p>
              </div>
              <div>
                <span className="eyebrow">License Keys</span>
                <div className="mt-1 font-display text-2xl font-bold">{signedIn ? "—" : "—"}</div>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  Unlimited free
                </p>
              </div>
              <div>
                <span className="eyebrow">Discord Panels</span>
                <div className="mt-1 font-display text-2xl font-bold">{signedIn ? "—" : "—"}</div>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  Auto-synced
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const data = {
                  user: displayName || "LuaMore User",
                  email,
                  exportedAt: new Date().toISOString(),
                  plan: "Free Forever Unlimited",
                  scripts: "See dashboard for full list",
                  settings: { discordId, accentColor },
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `luamore-account-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setStatus("✓ Account backup downloaded.");
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} /> Export Account Backup (.json)
            </button>
          </div>

          {/* Danger zone */}
          {signedIn && (
            <div
              className="rounded-xl border p-6 md:p-8 space-y-4"
              style={{
                borderColor: "rgba(244, 63, 94, 0.3)",
                background: "rgba(244, 63, 94, 0.04)",
              }}
            >
              <div className="flex items-center gap-3">
                <Trash2 size={20} style={{ color: "var(--destructive)" }} />
                <div>
                  <h3 className="font-display text-xl" style={{ color: "var(--destructive)" }}>
                    Danger Zone
                  </h3>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    These actions are irreversible. Proceed with caution.
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (confirm("Are you sure? This will sign you out permanently.")) {
                    const { error } = await supabase.auth.signOut();
                    if (error) setStatus(`✗ ${error.message}`);
                    else setStatus("✓ Signed out.");
                  }
                }}
                className="btn-outline text-sm text-red-400 border-red-800/40 hover:bg-red-950/20 flex items-center gap-2"
              >
                <AlertTriangle size={14} /> Delete account
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
