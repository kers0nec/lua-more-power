import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { getPublicStats } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — More Power, More Security, More Lua" },
      { name: "description", content: "Advanced Luau obfuscation, license keys, HWID protection, and Discord panels — all in one platform." },
      { property: "og:title", content: "LuaMore — Advanced Luau Obfuscation Platform" },
      { property: "og:description", content: "Obfuscate, host, and protect your Lua scripts with license keys, HWID locking, and Discord integration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  { icon: "🛡️", title: "Larph Obfuscation", desc: "Powered by the Larph engine — control-flow scrambling, variable renaming, and server-side skid protection." },
  { icon: "🔑", title: "License Management", desc: "Generate single or bulk keys with expiry, notes, and per-script scoping." },
  { icon: "🖥️", title: "HWID Protection", desc: "Lock scripts to hardware, ban abusers, and reset devices in one click." },
  { icon: "💬", title: "Panel System", desc: "Interactive Discord panels with redeem, script, role, and HWID buttons." },
  { icon: "✅", title: "Whitelist System", desc: "Auto-generate keys when whitelisting a user by Discord ID." },
  { icon: "📦", title: "Script Hosting", desc: "Version, release, and serve obfuscated scripts through secure loaders." },
];

const steps = [
  { n: 1, title: "Upload your Luau script", desc: "Paste code or import from Discord — validated on the fly." },
  { n: 2, title: "Obfuscate with Larph", desc: "Choose Light, Standard, or Advanced. Server-side protection available." },
  { n: 3, title: "Deploy with Discord", desc: "Panels, license keys, and HWID checks — all wired to your server." },
];

const plans = [
  { name: "Free", price: "$0", features: ["5 scripts", "Basic obfuscation", "Discord panel", "Community support"], cta: "Start free" },
  { name: "Pro", price: "$9", highlight: true, features: ["50 scripts", "Advanced obfuscation", "Bulk key generation", "Priority Larph queue"], cta: "Go Pro" },
  { name: "Enterprise", price: "Custom", features: ["Unlimited scripts", "Skid protection tier", "Dedicated support", "Custom Discord bot"], cta: "Contact us" },
];

function Home() {
  const stats = useQuery({ queryKey: ["public-stats"], queryFn: () => getPublicStats() });
  const s = stats.data ?? { scriptsObfuscated: 0, scriptsHosted: 0, keysGenerated: 0, activeUsers: 0 };

  return (
    <div className="min-h-screen">
      <SiteNav />
      {/* Hero */}
      <section style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
          <div className="inline-flex badge-blue mb-6">✨ Powered by the Larph obfuscation engine</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Lua<span style={{ color: "var(--primary)" }}>More</span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl" style={{ color: "var(--muted-foreground)" }}>
            More Power, More Security, More Lua.
          </p>
          <p className="mt-6 mx-auto max-w-2xl text-base" style={{ color: "var(--muted-foreground)" }}>
            Obfuscate Luau scripts, generate license keys, lock hardware, and ship
            everything through a Discord panel — one dashboard, zero setup.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" className="btn-primary">Get Started →</Link>
            <Link to="/commands" className="btn-outline">View Commands</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center">Everything you need to ship Lua</h2>
        <p className="mt-3 text-center" style={{ color: "var(--muted-foreground)" }}>
          One platform for obfuscation, delivery, and protection.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card-blue p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "var(--secondary)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="card-blue p-8 text-center">
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Scripts Obfuscated", value: s.scriptsObfuscated },
            { label: "Active Users", value: s.activeUsers },
            { label: "Keys Generated", value: s.keysGenerated },
            { label: "Scripts Hosted", value: s.scriptsHosted },
          ].map((x) => (
            <div key={x.label} className="card-blue p-6 text-center">
              <div className="text-3xl md:text-4xl font-bold" style={{ color: "var(--primary)" }}>
                {x.value.toLocaleString()}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>{x.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ background: "var(--secondary)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center">Simple pricing</h2>
          <p className="mt-3 text-center" style={{ color: "var(--muted-foreground)" }}>
            Start free, upgrade when you scale.
          </p>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className="card-blue p-8"
                style={p.highlight ? { borderColor: "var(--primary)", boxShadow: "0 12px 40px rgba(0,170,255,0.25)" } : undefined}
              >
                {p.highlight && <div className="badge-solid mb-3">Most popular</div>}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <div className="mt-2 text-4xl font-bold">
                  {p.price}
                  {p.price.startsWith("$") && <span className="text-base font-normal" style={{ color: "var(--muted-foreground)" }}>/mo</span>}
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span style={{ color: "var(--primary)" }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className={p.highlight ? "btn-primary mt-6 w-full" : "btn-outline mt-6 w-full"}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
