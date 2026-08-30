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
    title: "Scripts",
    desc: "Store a script, choose protection, and copy its loader.",
    items: [
      { name: "Script storage", desc: "Paste Luau or upload a file. LuaMore stores the source permanently for you." },
      { name: "LuaMore VM obfuscation", desc: "Default Luau obfuscation optimized for Roblox scripts with anti-hook protection." },
      { name: "Cached builds", desc: "Protect on save, serve cached output for instant delivery." },
      { name: "Game routing", desc: "Bind to PlaceIds and dispatch at auth." },
      { name: "Keyless mode", desc: "Same overlay works without a key parameter for free-for-all scripts." },
    ],
  },
  {
    title: "Keys",
    desc: "Create timed or permanent keys and bind them to a device.",
    items: [
      { name: "Duration", desc: "Lifetime, daily, weekly, custom durations with automatic expiry." },
      { name: "HWID binding", desc: "Bind to device after first run. Protects against sharing and reselling." },
      { name: "Limits", desc: "Cap executions, revoke instantly, batch generate keys." },
      { name: "Discord mapping", desc: "Tie keys to guild members. Auto-assign buyer roles on redeem." },
      { name: "Anti-bypass routing", desc: "Encrypted server-side validation streams payload only after key and HWID match." },
    ],
  },
  {
    title: "Discord",
    desc: "Post key panels and manage users with slash commands.",
    items: [
      { name: "Setup", desc: "Link guild, select project, post interactive panels." },
      { name: "Roles", desc: "Buyer role on redeem, admin controls for staff." },
      { name: "Slash commands", desc: "/setup, /whitelist, /resethwid, /login, /help — all auto-registered." },
      { name: "Recovery", desc: "HWID reset from Discord. No dashboard needed." },
      { name: "Panels", desc: "Self-serve redemption panels with embedded script delivery buttons." },
    ],
  },
  {
    title: "Delivery & Loaders",
    desc: "Use signed loader URLs, keyless mode, or loading screen presets.",
    items: [
      { name: "Loader URL", desc: "Copy a signed loadstring from the dashboard. Carries your script ID." },
      { name: "Loading screens", desc: "Four wide in-game bars (Frost, Neon, Clean, Gold) while LuaMore authenticates." },
      { name: "Mobile-ready", desc: "Loading bars scale wider on desktop and nearly full-width on phone." },
      { name: "Keyless loader", desc: "Same loading overlay works without a key parameter." },
      { name: "Encrypted route", desc: "All payloads delivered through encrypted channels with heartbeat monitoring." },
    ],
  },
  {
    title: "Protection",
    desc: "Multi-layer VM obfuscation with anti-hook shields.",
    items: [
      { name: "LuaMore v13 VM", desc: "Quad-layer encryption: RLE bytecode, rotating XOR, RC4 stream, keyed PRNG." },
      { name: "Anti-Hook Shield", desc: "Silent Entropy Poisoning corrupts decryption keys when hooks are detected." },
      { name: "Anti-Tamper", desc: "Native C-closure verification and metatable integrity checks." },
      { name: "Dual-VM wrapping", desc: "Two independent VM layers for maximum protection depth." },
      { name: "Integrity verification", desc: "Dual FNV-1a & djb2 32-bit checksums prevent memory substitution." },
    ],
  },
];

function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Feature reference"
      title="Features"
      subtitle="Reference for scripts, keys, Discord, protection, and delivery. LuaMore is free — every feature is included for every account."
    >
      <div className="grid gap-10 md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-2xl">{g.title}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {g.desc}
            </p>
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

      {/* Adding a loading screen callout */}
      <div
        className="mt-14 rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
      >
        <h2 className="font-display text-xl">Adding a loading screen?</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
          A wide loading bar that works on mobile and desktop. Four presets (Frost, Neon, Clean,
          Gold) with customizable title, subtitle, accent colors, and position. Add your loader URL,
          then tweak it if you want.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/loading-screens" className="btn-primary">
            Loading screen guide
          </Link>
          <Link to="/docs" className="btn-outline">
            All docs
          </Link>
        </div>
      </div>

      {/* Quick start */}
      <div
        className="mt-10 rounded-xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
      >
        <h2 className="font-display text-xl">Quick start</h2>
        <ol className="mt-4 space-y-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <li className="flex gap-3">
            <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>01</span>
            <span>Create a project in the dashboard and pick a loading screen preset (or none).</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>02</span>
            <span>Copy the matching Luau from the loading presets.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>03</span>
            <span>Paste your loader URL from the dashboard into the Luau template.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>04</span>
            <span>Run as a <code className="font-mono text-xs px-1 rounded" style={{ background: "var(--muted)", color: "var(--foreground)" }}>LocalScript</code> — the bar shows while LuaMore loads your script.</span>
          </li>
        </ol>
      </div>
    </PageShell>
  );
}
