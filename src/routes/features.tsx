import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — LuaMore" },
      {
        name: "description",
        content: "Scripts, keys, Discord, protection, and loaders — all free on LuaMore.",
      },
    ],
  }),
  component: FeaturesPage,
});

const groups = [
  {
    title: "Protection",
    items: [
      { name: "LuaMore VM", desc: "Default Luau obfuscation optimized for Roblox scripts." },
      { name: "Cached builds", desc: "Protect on save, serve cached output." },
      { name: "Game routing", desc: "Bind to PlaceIds and dispatch at auth." },
    ],
  },
  {
    title: "Keys",
    items: [
      { name: "Duration", desc: "Lifetime, daily, weekly, custom." },
      { name: "HWID", desc: "Bind to device after first run." },
      { name: "Limits", desc: "Cap executions, revoke instantly." },
      { name: "Discord map", desc: "Tie keys to guild members." },
    ],
  },
  {
    title: "Discord",
    items: [
      { name: "Setup", desc: "Link guild, select project." },
      { name: "Roles", desc: "Buyer role on redeem." },
      { name: "Loaders", desc: "Panel or slash command delivery." },
      { name: "Recovery", desc: "HWID reset from Discord." },
    ],
  },
  {
    title: "Delivery",
    items: [
      { name: "Loader URL", desc: "Copy a signed loadstring from the dashboard." },
      { name: "Loading screens", desc: "Four wide in-game bars while LuaMore authenticates." },
      { name: "Keyless mode", desc: "Same overlay works without a key parameter." },
    ],
  },
  {
    title: "Rewards",
    items: [
      { name: "Ad links", desc: "Linkvertise, LootLabs, Work.ink, or your own provider." },
      { name: "Claims", desc: "Track pending, verified, and issued key claims." },
      { name: "Anti-replay", desc: "One-time completion records stop replayed receipts." },
    ],
  },
];

function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Feature reference"
      title="Features"
      subtitle="Reference for scripts, keys, Discord, and delivery. LuaMore is free — every feature is included."
    >
      <div className="grid gap-10 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-2xl">{g.title}</h2>
            <ul className="mt-4 space-y-4">
              {g.items.map((i) => (
                <li key={i.name} className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <div className="font-medium">{i.name}</div>
                  <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {i.desc}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card-blue p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold">In-Game Loading Screens</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Wide responsive loading bars with breathing dot animations that keep player experience
              smooth during script decryption and authorization.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/loading-screens" className="btn-primary">
              View Loading Guides
            </Link>
          </div>
        </div>

        <div className="card-blue p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold">Advanced Key System</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              HWID device locking, self-serve Discord bot panels, anti-bypass protection, and
              time-based key durations.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/keys" className="btn-primary">
              Key System Simulator
            </Link>
            <Link to="/obfuscators" className="btn-outline">
              Obfuscation Engine
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
