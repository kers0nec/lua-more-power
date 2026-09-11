import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/how")({
  head: () => ({
    meta: [
      { title: "How it works — LuaMore" },
      { name: "description", content: "Four steps from script to loader. LuaMore is free." },
    ],
  }),
  component: HowPage,
});

const steps = [
  {
    n: "01",
    title: "Create a project",
    desc: "Add the script you want to deliver. Paste Luau or upload a file. LuaMore stores the source permanently.",
  },
  {
    n: "02",
    title: "Choose access",
    desc: "Use license keys, Discord whitelist, or keyless mode. HWID binds on first run when you enable it.",
  },
  {
    n: "03",
    title: "Copy the loader",
    desc: "Paste the dashboard loader where your users can find it. Optional: wrap it in a loading-screen preset.",
  },
  {
    n: "04",
    title: "Check activity",
    desc: "See runs, errors, and active devices. All analytics stay in your dashboard.",
  },
];

function HowPage() {
  return (
    <PageShell
      eyebrow="How it works"
      title="Four steps, then you're done"
      subtitle="From pasting your script to copying a loader — LuaMore keeps it simple. Everything is free, no billing, no tiers."
    >
      {/* Steps grid */}
      <div
        className="grid gap-px overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--border)" }}
      >
        {steps.map((s) => (
          <div
            key={s.n}
            className="grid grid-cols-[auto_1fr] gap-5 items-start p-6 md:p-8"
            style={{ background: "var(--card)" }}
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold"
              style={{
                background: "var(--accent)",
                color: "var(--primary)",
                border: "1px solid var(--border)",
              }}
            >
              {s.n}
            </div>
            <div>
              <h2 className="font-display text-2xl">{s.title}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* What happens under the hood */}
      <div className="mt-14">
        <div className="flex items-center gap-4">
          <h2 className="eyebrow shrink-0">Under the hood</h2>
          <div className="hairline" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Encrypted delivery",
              desc: "Scripts are stored encrypted and only decrypted server-side after key and HWID verification. The raw source never reaches unauthorized devices.",
            },
            {
              title: "HWID fingerprinting",
              desc: "On first run, the user's hardware signature is bound to their key. Subsequent loads from other devices are blocked until you reset.",
            },
            {
              title: "Heartbeat monitoring",
              desc: "The loader sends periodic heartbeats. Late or missing heartbeats trigger anti-bypass responses you configure.",
            },
            {
              title: "Discord integration",
              desc: "Post interactive panels in your server. Users self-serve keys, admins reset HWIDs, and buyer roles auto-assign.",
            },
            {
              title: "Loading overlays",
              desc: "Choose from four loading bar presets (Frost, Neon, Clean, Gold). Mobile-ready and customizable.",
            },
            {
              title: "Free forever",
              desc: "No plans, no billing, no Stripe. Unlimited scripts, keys, obfuscation runs, and Discord panels for every account.",
            },
          ].map((item) => (
            <div key={item.title} className="card-blue p-5">
              <h3 className="font-display text-lg">{item.title}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Loader template */}
      <div className="mt-14">
        <div className="flex items-center gap-4">
          <h2 className="eyebrow shrink-0">Loader template</h2>
          <div className="hairline" />
        </div>
        <div
          className="mt-6 overflow-hidden rounded-lg border"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--muted)" }}
          >
            <span className="font-mono text-xs">loader.lua</span>
            <span className="font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              Hosted route · uses your public ID
            </span>
          </div>
          <pre
            className="overflow-x-auto p-5 text-xs leading-relaxed"
            style={{ fontFamily: "var(--font-mono)", background: "var(--input)" }}
          >
            <code>{`-- Paste the real values from Dashboard → Scripts and License Keys
_G.script_key = "<license-key>"

-- Fetch and execute the protected payload
local loader = game:HttpGet(
  "/scripts/hosted/<public-id>.lua"
)
loadstring(loader)()`}</code>
          </pre>
        </div>
        <p className="mt-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
          The placeholders above are not credentials. Copy the loader URL from Dashboard → Scripts →
          your project after you create a real script.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-14 text-center">
        <h2 className="font-display text-3xl">Ready to ship?</h2>
        <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
          Create a free account and protect your first script in under a minute.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary">
            Create account
          </Link>
          <Link to="/keys" className="btn-outline">
            Key system docs
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
