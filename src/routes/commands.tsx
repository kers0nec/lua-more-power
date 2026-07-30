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

const GROUPS: { title: string; cmds: [string, string][] }[] = [
  {
    title: "Getting started",
    cmds: [
      ["/help", "List all available commands"],
      ["/setup", "Set up the LuaMore panel"],
      ["/login <api_key>", "Link your Discord account with a LuaMore API key"],
      ["/limits", "Check your script and panel limits"],
    ],
  },
  {
    title: "Scripts",
    cmds: [
      ["/create-script <name> <code> [ffa]", "Create a new script via Discord"],
      ["/loader <script_id>", "Get the loader for a script"],
    ],
  },
  {
    title: "Keys & panels",
    cmds: [
      ["/panel <panel_id>", "Send a panel to the current Discord channel"],
      ["/generatekey <panel_id> <hours> [note] [user]", "Generate a license key"],
      ["/keys [panel_id]", "List your recent license keys"],
      ["/deletekey <key>", "Delete a license key"],
    ],
  },
  {
    title: "Access control",
    cmds: [
      ["/whitelist <script_id> <user> [duration]", "Whitelist a user and auto-generate a key"],
      ["/blacklist <script_id> <user>", "Blacklist a user from a script"],
      ["/banuser <discord_id> [reason]", "Blacklist from website access"],
      ["/unbanuser <discord_id>", "Remove website blacklist"],
    ],
  },
  {
    title: "Hardware",
    cmds: [
      ["/resethwid <script_id>", "Reset your linked HWID"],
      ["/forceresethwid <script_id> <user>", "Force reset HWID for a user"],
      ["/banhwid <hwid> [reason]", "Ban a hardware ID"],
      ["/unbanhwid <hwid>", "Remove a hardware ID ban"],
    ],
  },
];

function Commands() {
  const total = GROUPS.reduce((n, g) => n + g.cmds.length, 0);

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
              and all {total} commands become available in your server.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl space-y-12 px-6 py-14">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <div className="flex items-center gap-4">
                <h2 className="eyebrow shrink-0">{g.title}</h2>
                <div className="hairline" />
              </div>

              <div
                className="mt-5 grid gap-px overflow-hidden rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--border)" }}
              >
                {g.cmds.map(([cmd, desc]) => (
                  <div
                    key={cmd}
                    className="grid gap-2 p-4 transition-colors md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-6"
                    style={{ background: "var(--card)" }}
                  >
                    <code className="min-w-0 font-mono text-sm break-words" style={{ color: "var(--foreground)" }}>
                      {cmd}
                    </code>
                    <div className="min-w-0 text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {desc}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
