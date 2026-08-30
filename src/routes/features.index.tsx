import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Boxes, FileCode2, KeyRound, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/features/")({
  head: () => ({
    meta: [
      { title: "Features — LuaMore" },
      { name: "description", content: "Explore LuaMore script hosting, keys, Discord panels, loaders, and access controls." },
      { property: "og:title", content: "Features — LuaMore" },
      { property: "og:description", content: "Script hosting, keys, Discord panels, loaders, and access controls in one free workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

const groups = [
  { icon: FileCode2, title: "Scripts", desc: "Create, upload, update, and publish Lua source while keeping a stable loader URL.", bullets: ["Permanent source storage", "Release history", "FFA and key-required modes", "Copy-ready loadstrings"] },
  { icon: KeyRound, title: "Keys", desc: "Control how long access lasts and which device can use each license.", bullets: ["Custom expirations", "First-run HWID binding", "Instant revoke and reset", "Bulk key generation"] },
  { icon: Bot, title: "Discord", desc: "Run routine access operations from Discord without handing out dashboard access.", bullets: ["Interactive panels", "Slash-command workflows", "Administrator checks", "User and key management"] },
  { icon: Boxes, title: "Delivery", desc: "Serve the current script through a predictable hosted loader for every release.", bullets: ["Short hosted URLs", "Raw and hosted routes", "Keyless delivery", "Update without relinking"] },
  { icon: MonitorSmartphone, title: "Loading UI", desc: "Add a polished loading state while authentication and delivery complete.", bullets: ["Four visual presets", "Desktop and mobile preview", "Custom labels and position", "Copyable Luau templates"] },
  { icon: ShieldCheck, title: "Workspace controls", desc: "Keep scripts, keys, bans, panels, API access, and profile settings organized.", bullets: ["HWID ban management", "API key controls", "Panel history", "Account settings"] },
];

function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Product reference"
      title="Everything needed to ship and manage a loader."
      subtitle="LuaMore brings source hosting, access keys, device binding, Discord controls, and delivery into one focused workspace. Every capability is included for free."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <article key={group.title} className="card-blue lift-card flex min-h-80 flex-col p-7">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-accent">
              <group.icon size={18} className="text-primary" />
            </div>
            <h2 className="mt-7 font-display text-2xl">{group.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{group.desc}</p>
            <ul className="mt-7 space-y-3 border-t border-border pt-5 text-sm text-muted-foreground">
              {group.bullets.map((bullet) => <li key={bullet}>— {bullet}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <section className="mt-16 grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[1fr_0.7fr]">
        <div className="p-8 md:p-12">
          <div className="eyebrow">Visual delivery</div>
          <h2 className="mt-4 font-display text-3xl">Build a loading screen around your loader.</h2>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            Preview four responsive in-game bars, customize the title and placement, then copy the
            matching Lua template directly into your project.
          </p>
          <Link to="/features/key-system-gui" className="btn-primary mt-8">
            Open the GUI builder <ArrowRight size={15} />
          </Link>
        </div>
        <div className="dot-bg flex min-h-64 items-center justify-center border-t border-border bg-secondary p-8 lg:border-l lg:border-t-0">
          <div className="w-full max-w-sm rounded-md border border-primary bg-card p-4 shadow-hover">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Validating access</span>
              <span className="font-mono text-primary">72%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[72%] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}