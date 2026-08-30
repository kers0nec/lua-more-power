import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity } from "lucide-react";
import { listExecutionLogs } from "@/lib/logs.functions";
import { DashboardHeader } from "@/components/DashboardHeader";

export const Route = createFileRoute("/_authenticated/dashboard/logs")({
  head: () => ({
    meta: [
      { title: "Execution Logs — LuaMore" },
      { name: "description", content: "Every script execution with key, HWID, and Roblox player identity." },
      { property: "og:title", content: "Execution Logs — LuaMore" },
      { property: "og:description", content: "Every script execution with key, HWID, and Roblox player identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const fn = useServerFn(listExecutionLogs);
  const q = useQuery({ queryKey: ["execution-logs"], queryFn: () => fn(), refetchInterval: 15_000 });
  const rows = q.data ?? [];

  return (
    <div className="app-page">
      <DashboardHeader
        eyebrow="Live telemetry"
        title="Execution logs"
        description="Every time a loader is fetched we log the key, HWID, and Roblox player identity."
      />

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
        {q.isLoading && <div className="py-14 text-center text-sm text-muted-foreground">Loading logs…</div>}
        {!q.isLoading && rows.length === 0 && (
          <div className="py-14 text-center">
            <Activity className="mx-auto text-muted-foreground" size={24} />
            <p className="mt-3 text-sm text-muted-foreground">No executions yet. Once a loader runs it'll appear here in real time.</p>
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Script</th>
                  <th className="px-4 py-3 font-medium">Roblox user</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">HWID</th>
                  <th className="px-4 py-3 font-medium">Place</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{r.script_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.roblox_username ? (
                        <span>{r.roblox_username}{r.roblox_user_id ? <span className="text-muted-foreground"> ({r.roblox_user_id})</span> : null}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.key ? mask(r.key) : (r.script_name ? "FFA" : "—")}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.hwid ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.place_id ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function mask(k: string) {
  if (k.length <= 10) return k;
  return `${k.slice(0, 4)}…${k.slice(-6)}`;
}
