import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DISCORD_INVITE } from "@/lib/site";

export const Route = createFileRoute("/commands")({
  head: () => ({
    meta: [
      { title: "Discord Bot Commands — LuaMore" },
      {
        name: "description",
        content:
          "Learn all 16 LuaMore Discord commands for scripts, panels, keys, whitelists, and HWID access.",
      },
      { property: "og:title", content: "LuaMore Discord Bot Commands" },
      { property: "og:description", content: "All 16 LuaMore bot commands and their arguments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Commands,
});

const COMMANDS = [
  [
    "/create-script name code [ffa] [obfuscate] [mode]",
    "Create and optionally protect a hosted Lua script.",
  ],
  ["/panel panel_id", "Send an interactive five-button panel to the current channel."],
  ["/generatekey panel_id [hours] [note] [user]", "Generate a permanent or expiring panel key."],
  [
    "/whitelist script_id user [duration]",
    "Grant access, generate a key, and send the loader when DMs are open.",
  ],
  ["/blacklist script_id user", "Revoke the user's whitelist and assigned keys for one script."],
  ["/deletekey key", "Permanently delete one of your license keys."],
  ["/resethwid script_id", "Reset your own HWID lock for one script."],
  ["/forceresethwid script_id user", "Force-reset a user's HWID lock (LuaMore owner only)."],
  [
    "/banuser discord_id [reason]",
    "Block a linked Discord account from website access (owner only).",
  ],
  ["/unbanuser discord_id", "Restore website access (owner only)."],
  ["/banhwid hwid [reason]", "Block a hardware ID from your scripts."],
  ["/unbanhwid hwid", "Remove one of your hardware ID bans."],
  ["/loader script_id", "Receive your assigned keyed loader or an open FFA loader."],
  ["/keys [panel_id]", "List up to 10 recent keys, optionally filtered by panel."],
  ["/setup", "Show the quick-start guide."],
  ["/help", "Show all command categories."],
] as const;

function Commands() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-card/40">
          <div className="grid-bg mask-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            <div className="eyebrow">Discord integration</div>
            <h1 className="mt-3 font-display text-4xl font-bold md:text-6xl">
              16 commands. One workflow.
            </h1>
            <p className="mt-5 max-w-2xl text-muted-foreground">
              Create scripts, send panels, issue keys, manage access, and handle HWID protection
              directly from Discord.
            </p>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Invite LuaMore
            </a>
          </div>
        </section>
        <section className="mx-auto w-full max-w-5xl px-6 py-14">
          <div className="flex items-center gap-4">
            <h2 className="eyebrow shrink-0">Command reference</h2>
            <div className="hairline" />
          </div>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-border bg-border">
            {COMMANDS.map(([command, description], index) => (
              <article
                key={command}
                className="grid gap-3 bg-card p-5 md:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1fr)] md:items-center"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <code className="break-words font-mono text-sm text-foreground">{command}</code>
                <p className="text-sm text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
