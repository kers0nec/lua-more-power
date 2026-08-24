import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Cpu,
  KeyRound,
  Bot,
  LayoutDashboard,
  Fingerprint,
  ArrowRight,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Protect. Monetize. Earn." },
      {
        name: "description",
        content:
          "Secure your Lua software, receive a VM-encoded build, and distribute access through an integrated whitelist system. HWID binding and license enforcement on by default.",
      },
      { property: "og:title", content: "LuaMore — Protect. Monetize. Earn." },
      {
        property: "og:description",
        content:
          "VM-encoded builds, license keys, HWID enforcement, and a Discord bot — all in one dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Cpu,
    title: "Custom Obfuscator",
    desc: "Your code is compiled into a private virtual machine with protected control flow and encrypted constants. What ships is an opaque interpreter running your logic, not readable source.",
  },
  {
    icon: KeyRound,
    title: "Whitelist System",
    desc: "Issue LM keys with a fixed duration and slot count. Buyers self-redeem, HWID binds on first execution, and you can revoke or extend from the panel or Discord.",
  },
  {
    icon: Bot,
    title: "Discord Bot",
    desc: "A full command surface for key issuance, whitelist changes, blacklist review, and analytics. Runs on your host, authenticates against the panel API.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    desc: "Scripts, keys, execution logs, HWID review queue, and live loader status in one panel. Every mutation writes to an append-only audit log.",
  },
  {
    icon: Fingerprint,
    title: "HWID Tracker",
    desc: "Each license binds to the first hardware fingerprint that redeems it. Owners approve, reset, or manage access directly from the software dashboard.",
  },
];

const steps = [
  {
    n: "01",
    title: "Upload your code",
    desc: "Drop a file into the dashboard or push it through the API. Pick Quick, Standard, or Maximum protection.",
  },
  {
    n: "02",
    title: "Get a VM-encoded build",
    desc: "Your logic is compiled into bytecode for the LuaMore VM, not just renamed or string-encoded source.",
  },
  {
    n: "03",
    title: "Distribute access via Discord",
    desc: "Issue access licenses with a slash command. HWID binds on first redemption, enforced automatically.",
  },
];

const plans: {
  name: string;
  price: string;
  suffix: string;
  tag?: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}[] = [
  {
    name: "Citizen",
    price: "$0",
    suffix: "forever",
    features: [
      "Discord bot + slot management",
      "Whitelist keys & panel deploy",
      "Quick & Standard protection",
      "Multi-API linking & unlink",
      "Manual deploy + kill-switch",
      "Analytics dashboard",
      "20 builds / week",
      "Up to 10 Panels",
    ],
    cta: "Get started free",
  },
  {
    name: "Royal",
    price: "$5",
    suffix: "/month",
    tag: "Recommended",
    highlight: true,
    features: [
      "Everything in Citizen",
      "Unlimited builds & protection",
      "Server-verified heartbeat",
      "Heartbeat active by default",
      "Priority queue on script builds",
      "Early access to new VM layers",
      "Royal badge on Discord & panel",
    ],
    cta: "Upgrade to Royal",
  },
  {
    name: "Lifetime",
    price: "$15",
    suffix: "one-time",
    tag: "Best value",
    features: [
      "Everything in Citizen",
      "Everything in Royal, forever",
      "No monthly billing, no expiry",
      "Server-verified heartbeat",
      "Priority queue on script builds",
      "Early access to new VM layers",
      "Lifetime Royal badge",
    ],
    cta: "Go lifetime",
  },
];

const changelog = [
  {
    version: "2.00.001",
    date: "2026-08-24",
    tag: "Feature",
    title: "Cleaner loader links + key system fixed & bypass-protected",
    body: "Loader links now use a cleaner, dedicated address: https://luamore.app/api/public/r/<hash>. The dashboard and Discord bot generate it automatically, and your existing loadstrings keep working.",
  },
  {
    version: "2.00.000",
    date: "2026-08-22",
    tag: "Critical",
    title: "LuaMore 2.0 — Back online, stronger and more reliable",
    body: "Execution reliability restored. Fixed an issue that could cause some scripts to load without running. Scripts now execute reliably across supported executors again.",
  },
  {
    version: "1.80.001",
    date: "2026-08-07",
    tag: "Critical",
    title: "Part 4: Secret, Logging & Configuration Security",
    body: "Security Hardening Part 4: comprehensive secret, logging, and configuration audit. Hardened internal error responses to prevent information disclosure, moved sensitive server keys to server-only modules, and standardized redaction across all logging utilities.",
  },
];

