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

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Shield, title: "Secure loaders", desc: "Serve scripts through key-gated loader endpoints instead of exposing raw links." },
  { icon: KeyRound, title: "License keys", desc: "Generate single or bulk keys with expiry windows, notes, and per-script scoping." },
  { icon: Cpu, title: "HWID protection", desc: "Lock scripts to hardware, ban abusers, and reset devices in a single click." },
  { icon: MessageSquare, title: "Discord panels", desc: "Interactive Discord panels with redeem, script, role, and HWID buttons." },
  { icon: CheckCircle2, title: "Whitelist system", desc: "Auto-generate keys the moment you whitelist a user by Discord ID." },
  { icon: Package, title: "Script hosting", desc: "Version, release, and serve your builds from a single dashboard." },
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

function Home() {
  const stats = useQuery({ queryKey: ["public-stats"], queryFn: () => getPublicStats() });
  const s = stats.data ?? { releasesPublished: 0, scriptsHosted: 0, keysGenerated: 0, activeUsers: 0 };

  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 pt-24 pb-20 text-center md:pt-36 md:pb-32">
          <div className="rise inline-flex">
            <span className="badge-blue">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--primary)" }}
              />
              Built for Luau developers
            </span>
          </div>

          <h1
            className="rise mt-8 font-display text-6xl md:text-8xl"
            style={{ animationDelay: "60ms" }}
          >
            More <span style={{ fontStyle: "italic", color: "var(--primary)" }}>power</span>.
            <br />
            More <span style={{ fontStyle: "italic", color: "var(--primary)" }}>security</span>.
          </h1>

          <p
            className="rise mx-auto mt-8 max-w-xl text-lg leading-relaxed"
            style={{ color: "var(--muted-foreground)", animationDelay: "180ms" }}
          >
            Host Luau scripts, generate license keys, lock hardware, and ship
            everything through a Discord panel — one dashboard, zero setup.
          </p>

          <div
            className="rise mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Capabilities</div>
          <h2 className="mt-4 font-display text-4xl md:text-6xl">
            Everything you need <span style={{ fontStyle: "italic" }}>to ship Lua</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base" style={{ color: "var(--muted-foreground)" }}>
            One platform for hosting, delivery, and protection — no glue code, no extra services.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
          {features.map((f) => (
            <div key={f.title} className="p-8 transition-colors hover:bg-[color:var(--muted)]" style={{ background: "var(--card)" }}>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ background: "var(--accent-light)", color: "var(--primary)" }}
              >
                <f.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="mt-6 font-display text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="eyebrow">Workflow</div>
            <h2 className="mt-4 font-display text-4xl md:text-6xl">
              Three steps <span style={{ fontStyle: "italic" }}>to protected</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((st) => (
              <div key={st.n} className="border-t pt-6" style={{ borderColor: "var(--border-strong)" }}>
                <div className="font-mono text-xs" style={{ color: "var(--primary)" }}>
                  {st.n}
                </div>
                <h3 className="mt-4 font-display text-2xl">{st.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {[
            { label: "Releases published", value: s.releasesPublished },
            { label: "Active users", value: s.activeUsers },
            { label: "Keys generated", value: s.keysGenerated },
            { label: "Scripts hosted", value: s.scriptsHosted },
          ].map((x) => (
            <div key={x.label} className="text-center">
              <div className="font-display text-5xl md:text-6xl">
                {x.value.toLocaleString()}
              </div>
              <div className="eyebrow mt-3">{x.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t" style={{ background: "var(--secondary)", borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow">Pricing</div>
            <h2 className="mt-4 font-display text-4xl md:text-6xl">
              Start free, <span style={{ fontStyle: "italic" }}>scale later</span>
            </h2>
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
                  {p.highlight && <span className="badge-solid">Popular</span>}
                </div>
                <div className="mt-6 font-display text-6xl">
                  {p.price}
                  {p.price.startsWith("$") && (
                    <span className="font-sans text-sm font-normal" style={{ color: "var(--muted-foreground)" }}>
                      {" "}/mo
                    </span>
                  )}
                </div>
                <ul className="mt-8 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" strokeWidth={1.6} style={{ color: "var(--primary)" }} />
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
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="font-display text-4xl md:text-6xl">
            Ship your script. <span style={{ fontStyle: "italic" }}>Keep your source.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base" style={{ color: "var(--muted-foreground)" }}>
            Set up hosting, keys, and a Discord panel in under five minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
