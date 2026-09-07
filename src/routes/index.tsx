import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LuaMore — Luau script hosting & HWID whitelist" },
      {
        name: "description",
        content:
          "Host Roblox Luau scripts and gate every loadstring behind a key that's locked to one device. Discord panel included.",
      },
      { property: "og:title", content: "LuaMore — Luau script hosting & HWID whitelist" },
      {
        property: "og:description",
        content:
          "Protected loadstring links, free 24h keys, paid keys issued by your mods, and a full Discord whitelist panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const FEATURES = [
  {
    title: "Script hosting",
    body: "Paste or upload a .lua / .luau file. LuaMore stores it and serves it only through your protected endpoint.",
  },
  {
    title: "Instant hosting",
    body: "Paste or upload a Luau file of any size and get a protected loadstring link back immediately.",
  },
  {
    title: "HWID whitelist",
    body: "The first execution binds a key to that device's client ID. Mismatched devices are rejected and logged with their IP.",
  },
  {
    title: "Discord panel",
    body: "View Script, Get Key, Redeem Key, View Stats, Reset HWID and Get Buyer Role — all as buttons in your server.",
  },
  {
    title: "Free & paid keys",
    body: "Toggle a one-time 24-hour free key per script, or have your mods issue paid keys with /whitelist @user 10d.",
  },
  {
    title: "Execution stats",
    body: "Every load attempt is logged: key, HWID, IP, success or the exact rejection reason.",
  },
];

const BOT_COMMANDS = [
  ["/panel", "post the whitelist panel"],
  ["/whitelist @user 10d", "issue a paid key"],
  ["/link <api_key>", "link a hosted script to this server"],
  ["/unlink <api_key>", "unlink it again"],
  ["/freekeysettings", "enable or disable the free 24h key"],
];

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground">
      <SiteNav />

      <main className="flex-1">
        {/* HERO */}
        <section className="grid-lines border-b border-border/60">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
              Luau delivery infrastructure
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              Ship your script.
              <br />
              Keep your source.
            </h1>
            <p className="mt-5 text-base text-muted-foreground">
              LuaMore turns a Luau file into a key-gated, device-locked loadstring — and hands
              your Discord server a whitelist panel to run it all.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Host a script
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </section>


        {/* FEATURES */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl font-bold tracking-tight">Everything in one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <h3 className="font-mono text-sm font-semibold text-primary">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* BOT COMMANDS */}
        <section className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold tracking-tight">Bot commands</h2>
            <div className="mt-6 grid gap-3 font-mono text-sm sm:grid-cols-2">
              {BOT_COMMANDS.map(([cmd, desc]) => (
                <div
                  key={cmd}
                  className="flex flex-col gap-1 rounded-md border border-border bg-background p-4"
                >
                  <span className="font-semibold text-primary">{cmd}</span>
                  <span className="font-sans text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
