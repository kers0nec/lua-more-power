import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — LuaMore" }] }),
  component: Page,
});

function Page() {
  const get = useServerFn(getDashboardStats);
  const q = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => get() });
  const p = q.data?.profile;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold">Settings</h1>
      {p && (
        <div className="card-blue p-6 mt-6 space-y-3 text-sm">
          <div><span className="font-semibold">Email:</span> {p.email}</div>
          <div><span className="font-semibold">Display name:</span> {p.display_name}</div>
          <div><span className="font-semibold">Plan:</span> <span className="badge-solid">{p.plan}</span></div>
          <div><span className="font-semibold">Max scripts:</span> {p.max_scripts}</div>
          <div><span className="font-semibold">Max panels:</span> {p.max_panels}</div>
          <div>
            <span className="font-semibold">Discord ID:</span> {p.discord_id ?? <span style={{ color: "var(--muted-foreground)" }}>Not linked — use <code>/login &lt;api_key&gt;</code> on Discord to link.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
