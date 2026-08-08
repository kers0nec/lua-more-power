import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/commands")({
  head: () => ({
    meta: [
      { title: "Discord Commands — LuaMore" },
      { name: "description", content: "All LuaMore Discord slash commands, including /create-script, /generatekey, /whitelist, /loader." },
      { property: "og:title", content: "LuaMore Commands" },
      { property: "og:description", content: "Every LuaMore Discord slash command explained." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Commands,
});

const STEPS: [string, string][] = [
  ["1", "Invite the LuaMore bot to your Discord server."],
  ["2", "Enable Key system on your script."],
  ["3", "Run /setup in a channel and pick the script."],
  ["4", "Configure the Buyer role and Admin roles for that panel above."],
  ["5", "Use /whitelist user duration — duration like 20s, 35m, 2h, 1d, 7d, 30d (omit for forever)."],
  ["6", "Admins can use /resethwid user with no cooldown."],
];

const COMMANDS: [string, string][] = [
  ["/setup [script_id]", "Create the control panel in this channel for a script"],
  ["/whitelist <user> [duration]", "Whitelist a user — 20s, 35m, 2h, 1d, 7d, 30d, or omit for forever"],
  ["/resethwid [user]", "Reset your HWID; admins can reset for anyone, no cooldown"],
  ["/login <api_key>", "Link your Discord account to LuaMore"],
  ["/help", "Show the how-to-use guide in Discord"],
];

function Commands() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b" style={{ background: "var(--gradient-hero)", borderColor: "var(--border)" }}>
          <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            <div className="eyebrow">Discord integration</div>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tighter md:text-6xl">
              Slash commands
            </h1>
            <p className="mt-5 max-w-2xl text-base" style={{ color: "var(--muted-foreground)" }}>
              Point your bot's Interactions Endpoint URL at{" "}
              <code
                className="rounded px-1.5 py-0.5 text-sm"
                style={{ background: "var(--muted)", border: "1px solid var(--border)" }}
              >
                /api/public/discord/interactions
              </code>{" "}
              and every command become available in your server.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl space-y-12 px-6 py-14">
          <section>
            <div className="flex items-center gap-4">
              <h2 className="eyebrow shrink-0">How to use</h2>
              <div className="hairline" />
            </div>
            <ol className="mt-5 grid gap-px overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
              {STEPS.map(([n, text]) => (
                <li key={n} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 p-4" style={{ background: "var(--card)" }}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>{n}</span>
                  <span className="min-w-0 text-sm" style={{ color: "var(--foreground)" }}>{text}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <div className="flex items-center gap-4">
              <h2 className="eyebrow shrink-0">Commands</h2>
              <div className="hairline" />
            </div>
            <div className="mt-5 grid gap-px overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--border)" }}>
              {COMMANDS.map(([cmd, desc]) => (
                <div key={cmd} className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-6" style={{ background: "var(--card)" }}>
                  <code className="min-w-0 font-mono text-sm break-words" style={{ color: "var(--foreground)" }}>{cmd}</code>
                  <div className="min-w-0 text-sm" style={{ color: "var(--muted-foreground)" }}>{desc}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
