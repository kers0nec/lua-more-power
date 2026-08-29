import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  User,
  Shield,
  Palette,
  KeyRound,
  Download,
  CheckCircle2,
  Lock,
  Mail,
  Bot,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { getDashboardStats, updateProfile } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { HumanCheck } from "@/components/HumanCheck";
import { USERNAME_HINT } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Account & Settings — LuaMore" }] }),
  component: Page,
});

function Page() {
  const get = useServerFn(getDashboardStats);
  const save = useServerFn(updateProfile);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => get() });
  const p = q.data?.profile;

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "backup">("profile");
  const [name, setName] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [humanVerified, setHumanVerified] = useState(false);

  useEffect(() => {
    if (p?.display_name) setName(p.display_name);
    if (p?.discord_id) setDiscordId(p.discord_id);
  }, [p?.display_name, p?.discord_id]);

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          display_name: name.trim(),
          discord_id: discordId.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setStatus("✓ Profile and Discord link updated successfully");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed to update profile"}`),
  });

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    if (newPassword.length < 6) {
      setStatus("✗ Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus("✗ Passwords do not match");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setStatus(`✗ ${error.message}`);
    else {
      setNewPassword("");
      setConfirmPassword("");
      setStatus("✓ Password updated securely");
    }
  }

  function exportUserData() {
    const data = {
      user: p?.display_name || "LuaMore User",
      email: p?.email,
      exportedAt: new Date().toISOString(),
      plan: "Free Forever Unlimited",
      scriptsCount: q.data?.scripts || 0,
      keysCount: q.data?.keys || 0,
      panelsCount: q.data?.panels || 0,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luamore-account-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("✓ Account backup downloaded");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="eyebrow">Workspace Preferences</div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Account Settings</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Manage your creator profile, security credentials, themes, and workspace data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-solid flex items-center gap-1.5">
            <Sparkles size={12} /> Free Forever
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="mt-8 flex gap-2 border-b pb-3 overflow-x-auto"
        style={{ borderColor: "var(--border)" }}
      >
        {[
          { id: "profile", label: "Profile & Identity", icon: User },
          { id: "security", label: "Security & Passwords", icon: Shield },
          { id: "backup", label: "Data & Scripts", icon: Download },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                setStatus("");
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium whitespace-nowrap"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--primary)" : "var(--muted-foreground)",
                border: active ? "1px solid var(--border-strong)" : "1px solid transparent",
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {status && (
        <div
          className="mt-6 rounded-lg border p-4 text-sm font-medium transition-all animate-in fade-in"
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

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="mt-6 space-y-6">
          <form
            className="card-blue space-y-5 p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
          >
            <div
              className="flex items-center gap-4 border-b pb-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl font-display text-2xl font-bold"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 24px var(--shadow-hover)",
                }}
              >
                {name.slice(0, 2).toUpperCase() || "LM"}
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">{name || "Creator Profile"}</h3>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  UID: <span className="font-mono">{p?.id?.slice(0, 18) ?? "user-session"}...</span>
                </p>
                <span className="badge-blue mt-2">LuaMore Developer</span>
              </div>
            </div>

            <div>
              <label className="eyebrow">Display Name / Handle</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-blue mt-2"
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9]{3,24}"
                placeholder="Username"
                required
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                {USERNAME_HINT}
              </p>
            </div>

            <div>
              <label className="eyebrow flex items-center gap-1.5">
                <Mail size={13} /> Registered Email
              </label>
              <input
                value={p?.email ?? "Your registered email"}
                readOnly
                className="input-blue mt-2 opacity-80 cursor-not-allowed"
              />
              <p className="mt-1.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
                Email stays tied to your account for recovery and key delivery notices.
              </p>
            </div>

            <div>
              <label className="eyebrow flex items-center gap-1.5">
                <Bot size={13} /> Discord Account Binding
              </label>
              <div
                className="mt-2 rounded-lg border p-4 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {discordId ? `Linked Discord ID: ${discordId}` : "Not linked yet"}
                  </span>
                  <span className="badge-solid">{discordId ? "Linked" : "Available"}</span>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground">Discord User ID</label>
                  <input
                    value={discordId}
                    onChange={(e) => setDiscordId(e.target.value)}
                    placeholder="e.g. 1535400459962032258"
                    className="input-blue mt-1 font-mono text-sm w-full"
                  />
                </div>
                <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Enter your Discord User ID here and click <strong>Save Profile</strong>, or run{" "}
                  <code className="font-mono text-[11px]">/login api_key:&lt;key&gt;</code> directly
                  in Discord.
                </p>
              </div>
            </div>

            <button disabled={saveMut.isPending} className="btn-primary">
              {saveMut.isPending ? "Saving changes…" : "Save Profile"}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Security */}
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
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-blue mt-2"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="eyebrow">Confirm New Password</label>
              <input
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-blue mt-2"
                placeholder="••••••••"
                required
              />
            </div>

            <button className="btn-outline">Update Password</button>
          </form>

          {/* Human Check Verification Module */}
          <div className="card-blue p-6 md:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Shield size={20} style={{ color: "var(--primary)" }} />
              <div>
                <h3 className="font-display text-xl">Human Verification Check</h3>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Interactive bot protection validator used across key claims and login flows.
                </p>
              </div>
            </div>
            <HumanCheck value={humanVerified} onChange={setHumanVerified} />
          </div>
        </div>
      )}

      {/* Tab: Backup & Data */}
      {activeTab === "backup" && (
        <div className="mt-6 space-y-6">
          <div className="card-blue p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl">Data Export & Script Backup</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Export your project metadata, script lists, and key counts in a portable JSON
                format.
              </p>
            </div>

            <div
              className="grid gap-4 sm:grid-cols-3 rounded-lg border p-4"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <div>
                <span className="eyebrow">Scripts</span>
                <div className="mt-1 font-display text-2xl font-bold">{q.data?.scripts || 0}</div>
              </div>
              <div>
                <span className="eyebrow">License Keys</span>
                <div className="mt-1 font-display text-2xl font-bold">{q.data?.keys || 0}</div>
              </div>
              <div>
                <span className="eyebrow">Discord Panels</span>
                <div className="mt-1 font-display text-2xl font-bold">{q.data?.panels || 0}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={exportUserData}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} /> Export Account Backup (.json)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
