import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getDashboardStats, updateProfile } from "@/lib/dashboard.functions";
import { supabase } from "@/integrations/supabase/client";
import { USERNAME_HINT } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — LuaMore" }] }),
  component: Page,
});

function Page() {
  const get = useServerFn(getDashboardStats);
  const save = useServerFn(updateProfile);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => get() });
  const p = q.data?.profile;
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (p?.display_name) setName(p.display_name);
  }, [p?.display_name]);

  const saveMut = useMutation({
    mutationFn: () => save({ data: { display_name: name.trim() } }),
    onSuccess: () => {
      setStatus("✓ Profile saved");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`),
  });

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("");
    if (newPassword.length < 6) {
      setStatus("✗ Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setStatus(`✗ ${error.message}`);
    else {
      setNewPassword("");
      setStatus("✓ Password updated");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:px-10">
      <div className="eyebrow">Account</div>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">Settings</h1>
      <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
        Change your profile name. Email stays on the account for recovery and notices.
      </p>

      <form
        className="card-blue mt-8 space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate();
        }}
      >
        <div>
          <label className="eyebrow">Username / display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-blue mt-2"
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9]{3,24}"
            required
          />
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {USERNAME_HINT}
          </p>
        </div>
        <div>
          <label className="eyebrow">Email</label>
          <input value={p?.email ?? ""} readOnly className="input-blue mt-2 opacity-80" />
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Email is used for account recovery and key delivery notices.
          </p>
        </div>
        <div>
          <label className="eyebrow">Plan</label>
          <div className="mt-2">
            <span className="badge-solid">Free forever</span>
          </div>
        </div>
        <div>
          <label className="eyebrow">Discord ID</label>
          <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {p?.discord_id ?? "Not linked — use /login <api_key> on Discord to link."}
          </p>
        </div>
        <button disabled={saveMut.isPending} className="btn-primary">
          {saveMut.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>

      <form className="card-blue mt-6 space-y-4 p-6" onSubmit={changePassword}>
        <h2 className="font-display text-xl">Password</h2>
        <div>
          <label className="eyebrow">New password</label>
          <input
            type="password"
            minLength={6}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-blue mt-2"
            placeholder="••••••••"
          />
        </div>
        <button className="btn-outline">Update password</button>
      </form>

      {status && (
        <p
          className="mt-4 text-sm"
          style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
