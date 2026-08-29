import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, FileCode2, KeyRound, Bot, Link2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Control who can run your scripts." },
      {
        name: "description",
        content: "Add a script, choose how access works, then copy the loader. Free forever.",
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: FileCode2,
    title: "Scripts",
    desc: "Store a script, choose protection, and copy its loader.",
  },
  {
    icon: KeyRound,
    title: "Keys",
    desc: "Create timed or permanent keys and bind them to a device.",
  },
  {
    icon: Bot,
    title: "Discord",
    desc: "Post key panels and manage users with slash commands.",
  },
  {
    icon: Link2,
    title: "Loaders",
    desc: "Deliver protected Luau with a signed loader URL from the dashboard.",
  },
];

const steps = [
  { n: "01", title: "Create a project", desc: "Add the script you want to deliver." },
  { n: "02", title: "Choose access", desc: "Use keys, Discord, or keyless mode." },
  { n: "03", title: "Copy the loader", desc: "Paste the loader where your users can find it." },
  { n: "04", title: "Check activity", desc: "See runs, errors, and active devices." },
];

const demoKeys = [
  { key: "LM-A7X2-9KQM-4RPL", status: "active" },
  { key: "LM-B3N8-2WXT-7HJD", status: "used" },
  { key: "LM-C9P1-5LMQ-8VZK", status: "active" },
  { key: "LM-D4R6-1YHN-3QWB", status: "expired" },
];

function Home() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="badge-blue">luamore · loader</span>
              <h1 className="mt-6 font-display text-5xl leading-[1.05] md:text-7xl">
                Control who can run your scripts.
              </h1>
              <p className="mt-6 max-w-lg text-lg" style={{ color: "var(--muted-foreground)" }}>
                Add a script, choose how access works, then copy the loader. LuaMore is free — no
                plans, no billing.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary">
                  Create account <ArrowRight size={16} />
                </Link>
                <Link to="/how" className="btn-outline">
                  How it works
                </Link>
              </div>
            </div>

            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: "var(--border-strong)", background: "var(--card)" }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="font-mono text-xs">loader.lua</span>
                <span className="font-mono text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  encrypted route
                </span>
              </div>
              <pre
                className="overflow-x-auto p-5 text-[12px] leading-relaxed"
                style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}
              >
                {`_G.script_key = "LM-A7X2-9KQM-4RPL"
local loader = game:HttpGet(
  "https://luamore.app/api/public/r/demo"
)
loadstring(loader)()`}
              </pre>
              <div className="border-t p-4" style={{ borderColor: "var(--border)" }}>
                <div className="eyebrow mb-3">keys</div>
                <ul className="space-y-2 text-sm">
                  {demoKeys.map((k) => (
                    <li key={k.key} className="flex items-center justify-between font-mono text-xs">
                      <span>{k.key}</span>
                      <span style={{ color: "var(--muted-foreground)" }}>{k.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="eyebrow">What it does</div>
        <h2 className="mt-3 font-display text-4xl md:text-5xl">The parts you actually use</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card-blue p-6">
              <f.icon size={18} style={{ color: "var(--primary)" }} />
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how"
        className="border-y"
        style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="eyebrow">Setup</div>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">Four steps, then you are done</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="border-t pt-6" style={{ borderColor: "var(--border-strong)" }}>
                <div className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {s.n}
                </div>
                <h3 className="mt-4 font-display text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Pricing</div>
          <h2 className="mt-3 font-display text-4xl md:text-5xl">Everything is free</h2>
          <p className="mx-auto mt-4 max-w-lg text-base" style={{ color: "var(--muted-foreground)" }}>
            No Stripe. No tiers. Unlimited scripts, keys, obfuscation, and Discord panels.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-md">
          <div className="card-blue p-8" style={{ borderColor: "var(--foreground)" }}>
            <h3 className="font-display text-2xl">LuaMore</h3>
            <div className="mt-4 font-display text-6xl">
              $0
              <span className="font-sans text-sm font-normal" style={{ color: "var(--muted-foreground)" }}>
                {" "}
                forever
              </span>
            </div>
            <ul className="mt-8 space-y-3 text-sm">
              {[
                "Unlimited projects, scripts, and keys",
                "LuaMore VM obfuscation",
                "HWID binding and license keys",
                "Discord panels and slash commands",
                "Loading screen presets",
                "No extra ads. No billing.",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                  <span style={{ color: "var(--muted-foreground)" }}>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="btn-primary mt-8 w-full">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="font-display text-4xl md:text-5xl">Start with one script.</h2>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn-primary">
              Create account
            </Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-outline">
              Discord
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
