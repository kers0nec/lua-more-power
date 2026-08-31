import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — LuaMore" },
      {
        name: "description",
        content: "Feature reference for scripts, keys, Discord, and loading screens.",
      },
    ],
  }),
  component: DocsPage,
});

const categories = [
  {
    title: "Guides",
    items: [
      {
        to: "/loading-screens",
        title: "Loading screen",
        desc: "Wide loading bar while LuaMore loads your script · four presets (Frost, Neon, Clean, Gold), loader URL, mobile-wide layout, and support contact.",
        badge: "Popular",
      },
      {
        to: "/how",
        title: "How it works",
        desc: "Four steps from script to loader. Create project, choose access, copy loader, check activity.",
      },
    ],
  },
  {
    title: "Protection",
    items: [
      {
        to: "/obfuscators",
        title: "Obfuscators",
        desc: "LuaMore VM — default Luau obfuscation with anti-hook shield, rotating XOR, RC4, and dual-VM wrapping.",
      },
      {
        to: "/features",
        title: "Cached builds",
        desc: "Protect on save, serve cached output for instant delivery to end users.",
      },
      {
        to: "/features",
        title: "Game routing",
        desc: "Bind to PlaceIds and dispatch at auth. Route scripts to specific Roblox games.",
      },
    ],
  },
  {
    title: "Keys",
    items: [
      {
        to: "/keys",
        title: "Key system",
        desc: "Duration (lifetime, daily, weekly, custom), HWID binding, execution limits, and Discord mapping.",
      },
      {
        to: "/keys",
        title: "HWID",
        desc: "Bind to device after first run. Anti-bypass routing with encrypted server-side validation.",
      },
      {
        to: "/keys",
        title: "Limits",
        desc: "Cap executions, revoke instantly, batch generate keys.",
      },
      {
        to: "/keys",
        title: "Discord map",
        desc: "Tie keys to guild members. Auto-assign buyer roles on redeem.",
      },
    ],
  },
  {
    title: "Discord",
    items: [
      {
        to: "/commands",
        title: "Setup",
        desc: "Link guild, select project, post interactive panels.",
      },
      { to: "/commands", title: "Roles", desc: "Buyer role on redeem. Admin controls for staff." },
      {
        to: "/commands",
        title: "Slash commands",
        desc: "/setup, /whitelist, /resethwid, /login, /help.",
      },
      { to: "/commands", title: "Recovery", desc: "HWID reset from Discord. No dashboard needed." },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        to: "/features",
        title: "Scripts",
        desc: "Store Luau, choose protection, copy loader. Unlimited scripts per account.",
      },
      {
        to: "/loading-screens",
        title: "Loading screens",
        desc: "Four presets (Frost, Neon, Clean, Gold). Mobile-ready, customizable title and accent.",
      },
      {
        to: "/settings",
        title: "Settings",
        desc: "Manage profile, security, appearance, notifications, and data export.",
      },
      { to: "/faq", title: "FAQ", desc: "Frequently asked questions about LuaMore." },
      {
        to: "/changelog",
        title: "Changelog",
        desc: "Latest releases, security upgrades, and new capabilities.",
      },
    ],
  },
];

function DocsPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="Feature reference"
      subtitle="Reference for scripts, keys, Discord, protection, and delivery. For the in-game loading bar guide, see the link below."
    >
      {categories.map((cat) => (
        <section key={cat.title} className="mb-12 last:mb-0">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="eyebrow shrink-0">{cat.title}</h2>
            <div className="hairline" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {cat.items.map((g) => (
              <Link key={`${g.to}-${g.title}`} to={g.to} className="card-blue block p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg">{g.title}</h3>
                  {g.badge && <span className="badge-blue shrink-0">{g.badge}</span>}
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {g.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div
        className="mt-14 rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
      >
        <h2 className="font-display text-xl">Adding a loading screen?</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          A wide loading bar that works on mobile and desktop. Add your loader URL, then tweak it if
          you want. Four presets with customizable title, subtitle, and accent colors.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/loading-screens" className="btn-primary">
            Loading screen guide
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
