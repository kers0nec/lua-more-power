import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  KeyRound,
  Cpu,
  MessageSquare,
  CheckCircle2,
  Package,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublicStats } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — More Power, More Security, More Lua" },
      { name: "description", content: "Luau script hosting, license keys, HWID protection, and Discord panels — all in one platform." },
      { property: "og:title", content: "LuaMore — Luau Script Hosting & Protection" },
      { property: "og:description", content: "Host and protect your Lua scripts with license keys, HWID locking, and Discord integration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features: { icon: LucideIcon; title: string; desc: string; tag: string }[] = [
  { icon: Shield, tag: "01", title: "Secure Loaders", desc: "Serve your scripts through key-gated loader endpoints instead of exposing raw links." },
  { icon: KeyRound, tag: "02", title: "License Management", desc: "Generate single or bulk keys with expiry windows, notes, and per-script scoping." },
  { icon: Cpu, tag: "03", title: "HWID Protection", desc: "Lock scripts to hardware, ban abusers, and reset devices in a single click." },
  { icon: MessageSquare, tag: "04", title: "Panel System", desc: "Interactive Discord panels with redeem, script, role, and HWID buttons." },
  { icon: CheckCircle2, tag: "05", title: "Whitelist System", desc: "Auto-generate keys the moment you whitelist a user by Discord ID." },
  { icon: Package, tag: "06", title: "Script Hosting", desc: "Version, release, and serve your builds from a single dashboard." },
];

const steps = [
  { n: "01", title: "Upload your Luau script", desc: "Paste code or import it straight from Discord." },
  { n: "02", title: "Lock it down", desc: "License keys, HWID locking, and whitelists in a click." },
  { n: "03", title: "Deploy with Discord", desc: "Panels, license keys, and HWID checks wired to your server." },
];

const plans = [
  { name: "Free", price: "$0", features: ["5 scripts", "Secure loaders", "Discord panel", "Community support"], cta: "Start free" },
  { name: "Pro", price: "$9", highlight: true, features: ["50 scripts", "HWID protection", "Bulk key generation", "Priority delivery"], cta: "Go Pro" },
  { name: "Enterprise", price: "Custom", features: ["Unlimited scripts", "Whitelist automation", "Dedicated support", "Custom Discord bot"], cta: "Contact us" },
];

const marquee = [
  "SECURE LOADERS",
  "HWID LOCKING",
  "LICENSE KEYS",
  "DISCORD PANELS",
  "VERSIONED RELEASES",
  "WHITELIST SYSTEM",
];



function Home() {
  const stats = useQuery({ queryKey: ["public-stats"], queryFn: () => getPublicStats() });
  const s = stats.data ?? { releasesPublished: 0, scriptsHosted: 0, keysGenerated: 0, activeUsers: 0 };

  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-24">
          <div className="rise inline-flex">
            <span className="badge-blue">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--foreground)" }}
              />
              Built for Luau developers
            </span>
          </div>

          <h1
            className="rise mt-7 font-display text-5xl leading-[0.95] font-bold tracking-tighter md:text-8xl"
            style={{ animationDelay: "60ms" }}
          >
            Lua<span style={{ color: "var(--muted-foreground)" }}>More</span>
          </h1>

          <p
            className="rise mt-5 font-mono text-sm uppercase tracking-[0.28em] md:text-base"
            style={{ color: "var(--muted-foreground)", animationDelay: "120ms" }}
          >
            More Power · More Security · More Lua
          </p>

          <p
            className="rise mx-auto mt-7 max-w-2xl text-base leading-relaxed md:text-lg"
            style={{ color: "var(--muted-foreground)", animationDelay: "180ms" }}
          >
            Host Luau scripts, generate license keys, lock hardware, and ship everything
            through a Discord panel — one dashboard, zero setup.
          </p>

          <div
            className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Link to="/auth" className="btn-primary w-full sm:w-auto">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link to="/commands" className="btn-outline w-full sm:w-auto">
              View Commands
            </Link>
          </div>

        </div>
      </section>

      {/* Marquee */}
      <div
        className="overflow-hidden border-y py-3"
        style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
      >
        <div className="marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {marquee.map((m) => (
                <span
                  key={`${dup}-${m}`}
                  className="flex items-center gap-6 px-6 font-mono text-[11px] tracking-[0.24em]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {m}
                  <span style={{ color: "var(--border-strong)" }}>/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <div className="eyebrow">Capabilities</div>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">
            Everything you need to ship Lua
          </h2>
          <p className="mt-4 text-base" style={{ color: "var(--muted-foreground)" }}>
            One platform for hosting, delivery, and protection — no glue code, no extra services.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card-blue group p-6">
              <div className="flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg border"
                  style={{ borderColor: "var(--border-strong)", background: "var(--accent-light)" }}
                >
                  <f.icon size={18} strokeWidth={1.6} />
                </div>
                <span className="font-mono text-[11px] tracking-[0.2em]" style={{ color: "var(--border-strong)" }}>
                  {f.tag}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="eyebrow">Workflow</div>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Three steps to protected</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border md:grid-cols-3" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
            {steps.map((st) => (
              <div key={st.n} className="p-8" style={{ background: "var(--card)" }}>
                <div className="font-display text-4xl font-bold" style={{ color: "var(--border-strong)" }}>
                  {st.n}
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{st.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border md:grid-cols-4" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
          {[
            { label: "Releases published", value: s.releasesPublished },
            { label: "Active users", value: s.activeUsers },
            { label: "Keys generated", value: s.keysGenerated },
            { label: "Scripts hosted", value: s.scriptsHosted },
          ].map((x) => (
            <div key={x.label} className="p-8 text-center" style={{ background: "var(--card)" }}>
              <div className="font-display text-3xl font-bold tracking-tight md:text-5xl">
                {x.value.toLocaleString()}
              </div>
              <div className="eyebrow mt-3">{x.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="eyebrow">Pricing</div>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-5xl">Start free, scale later</h2>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className="card-blue flex flex-col p-8"
                style={
                  p.highlight
                    ? { borderColor: "var(--foreground)", boxShadow: "0 0 0 1px var(--foreground), 0 24px 60px rgba(255,255,255,0.06)" }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  {p.highlight && <span className="badge-solid">Popular</span>}
                </div>
                <div className="mt-4 font-display text-5xl font-bold tracking-tighter">
                  {p.price}
                  {p.price.startsWith("$") && (
                    <span className="font-sans text-sm font-normal" style={{ color: "var(--muted-foreground)" }}>
                      /mo
                    </span>
                  )}
                </div>
                <ul className="mt-7 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" strokeWidth={1.6} />
                      <span style={{ color: "var(--muted-foreground)" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className={`${p.highlight ? "btn-primary" : "btn-outline"} mt-8 w-full`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t" style={{ borderColor: "var(--border)" }}>
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tighter md:text-5xl">
            Ship your script. Keep your source.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base" style={{ color: "var(--muted-foreground)" }}>
            Set up hosting, keys, and a Discord panel in under five minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth" className="btn-primary w-full sm:w-auto">
              Create your account <ArrowRight size={16} />
            </Link>
            <Link to="/commands" className="btn-outline w-full sm:w-auto">
              Browse commands
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
