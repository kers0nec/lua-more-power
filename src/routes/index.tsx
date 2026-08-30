import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Check, FileCode2, KeyRound, Link2 } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Control who runs your scripts" },
      { name: "description", content: "Add a Lua script, choose access, and copy a hosted loader with LuaMore." },
      { property: "og:title", content: "LuaMore — Control who runs your scripts" },
      { property: "og:description", content: "Scripts, license keys, Discord panels, and hosted loaders in one workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const capabilities = [
  [FileCode2, "Scripts", "Store a script, choose protection, and copy its loader."],
  [KeyRound, "Keys", "Create timed or permanent keys and bind them to a device."],
  [Bot, "Discord", "Post key panels and manage users with slash commands."],
  [Link2, "Delivery", "Give users one stable URL that always serves your latest release."],
] as const;

const steps = [
  ["01", "Create a project", "Add the script you want to deliver."],
  ["02", "Choose access", "Use keys, Discord whitelist, or keyless mode."],
  ["03", "Copy the loader", "Paste the generated loadstring where users can find it."],
  ["04", "Check activity", "Manage runs, keys, devices, and releases."],
] as const;

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main>
        <section className="landing-hero">
          <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="site-section relative grid gap-14 py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:py-28">
            <div className="rise max-w-xl">
              <p className="eyebrow text-primary">LuaMore script control</p>
              <h1 className="mt-5 font-display text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">Control who can run your scripts.</h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Add a script, choose how access works, then copy the loader. Scripts, keys, Discord, and delivery stay together.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary">Create account <ArrowRight size={15} /></Link>
                <Link to="/how" className="btn-outline">How it works</Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Free forever", "No payment setup", "Discord ready"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check size={14} className="text-primary" />{item}</span>)}
              </div>
            </div>

            <div className="landing-instrument rise" style={{ animationDelay: "100ms" }}>
              <div className="instrument-topbar"><span className="flex items-center gap-2"><span className="status-dot" /> loader.lua</span><span>live</span></div>
              <div className="grid md:grid-cols-[1.2fr_0.8fr]">
                <div className="instrument-code">
                  <div className="code-line"><span>1</span><code>script_key = &quot;YOUR_KEY&quot;</code></div>
                  <div className="code-line"><span>2</span><code>loadstring(game:HttpGet(</code></div>
                  <div className="code-line"><span>3</span><code>&nbsp; &quot;https://luamore.app/api/public/r/LM...&quot;</code></div>
                  <div className="code-line"><span>4</span><code>))()</code></div>
                </div>
                <div className="instrument-sidebar">
                  <p className="eyebrow">Access</p>
                  <strong>Key required</strong>
                  <div className="instrument-meter"><i /></div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div><b>128</b><span>keys</span></div>
                    <div><b>42ms</b><span>response</span></div>
                  </div>
                </div>
              </div>
              <div className="instrument-footer"><span>Nightfall Hub</span><span>HWID enabled</span><span>Release 12</span></div>
            </div>
          </div>
        </section>

        <section className="site-section py-20 md:py-24">
          <p className="eyebrow">What it does</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl sm:text-5xl">The parts you actually use</h2>
          <div className="mt-10 grid border-l border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(([Icon, title, body]) => <article key={title} className="feature-cell"><Icon size={18} /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>

        <section className="border-y border-border bg-secondary">
          <div className="site-section py-20 md:py-24">
            <p className="eyebrow">Setup</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">Four steps, then you are done</h2>
            <div className="mt-10 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {steps.map(([n, title, body]) => <article key={n} className="bg-card p-6"><span className="font-mono text-xs text-primary">{n}</span><h3 className="mt-12 font-display text-xl">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p></article>)}
            </div>
          </div>
        </section>

        <section className="site-section py-20 md:py-24">
          <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Pricing</p><h2 className="mt-4 font-display text-4xl sm:text-5xl">Every feature. Zero dollars.</h2><p className="mt-4 text-muted-foreground">Unlimited scripts, keys, hosted loaders, Discord panels, and protection tools for every account.</p></div>
          <div className="mx-auto mt-10 max-w-3xl overflow-hidden border border-primary bg-card">
            <div className="grid md:grid-cols-[0.7fr_1.3fr]"><div className="border-b border-border p-8 md:border-b-0 md:border-r"><span className="badge-blue">Free forever</span><div className="mt-6 font-display text-6xl">$0</div><p className="mt-2 text-sm text-muted-foreground">No card. No billing. No upgrade.</p></div><div className="grid gap-3 p-8 sm:grid-cols-2">{["Unlimited scripts", "Unlimited keys", "HWID controls", "Discord panels", "Hosted delivery", "API access"].map(x => <span key={x} className="flex items-center gap-2 text-sm"><Check size={14} className="text-primary" />{x}</span>)}</div></div>
            <Link to="/register" className="btn-primary m-4 mt-0 flex">Get started</Link>
          </div>
        </section>

        <section className="border-t border-border"><div className="site-section py-20 text-center"><h2 className="font-display text-4xl">Start with one project.</h2><p className="mx-auto mt-4 max-w-xl text-muted-foreground">Create your workspace, add your source, and copy the generated loader.</p><Link to="/register" className="btn-primary mt-7">Create account <ArrowRight size={15} /></Link></div></section>
      </main>
      <SiteFooter />
    </div>
  );
}
