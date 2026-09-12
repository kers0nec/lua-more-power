import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Download, Monitor, Smartphone, Sparkles } from "lucide-react";
import { CopyCode } from "@/components/CopyCode";
import { PageShell } from "@/components/PageShell";
import { LOADING_PRESETS, LOADER_USAGE } from "@/lib/loading-presets";
import { DISCORD_SUPPORT } from "@/lib/site";

export function LoadingScreenGuide() {
  const [presetId, setPresetId] = useState(LOADING_PRESETS[0].id);
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState("bottom-left");
  const [progress, setProgress] = useState(65);
  const [title, setTitle] = useState("Loading script");
  const [subtitle, setSubtitle] = useState("Your loader status text");
  const preset = LOADING_PRESETS.find((item) => item.id === presetId) ?? LOADING_PRESETS[0];

  const downloadPreset = () => {
    const url = URL.createObjectURL(new Blob([preset.source], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `loading-${preset.id}-bar.lua`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell
      eyebrow="Creator Documentation & Tools"
      title="In-Game Loading Screen System"
      subtitle="Choose a loading-screen source, copy it, and connect it to a real loader from your dashboard. The browser preview below only renders the UI; it does not authenticate players or fetch scripts."
    >
      <div className="grid gap-4 rounded-xl border p-6 text-sm sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: "var(--border)", background: "var(--secondary)" }}>
        {[
          ["01", "Create a script", "Add it in the dashboard and choose a preset."],
          ["02", "Copy the Luau", "Inspect the source and copy or download it."],
          ["03", "Set the loader URL", "Use the loader generated for your real script."],
          ["04", "Run it", "Insert the source as a LocalScript in your experience."],
        ].map(([number, stepTitle, description]) => (
          <div key={number} className="border-t pt-3" style={{ borderColor: "var(--border-strong)" }}>
            <span className="font-mono text-xs font-bold" style={{ color: "var(--primary)" }}>{number}</span>
            <h2 className="mt-2 font-display text-lg font-bold">{stepTitle}</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{description}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5"><Sparkles size={12} /> Local UI preview</div>
            <h2 className="mt-1 font-display text-3xl md:text-4xl">Preview the selected loading UI</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              This preview has no network requests and reports no fake authentication, latency, or delivery state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsMobile(false)} className={!isMobile ? "btn-primary" : "btn-outline"}><Monitor size={14} /> Desktop</button>
            <button type="button" onClick={() => setIsMobile(true)} className={isMobile ? "btn-primary" : "btn-outline"}><Smartphone size={14} /> Mobile</button>
          </div>
        </div>

        <div className="relative mt-6 flex w-full items-center justify-center overflow-hidden rounded-2xl border shadow-2xl" style={{ height: isMobile ? "300px" : "380px", maxWidth: isMobile ? "420px" : "100%", margin: isMobile ? "24px auto 0" : "24px 0 0", background: "radial-gradient(circle at 50% 30%, #152238 0%, #060911 100%)", borderColor: "var(--border-strong)" }}>
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="absolute left-4 top-3 select-none font-mono text-[11px] text-white opacity-50">Local preview · network inactive</div>
          <div className={`absolute flex flex-col justify-center rounded-xl p-3 pl-12 shadow-2xl ${position === "bottom-left" ? "bottom-4 left-4" : position === "bottom-center" ? "bottom-4 left-1/2 -translate-x-1/2" : position === "bottom-right" ? "bottom-4 right-4" : "top-4 left-1/2 -translate-x-1/2"}`} style={{ width: isMobile ? "85%" : "300px", height: "58px", background: preset.id === "gold" ? "#0d0c07" : preset.id === "neon" ? "#040e14" : preset.id === "clean" ? "#0e131d" : "#080e1a", border: `1px solid ${preset.id === "gold" ? "#f6c453" : preset.id === "neon" ? "#22d3ee" : preset.id === "clean" ? "#94a3b8" : "#3b82f6"}` }}>
            <div className="absolute left-3.5 top-1/2 flex -translate-y-1/2 gap-1">{[0, 1, 2].map((item) => <span key={item} className="h-1.5 w-1.5 animate-ping rounded-full" style={{ background: preset.id === "gold" ? "#f6c453" : preset.id === "neon" ? "#22d3ee" : preset.id === "clean" ? "#e2e8f0" : "#3b82f6", animationDelay: `${item * 0.2}s` }} />)}</div>
            <div className="flex flex-col"><span className="text-xs font-medium text-white">{title}</span><span className="mt-0.5 text-[10px] text-slate-400">{subtitle}</span><div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: preset.id === "gold" ? "#f6c453" : preset.id === "neon" ? "#22d3ee" : preset.id === "clean" ? "#e2e8f0" : "#3b82f6" }} /></div></div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <label className="card-blue p-3"><span className="eyebrow">Position</span><select value={position} onChange={(event) => setPosition(event.target.value)} className="input-blue mt-1.5 text-xs"><option value="bottom-left">Bottom-left</option><option value="bottom-center">Bottom-center</option><option value="bottom-right">Bottom-right</option><option value="top">Top</option></select></label>
          <label className="card-blue p-3"><span className="eyebrow">Title text</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="input-blue mt-1.5 text-xs" /></label>
          <label className="card-blue p-3"><span className="eyebrow">Subtitle text</span><input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} className="input-blue mt-1.5 text-xs" /></label>
          <label className="card-blue p-3"><div className="flex justify-between"><span className="eyebrow">Preview progress</span><span className="font-mono text-xs text-primary">{progress}%</span></div><input type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(Number(event.target.value))} className="mt-3 w-full accent-primary" aria-label="Preview progress" /></label>
        </div>
      </section>

      <section className="mt-14"><div className="eyebrow">Presets</div><h2 className="mt-2 font-display text-3xl">Four loading bars</h2><p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>The browser preview is local only. The downloaded Luau is a template that must use the real loader URL from your workspace.</p><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{LOADING_PRESETS.map((item) => <button key={item.id} type="button" onClick={() => setPresetId(item.id)} className="card-blue p-4 text-left" style={presetId === item.id ? { borderColor: "var(--primary)", background: "var(--accent)" } : undefined}><div className="flex items-center justify-between gap-2"><span className="font-display text-lg font-bold">{item.name}</span><span className="badge-blue">{item.id}</span></div><p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>{item.blurb}</p></button>)}</div><div className="mt-6 flex items-center justify-between"><span className="badge-solid">Selected source: {preset.name}</span><button type="button" onClick={downloadPreset} className="btn-outline flex items-center gap-1.5 text-xs"><Download size={13} /> Download .lua</button></div><div className="mt-3"><CopyCode label={`loading-${preset.id}-bar.lua`} code={preset.source} /></div></section>

      <section className="mt-14"><div className="eyebrow">Loader URL</div><h2 className="mt-2 font-display text-3xl">Connect the bar to your loader</h2><p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>Copy the loader URL generated by Dashboard → Scripts. Replace the explicit placeholders in this documentation template with your account’s real values.</p><div className="mt-5"><CopyCode label="loader-usage.lua" code={LOADER_USAGE} /></div></section>

      <section className="mt-14 grid gap-6 md:grid-cols-2"><div className="card-blue space-y-4 p-6 md:p-8"><div className="eyebrow">Security guidelines</div><h2 className="font-display text-2xl">Keep access out of public files</h2><ul className="list-disc space-y-2.5 pl-5 text-sm" style={{ color: "var(--muted-foreground)" }}><li>Never hardcode secret license keys into public game files.</li><li>Use the real dashboard loader for protected delivery.</li><li>Do not point the loader URL to another project.</li></ul></div><div className="card-blue flex flex-col justify-between space-y-4 p-6 md:p-8"><div><div className="eyebrow">Support & Custom UI</div><h2 className="font-display text-2xl">Tailored to your experience</h2><p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>Customize the local loading UI and ask the support community about integrating it with your real loader.</p></div><a href={DISCORD_SUPPORT} target="_blank" rel="noreferrer" className="btn-outline self-start">Join Discord Support</a></div></section>

      <div className="mt-10 flex items-center gap-4"><Link to="/features" className="btn-primary">Explore All Features</Link><Link to="/keys" className="btn-outline"><Check size={14} /> Key system docs</Link></div>
    </PageShell>
  );
}