function Home() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-24 text-center md:pt-36 md:pb-32">
          <div className="rise inline-flex">
            <span className="badge-blue">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--primary)" }}
              />
              LuaMore · VM-encoded protection
            </span>
          </div>

          <h1
            className="rise mt-8 font-display text-6xl md:text-8xl"
            style={{ animationDelay: "60ms" }}
          >
            Protect. <span style={{ fontStyle: "italic" }}>Monetize.</span> Earn.
          </h1>

          <p
            className="rise mx-auto mt-8 max-w-xl text-lg leading-relaxed"
            style={{ color: "var(--muted-foreground)", animationDelay: "180ms" }}
          >
            Secure your software, receive a VM-encoded build, and distribute access through our
            integrated whitelist system. HWID binding and license enforcement are on by default.
          </p>

          <div
            className="rise mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Link to="/auth" className="btn-primary w-full sm:w-auto">
              Enter the lab <ArrowRight size={16} />
            </Link>
            <a href="#how" className="btn-outline w-full sm:w-auto">
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Capabilities</div>
          <h2 className="mt-4 font-display text-4xl md:text-6xl">
            Everything you need <span style={{ fontStyle: "italic" }}>to ship, license, and enforce</span>
          </h2>
          <p
            className="mx-auto mt-5 max-w-lg text-base"
            style={{ color: "var(--muted-foreground)" }}
          >
            LuaMore pairs a hardened VM with real license enforcement — protecting your software
            means more than just basic code masking.
          </p>
        </div>

        <div
          className="mt-16 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3"
          style={{ borderColor: "var(--border)", background: "var(--border)" }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="p-8 transition-colors hover:bg-[color:var(--muted)]"
              style={{ background: "var(--card)" }}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-light)", color: "var(--primary)" }}
              >
                <f.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="mt-6 font-display text-2xl">{f.title}</h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--muted-foreground)" }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="border-y"
        style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="eyebrow">Workflow</div>
            <h2 className="mt-4 font-display text-4xl md:text-6xl">
              How it <span style={{ fontStyle: "italic" }}>works</span>
            </h2>
            <p className="mt-5 max-w-lg text-base" style={{ color: "var(--muted-foreground)" }}>
              Three steps from source file to a protected, licensed build.
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((st) => (
              <div
                key={st.n}
                className="border-t pt-6"
                style={{ borderColor: "var(--border-strong)" }}
              >
                <div className="font-mono text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {st.n}
                </div>
                <h3 className="mt-4 font-display text-2xl">{st.title}</h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Pricing</div>
          <h2 className="mt-4 font-display text-4xl md:text-6xl">
            Three plans. <span style={{ fontStyle: "italic" }}>One goal.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base" style={{ color: "var(--muted-foreground)" }}>
            Start on the free tier. Move up when you outgrow it. Or pay once and be done.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className="card-blue flex flex-col p-8"
              style={
                p.highlight
                  ? { borderColor: "var(--foreground)", boxShadow: "0 0 0 1px var(--foreground)" }
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-2xl">{p.name}</h3>
                {p.tag && <span className="badge-solid">{p.tag}</span>}
              </div>
              <div className="mt-6 font-display text-6xl">
                {p.price}
                <span
                  className="font-sans text-sm font-normal"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {" "}
                  {p.suffix}
                </span>
              </div>
              <ul className="mt-8 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={15}
                      className="mt-0.5 shrink-0"
                      strokeWidth={1.6}
                      style={{ color: "var(--primary)" }}
                    />
                    <span style={{ color: "var(--muted-foreground)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className={`${p.highlight ? "btn-primary" : "btn-outline"} mt-8 w-full`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Changelog */}
      <section
        className="border-y"
        style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <div className="eyebrow">Changelog</div>
              <h2 className="mt-4 font-display text-4xl md:text-5xl">
                Continuous <span style={{ fontStyle: "italic" }}>release cadence</span>
              </h2>
              <p className="mt-5 text-base" style={{ color: "var(--muted-foreground)" }}>
                Weekly builds cover loader hardening, VM upgrades, and dashboard fixes.
              </p>
            </div>
          </div>

          <div className="mt-12 divide-y" style={{ borderColor: "var(--border)" }}>
            {changelog.map((c) => (
              <div
                key={c.version}
                className="grid gap-4 border-t py-8 md:grid-cols-[220px_1fr]"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex flex-col gap-2">
                  <div className="font-mono text-sm">{c.version}</div>
                  <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {c.date}
                  </div>
                  <span className="badge-solid w-fit">{c.tag}</span>
                </div>
                <div>
                  <h3 className="font-display text-xl md:text-2xl">{c.title}</h3>
                  <p
                    className="mt-3 text-sm leading-relaxed"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative overflow-hidden border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="font-display text-4xl md:text-6xl">
            Join LuaMore and <span style={{ fontStyle: "italic" }}>ship with ease</span>
          </h2>
          <p
            className="mx-auto mt-5 max-w-xl text-base"
            style={{ color: "var(--muted-foreground)" }}
          >
            Authenticate with Discord, upload a source, ship a protected build the same day.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth" className="btn-primary w-full sm:w-auto">
              Sign in with Discord <ArrowRight size={16} />
            </Link>
            <a
              href="https://discord.gg/luamore"
              target="_blank"
              rel="noreferrer"
              className="btn-outline w-full sm:w-auto"
            >
              Join the Discord
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
