import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — LuaMore" },
      {
        name: "description",
        content: "LuaMore is free. Unlimited scripts, keys, and obfuscation.",
      },
    ],
  }),
  component: PricingPage,
});

const perks = [
  "Unlimited projects / scripts / keys",
  "Unlimited LuaMore VM obfuscation",
  "HWID binding and instant revoke",
  "Discord panels and slash commands",
  "Loading screen presets (Frost, Neon, Clean, Gold)",
  "Email login plus Discord integration",
  "No ads, no Stripe, no billing, no checkpoints",
  "Anti-hook shield and anti-tamper protection",
  "Batch key generation",
  "Data export and script backups",
  "Heartbeat monitoring and execution analytics",
  "Free forever — no upgrades needed",
];

function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      title="Everything is free"
      subtitle="There are no limits. LuaMore removed paid plans — every account gets everything for free, forever."
    >
      <div className="mx-auto max-w-lg">
        <div
          className="card-blue relative overflow-hidden p-8 md:p-10"
          style={{ borderColor: "var(--primary)" }}
        >
          {/* Glow effect */}
          <div
            className="absolute -top-24 -right-24 h-48 w-48 rounded-full opacity-20 blur-3xl"
            style={{ background: "var(--primary)" }}
          />

          <div className="relative">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-3xl">LuaMore</h2>
              <span className="badge-blue flex items-center gap-1">
                <Sparkles size={11} /> Free Forever
              </span>
            </div>

            <div className="mt-6 font-display text-7xl tracking-tight">
              $0
              <span
                className="font-sans text-lg font-normal"
                style={{ color: "var(--muted-foreground)" }}
              >
                {" "}
                /forever
              </span>
            </div>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              No credit card. No billing. No upsells.
            </p>

            <ul className="mt-8 space-y-3.5 text-sm">
              {perks.map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--primary)" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>{p}</span>
                </li>
              ))}
            </ul>

            <Link to="/register" className="btn-primary mt-10 w-full py-3 text-base">
              <Zap size={16} /> Get started free
            </Link>

            <p
              className="mt-4 text-center text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Start with one script. Upgrade your skills, not your plan.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="font-display text-2xl text-center">Why free?</h2>
        <p
          className="mt-3 text-center text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          LuaMore believes script creators shouldn&apos;t pay for basic protection tools.
          We keep it simple — one free tier with everything included.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {[
            { label: "No paywalls", desc: "Every feature is available to every account from day one." },
            { label: "No hidden costs", desc: "No Stripe processing, no ad checkpoints, no premium tiers." },
            { label: "No limits", desc: "Unlimited scripts, keys, obfuscation runs, and Discord panels." },
            { label: "No catch", desc: "We don't sell your data, inject ads, or gate features." },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
              <h3 className="font-medium">{item.label}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14 text-center">
        <Link to="/register" className="btn-primary py-3">
          Create account
        </Link>
      </div>
    </PageShell>
  );
}
