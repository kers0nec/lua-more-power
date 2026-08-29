import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
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
  "Loading screen presets",
  "Email login plus Discord",
  "No ads, no Stripe, no checkpoints",
];

function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      title="Pick the limits you need"
      subtitle="There are no limits. LuaMore removed paid plans — every account is free forever."
    >
      <div className="mx-auto max-w-md">
        <div className="card-blue p-8" style={{ borderColor: "var(--foreground)" }}>
          <h2 className="font-display text-2xl">Free</h2>
          <div className="mt-4 font-display text-6xl">
            $0
            <span
              className="font-sans text-sm font-normal"
              style={{ color: "var(--muted-foreground)" }}
            >
              {" "}
              /mo
            </span>
          </div>
          <ul className="mt-8 space-y-3 text-sm">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <CheckCircle2
                  size={15}
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--primary)" }}
                />
                <span style={{ color: "var(--muted-foreground)" }}>{p}</span>
              </li>
            ))}
          </ul>
          <Link to="/register" className="btn-primary mt-8 w-full">
            Get started
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
