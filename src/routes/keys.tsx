import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { CopyCode } from "@/components/CopyCode";

export const Route = createFileRoute("/keys")({
  head: () => ({
    meta: [
      { title: "Key system — LuaMore" },
      {
        name: "description",
        content: "License keys, HWID binding, duration, and Discord mapping — free on LuaMore.",
      },
    ],
  }),
  component: KeysPage,
});

function KeysPage() {
  return (
    <PageShell
      eyebrow="Access"
      title="Key system"
      subtitle="Create timed or permanent keys, bind them to a device, and deliver them from Discord or your dashboard."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { t: "Duration", d: "Lifetime, daily, weekly, or a custom number of hours." },
          { t: "HWID", d: "Bind to the first hardware fingerprint that redeems the key." },
          { t: "Limits", d: "Cap executions and revoke instantly from the dashboard." },
          { t: "Discord map", d: "Tie keys to guild members. Buyer role on redeem." },
        ].map((x) => (
          <div key={x.t} className="card-blue p-6">
            <h2 className="font-display text-xl">{x.t}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {x.d}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl">Loader snippet</h2>
      <p className="mt-2 mb-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
        Keys stay in the loader URL from your dashboard — this is not a key-entry box.
      </p>
      <CopyCode
        label="usage.lua"
        code={`_G.script_key="YOUR_KEY"
loadstring(game:HttpGet("https://luamore.app/api/public/r/YOUR_PUBLIC_ID",true))()`}
      />

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/register" className="btn-primary">
          Create account
        </Link>
        <Link to="/dashboard/keys" className="btn-outline">
          Open key dashboard
        </Link>
      </div>
    </PageShell>
  );
}
