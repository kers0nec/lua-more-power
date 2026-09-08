import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Users, ShieldCheck, Clock, Ban, Unplug } from "lucide-react";
import { listMyAccess, type AccessGrant } from "@/lib/access.functions";
import { DashboardHeader } from "@/components/DashboardHeader";

export const Route = createFileRoute("/_authenticated/dashboard/access")({
  head: () => ({
    meta: [
      { title: "My Access — LuaMore" },
      {
        name: "description",
        content:
          "Every Discord whitelist and license key you've issued across your LuaMore scripts.",
      },
    ],
  }),
  component: Page,
});

function statusOf(g: AccessGrant): "active" | "expired" | "revoked" {
  if (g.revoked) return "revoked";
  if (g.expires_at && new Date(g.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

const STATUS_STYLES: Record<"active" | "expired" | "revoked", { label: string; cls: string }> = {
  active: { label: "Active", cls: "text-lime-300 bg-lime-950/60 border-lime-700/60" },
  expired: { label: "Expired", cls: "text-amber-300 bg-amber-950/60 border-amber-700/60" },
  revoked: { label: "Revoked", cls: "text-rose-300 bg-rose-950/60 border-rose-700/60" },
};

function Page() {
  const list = useServerFn(listMyAccess);
  const q = useQuery({ queryKey: ["my-access"], queryFn: () => list() });
  const data = q.data;

  return (
    <div className="app-page max-w-5xl">
      <DashboardHeader
        eyebrow="Access control"
        title="My access"
        description="Every Discord user you've whitelisted and every key you've issued, across all your scripts."
        action={
          <span className="badge-blue">
            <Users size={12} /> {data?.totalActive ?? 0} active
          </span>
        }
      />

      <div className="grid gap-3 mt-6 md:grid-cols-4">
        <div className="card-blue p-4">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <ShieldCheck size={14} style={{ color: "var(--primary)" }} /> Active
          </div>
          <div className="mt-1 font-display text-2xl">{data?.totalActive ?? 0}</div>
        </div>
        <div className="card-blue p-4">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Clock size={14} className="text-amber-400" /> Expired
          </div>
          <div className="mt-1 font-display text-2xl">{data?.totalExpired ?? 0}</div>
        </div>
        <div className="card-blue p-4">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <Ban size={14} className="text-rose-400" /> Revoked
          </div>
          <div className="mt-1 font-display text-2xl">{data?.totalRevoked ?? 0}</div>
        </div>
        <div className="card-blue p-4">
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--muted-foreground)" }}
          >
            <KeyRound size={14} style={{ color: "var(--primary)" }} /> Discord link
          </div>
          <div className="mt-1 font-mono text-sm truncate" title={data?.discordId ?? undefined}>
            {data?.discordId ? `#${data.discordId}` : "Not linked"}
          </div>
        </div>
      </div>

      <div className="card-blue divide-y mt-6">
        {(data?.grants ?? []).map((g) => {
          const status = statusOf(g);
          const s = STATUS_STYLES[status];
          return (
            <div key={`${g.kind}-${g.id}`} className="p-4 flex flex-wrap items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--accent-light)" }}
              >
                {g.kind === "key" ? (
                  <KeyRound size={16} style={{ color: "var(--primary)" }} />
                ) : (
                  <Users size={16} style={{ color: "var(--primary)" }} />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  <span className="font-mono">&lt;@{g.discord_id}&gt;</span>
                  <span className="ml-2 font-normal" style={{ color: "var(--muted-foreground)" }}>
                    {g.kind === "key" ? "issued key" : "whitelisted"}
                  </span>
                </div>
                <div className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {g.script_name}
                  {g.script_public_id ? (
                    <span className="font-mono ml-2 opacity-70">{g.script_public_id}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex-1" />
              {g.hwid ? (
                <code
                  className="font-mono text-xs px-2 py-1 rounded"
                  style={{ background: "var(--accent-light)" }}
                  title={g.hwid}
                >
                  HWID {g.hwid.slice(0, 14)}
                </code>
              ) : null}
              {g.expires_at ? (
                <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(g.expires_at).toLocaleString()}
                </span>
              ) : (
                <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                  forever
                </span>
              )}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.cls}`}>
                {s.label}
              </span>
            </div>
          );
        })}

        {q.data && q.data.grants.length === 0 && (
          <div className="p-10 text-center">
            <Unplug size={28} className="mx-auto" style={{ color: "var(--muted-foreground)" }} />
            <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
              No access granted yet. Whitelist users from a Discord panel or generate keys to see
              them here.
            </p>
            <Link to="/dashboard/keys" className="btn-primary mt-4 inline-flex text-xs">
              Generate keys
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
