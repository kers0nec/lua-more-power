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
    desc: "Add the script you want to deliver. Paste Luau or upload a file. LuaMore stores the source for you.",
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
    desc: "See runs, errors, and active devices from the dashboard. Revoke or reset HWID anytime.",
  },
];

function HowPage() {
  return (
    <PageShell
      eyebrow="Setup"
      title="How it works"
      subtitle="Four steps, then you are done. No billing, no plan limits."
    >
      <ol className="space-y-8">
        {steps.map((s) => (
          <li
            key={s.n}
            className="grid gap-2 border-t pt-6 md:grid-cols-[80px_1fr]"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="font-mono text-sm" style={{ color: "var(--muted-foreground)" }}>
              {s.n}
            </div>
            <div>
              <h2 className="font-display text-2xl">{s.title}</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {s.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link to="/register" className="btn-primary">
          Create account
        </Link>
        <Link to="/docs" className="btn-outline">
          Read the docs
        </Link>
      </div>
    </PageShell>
  );
}
