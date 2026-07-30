import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/commands")({
  head: () => ({
    meta: [
      { title: "Discord Commands — LuaMore" },
      { name: "description", content: "All LuaMore Discord slash commands, including /create-script, /generatekey, /whitelist, /validate." },
      { property: "og:title", content: "LuaMore Commands" },
      { property: "og:description", content: "Every LuaMore Discord slash command explained." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Commands,
});

const CMDS: [string, string][] = [
  ["/create-script <name> [code] [ffa] [obfuscate] [mode]", "Create a new script via Discord"],
  ["/login <api_key>", "Link your Discord account with a LuaMore API key"],
  ["/limits", "Check your script and panel limits"],
  ["/panel <panel_id>", "Send a panel to the current Discord channel"],
  ["/generatekey <panel_id> <hours> [note] [user]", "Generate a license key"],
  ["/whitelist <script_id> <user> [duration]", "Whitelist a user and auto-generate a key"],
  ["/blacklist <script_id> <user>", "Blacklist a user from a script"],
  ["/deletekey <key>", "Delete a license key"],
  ["/resethwid <script_id>", "Reset your linked HWID"],
  ["/forceresethwid <script_id> <user>", "Force reset HWID for a user"],
  ["/banuser <discord_id> [reason]", "Blacklist from website access"],
  ["/unbanuser <discord_id>", "Remove website blacklist"],
  ["/banhwid <hwid> [reason]", "Ban a hardware ID"],
  ["/unbanhwid <hwid>", "Remove a hardware ID ban"],
  ["/loader <script_id>", "Get the loader for a script"],
  ["/keys [panel_id]", "List your recent license keys"],
  ["/setup", "Set up the LuaMore panel"],
  ["/help", "List all available commands"],
  ["/validate <code>", "Validate Lua syntax using Larph API"],
];

function Commands() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-10">
        <h1 className="text-3xl font-bold">Discord Slash Commands</h1>
        <p className="mt-2" style={{ color: "var(--muted-foreground)" }}>
          Configure the LuaMore bot's Interactions Endpoint URL to <code className="text-sm">/api/public/discord/interactions</code>, then register these commands.
        </p>
        <div className="mt-8 card-blue divide-y">
          {CMDS.map(([cmd, desc]) => (
            <div key={cmd} className="p-4 flex flex-col md:flex-row md:items-center md:gap-6">
              <code className="text-sm font-mono md:w-1/2" style={{ color: "var(--primary-dark)" }}>{cmd}</code>
              <div className="text-sm mt-1 md:mt-0" style={{ color: "var(--muted-foreground)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
