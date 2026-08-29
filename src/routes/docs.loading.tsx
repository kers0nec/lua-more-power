import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { CopyCode } from "@/components/CopyCode";
import { LOADING_PRESETS, LOADER_USAGE } from "@/lib/loading-presets";
import { DISCORD_SUPPORT } from "@/lib/site";

export const Route = createFileRoute("/docs/loading")({
  head: () => ({
    meta: [
      { title: "Loading screens — LuaMore Docs" },
      {
        name: "description",
        content: "Wide in-game loading bars while LuaMore authenticates and delivers your script.",
      },
    ],
  }),
  component: LoadingDocs,
});

function LoadingDocs() {
  const [id, setId] = useState(LOADING_PRESETS[0].id);
  const preset = LOADING_PRESETS.find((p) => p.id === id) ?? LOADING_PRESETS[0];

  return (
    <PageShell
      eyebrow="Docs"
      title="Loading screen for your script"
      subtitle="Wide in-game loading bars while LuaMore authenticates and delivers your script. Pick a preset, paste the Luau, set your loader URL."
    >
      <ol className="mb-10 list-decimal space-y-2 pl-5 text-sm" style={{ color: "var(--muted-foreground)" }}>
        <li>Create a script in the dashboard and pick a loading screen preset (or none).</li>
        <li>Copy the matching Luau from the presets below.</li>
        <li>Paste your loader URL from the dashboard into the HttpGet call.</li>
        <li>Run as a LocalScript — the bar shows while LuaMore loads your script.</li>
      </ol>
      <p className="mb-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
        Keys stay in the loader URL from your dashboard — this is not a key-entry box.
      </p>

      <h2 className="font-display text-2xl">4 wide loading bars (mobile-ready)</h2>
      <p className="mt-2 mb-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
        Centered horizontal strips with title, subtitle, and spinner. Each scales wider on desktop and
        nearly full-width on phone. Customize LOADING_TITLE, LOADING_SUBTITLE, and accent colors in the
        file.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LOADING_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setId(p.id)}
            className="card-blue p-4 text-left"
            style={id === p.id ? { borderColor: "var(--foreground)" } : undefined}
          >
            <div className="font-display text-lg">{p.name}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {p.blurb}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <CopyCode label={`loading-${preset.id}-bar.lua`} code={preset.source} />
      </div>

      <h2 className="mt-14 font-display text-2xl">Loader URL</h2>
      <p className="mt-2 mb-4 text-sm" style={{ color: "var(--muted-foreground)" }}>
        Dashboard → Scripts → your project → copy the loader for the script. Keyed scripts can include{" "}
        <code>_G.script_key</code>. Keyless: use the same loading overlay without a key parameter.
      </p>
      <CopyCode label="usage.lua" code={LOADER_USAGE} />

      <h2 className="mt-14 font-display text-2xl">Don&apos;t</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--muted-foreground)" }}>
        <li>Hardcode license keys in your game — use the dashboard loader URL.</li>
        <li>Skip the loader and try to HttpGet the script directly. Delivery won&apos;t work.</li>
      </ul>

      <h2 className="mt-14 font-display text-2xl">Need help?</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
        We can help with custom loading UIs and Discord panels.{" "}
        <a href={DISCORD_SUPPORT} target="_blank" rel="noreferrer" className="underline">
          Join support Discord
        </a>{" "}
        and open a ticket. Include your project ID.
      </p>
      <Link to="/docs" className="btn-outline mt-8">
        ← All docs
      </Link>
    </PageShell>
  );
}
