import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CopyCode } from "@/components/CopyCode";
import { PageShell } from "@/components/PageShell";
import { LOADING_PRESETS, LOADER_USAGE } from "@/lib/loading-presets";
import { DISCORD_SUPPORT } from "@/lib/site";

export function LoadingScreenGuide() {
  const [id, setId] = useState(LOADING_PRESETS[0].id);
  const preset = LOADING_PRESETS.find((item) => item.id === id) ?? LOADING_PRESETS[0];

  return (
    <PageShell
      eyebrow="Creator docs"
      title="Loading screen for your script"
      subtitle="Wide in-game loading bars while LuaMore authenticates and delivers your script. Pick a preset, paste the Luau, and set your loader URL."
    >
      <div
        className="grid gap-3 rounded-lg border p-5 text-sm md:grid-cols-4"
        style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
      >
        {[
          ["01", "Create a script", "Add it in the dashboard and pick a preset."],
          ["02", "Copy the Luau", "Choose the matching bar below."],
          ["03", "Set the loader URL", "Paste the dashboard URL into the script."],
          ["04", "Run it", "Use it as a LocalScript while LuaMore loads."],
        ].map(([number, title, description]) => (
          <div
            key={number}
            className="border-t pt-3"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <span className="font-mono text-xs" style={{ color: "var(--primary)" }}>
              {number}
            </span>
            <h2 className="mt-2 font-display text-lg">{title}</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {description}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="eyebrow">Presets</div>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">Four wide loading bars</h2>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          Each bar scales from desktop to mobile and keeps the loading state visible without
          covering the game. Customize <code>LOADING_TITLE</code>, <code>LOADING_SUBTITLE</code>,
          position, and colors in the copied file.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOADING_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setId(item.id)}
              className="card-blue p-4 text-left"
              style={
                id === item.id
                  ? { borderColor: "var(--foreground)", boxShadow: "var(--shadow-hover)" }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg">{item.name}</span>
                <span className="badge-blue">{item.id}</span>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                {item.blurb}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <CopyCode label={`loading-${preset.id}-bar.lua`} code={preset.source} />
        </div>
      </section>

      <section className="mt-14">
        <div className="eyebrow">Loader URL</div>
        <h2 className="mt-3 font-display text-3xl">Connect the bar to your loader</h2>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          Open Dashboard → Scripts → your project and copy the loader for that script. Keyed scripts
          keep the key in the signed URL; keyless projects use the same overlay without a key
          parameter.
        </p>
        <div className="mt-5">
          <CopyCode label="usage.lua" code={LOADER_USAGE} />
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-2">
        <div className="card-blue p-6">
          <div className="eyebrow">Do not</div>
          <h2 className="mt-3 font-display text-2xl">Keep access out of game files</h2>
          <ul
            className="mt-4 list-disc space-y-2 pl-5 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            <li>Hardcode license keys in your game. Use the dashboard-generated loader.</li>
            <li>Skip the loader and request the protected script directly.</li>
            <li>
              Point <code>LOADER_URL</code> at another project; the signed marker will not match.
            </li>
          </ul>
        </div>
        <div className="card-blue p-6">
          <div className="eyebrow">Need help?</div>
          <h2 className="mt-3 font-display text-2xl">Make it feel like your game</h2>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            LuaMore loading screens are intentionally easy to edit. For custom loading UIs or
            Discord panels, contact support with your project ID.
          </p>
          <a href={DISCORD_SUPPORT} target="_blank" rel="noreferrer" className="btn-outline mt-5">
            Join support Discord
          </a>
        </div>
      </section>

      <Link to="/docs" className="btn-ghost mt-10 px-0">
        ← All docs
      </Link>
    </PageShell>
  );
}
