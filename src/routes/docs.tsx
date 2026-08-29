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

const guides = [
  {
    to: "/loading-screens",
    title: "Loading screen",
    desc: "Wide loading bar while LuaMore loads your script · four presets, loader URL, mobile-wide layout.",
  },
  { to: "/keys", title: "Keys", desc: "Duration, HWID, limits, Discord mapping." },
  { to: "/features", title: "Protection", desc: "LuaMore VM, cached builds, game routing." },
  {
    to: "/obfuscators",
    title: "Obfuscators",
    desc: "Run the local VM or build through the authenticated API.",
  },
  { to: "/commands", title: "Discord", desc: "Setup, roles, loaders, HWID recovery." },
  { to: "/api/docs", title: "API", desc: "Obfuscate Luau from your own backend." },
  { to: "/how", title: "How it works", desc: "Four steps from script to loader." },
  { to: "/settings", title: "Settings", desc: "Manage your account, security, and appearance." },
];

function DocsPage() {
  return (
    <PageShell
      eyebrow="Documentation"
      title="Feature reference"
      subtitle="Reference for scripts, keys, Discord, and delivery. For the in-game loading bar guide, see the link below."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {guides.map((g) => (
          <Link key={g.to} to={g.to} className="card-blue block p-6">
            <h2 className="font-display text-xl">{g.title}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {g.desc}
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
