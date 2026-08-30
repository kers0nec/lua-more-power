import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  FileCode2,
  Gauge,
  KeyRound,
  Link2,
  LockKeyhole,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Script access and delivery" },
      {
        name: "description",
        content: "Host Lua scripts, issue keys, bind devices, and deliver protected loaders for free.",
      },
      { property: "og:title", content: "LuaMore — Script access and delivery" },
      {
        property: "og:description",
        content: "Host Lua scripts, issue keys, bind devices, and deliver protected loaders for free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const features = [
  {
    icon: FileCode2,
    title: "Script hosting",
    desc: "Save source, publish updates, and keep every loader pointed at the latest release.",
    detail: "Version history included",
  },
  {
    icon: KeyRound,
    title: "License keys",
    desc: "Issue temporary or permanent keys with expiration, notes, and device binding.",
    detail: "Batch generation built in",
  },
  {
    icon: Bot,
    title: "Discord controls",
    desc: "Post panels and manage access from your server with registered slash commands.",
    detail: "Admin permission checks",
  },
  {
    icon: Link2,
    title: "Hosted delivery",
    desc: "Give users one compact loadstring while LuaMore handles source delivery behind it.",
    detail: "FFA and keyed modes",
  },
];

const workflow = [
  ["01", "Add your source", "Paste Luau or upload a .lua file from the dashboard."],
  ["02", "Set access rules", "Choose key-required or free-for-all delivery."],
  ["03", "Copy the loader", "Use the generated loadstring in your distribution flow."],
  ["04", "Manage in one place", "Update code, keys, devices, panels, and releases."],
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="dot-bg mask-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <div className="site-section relative grid min-h-[calc(100vh-4rem)] items-center gap-14 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
            <div className="rise max-w-xl">
              <div className="eyebrow">LuaMore / script access</div>
              <h1 className="mt-5 font-display text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
                Control who can run your scripts.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
                Store Lua source, choose how access works, and ship a clean hosted loader. No paid
                tiers, no checkout, and no limit on projects.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary">
                  Start building <ArrowRight size={16} />
                </Link>
                <Link to="/features" className="btn-outline">
                  Explore features
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                {['Free forever', 'No payment setup', 'Discord ready'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <Check size={14} className="text-primary" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-panel rise relative overflow-hidden rounded-lg" style={{ animationDelay: "120ms" }}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <TerminalSquare size={15} className="text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">delivery.lua</span>
                </div>
                <span className="badge-blue">live</span>
              </div>
              <div className="border-b border-border p-5 sm:p-7">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-lg">Nightfall Hub</p>
                    <p className="mt-1 text-xs text-muted-foreground">Key required · HWID enabled</p>
                  </div>
                  <ShieldCheck size={22} className="text-primary" />
                </div>
                <pre className="overflow-x-auto rounded-md border border-border bg-input p-4 font-mono text-xs leading-6 text-card-foreground">
{`script_key = "YOUR_KEY_HERE"
loadstring(game:HttpGet(
  "https://luamore.app/scripts/hosted/LM-demo.lua"
))()`}
                </pre>
              </div>
              <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  ["4,284", "successful runs"],
                  ["37ms", "average response"],
                  ["128", "active licenses"],
                ].map(([value, label]) => (
                  <div key={label} className="p-5">
                    <p className="font-display text-2xl">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="site-section py-24">
          <div className="max-w-2xl">
            <div className="eyebrow">The workspace</div>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">The parts you actually use.</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A focused control room for scripts, access, delivery, and Discord—not another crowded
              admin template.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="card-blue lift-card p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-accent">
                    <feature.icon size={18} className="text-primary" />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{feature.detail}</span>
                </div>
                <h3 className="mt-8 font-display text-2xl">{feature.title}</h3>
                <p className="mt-3 max-w-md leading-7 text-muted-foreground">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary">
          <div className="site-section py-24">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <div className="eyebrow">Workflow</div>
                <h2 className="mt-4 font-display text-4xl sm:text-5xl">Four steps. Then ship.</h2>
                <p className="mt-5 leading-7 text-muted-foreground">
                  Move from raw source to a managed loader without stitching together separate key,
                  hosting, and bot services.
                </p>
                <Link to="/how" className="btn-outline mt-8">
                  See the full setup <ArrowRight size={15} />
                </Link>
              </div>
              <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {workflow.map(([number, title, description]) => (
                  <div key={number} className="bg-card p-7">
                    <span className="font-mono text-xs text-primary">{number}</span>
                    <h3 className="mt-8 font-display text-xl">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="site-section py-24">
          <div className="grid gap-5 lg:grid-cols-3">
            {[
              [LockKeyhole, "Device-bound access", "Bind a key to its first device and reset it from the dashboard or Discord."],
              [Gauge, "Clear activity", "Inspect current keys, script releases, and recent account activity without digging."],
              [ShieldCheck, "Controlled delivery", "Keep source behind your hosted loader and change the script without changing its URL."],
            ].map(([Icon, title, body]) => {
              const FeatureIcon = Icon as typeof LockKeyhole;
              return (
                <div key={title as string} className="border-t border-border pt-6">
                  <FeatureIcon size={19} className="text-primary" />
                  <h3 className="mt-5 font-display text-xl">{title as string}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{body as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border">
          <div className="site-section py-24">
            <div className="relative overflow-hidden rounded-lg border border-border bg-card px-6 py-14 text-center sm:px-12">
              <div className="dot-bg pointer-events-none absolute inset-0 opacity-40" aria-hidden />
              <div className="relative mx-auto max-w-2xl">
                <div className="eyebrow">No tiers. No billing.</div>
                <h2 className="mt-4 font-display text-4xl sm:text-5xl">Start with one script.</h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                  Create your workspace, add the source, and copy the generated loader. Every LuaMore
                  feature is included for free.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link to="/register" className="btn-primary">Create account</Link>
                  <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-outline">Join Discord</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}