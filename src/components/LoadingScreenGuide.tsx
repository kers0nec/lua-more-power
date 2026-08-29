import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles,
  Download,
  Check,
  Play,
  RotateCcw,
  Monitor,
  Smartphone,
  Eye,
  Layers,
} from "lucide-react";
import { CopyCode } from "@/components/CopyCode";
import { PageShell } from "@/components/PageShell";
import { LOADING_PRESETS, LOADER_USAGE } from "@/lib/loading-presets";
import { DISCORD_SUPPORT } from "@/lib/site";

export function LoadingScreenGuide() {
  const [id, setId] = useState(LOADING_PRESETS[0].id);
  const [pos, setPos] = useState<"bottom-left" | "bottom-center" | "bottom-right" | "top">(
    "bottom-left",
  );
  const [progress, setProgress] = useState(65);
  const [isMobileView, setIsMobileView] = useState(false);
  const [customTitle, setCustomTitle] = useState("Loading script");
  const [customSub, setCustomSub] = useState("Please be patient");
  const [animating, setAnimating] = useState(false);

  const preset = LOADING_PRESETS.find((item) => item.id === id) ?? LOADING_PRESETS[0];

  function runSimulateProgress() {
    setAnimating(true);
    setProgress(15);
    setCustomSub("Contacting LuaMore dispatch...");
    setTimeout(() => {
      setProgress(50);
      setCustomSub("Checking HWID device bind...");
    }, 600);
    setTimeout(() => {
      setProgress(85);
      setCustomSub("Decrypting VM bytecode...");
    }, 1200);
    setTimeout(() => {
      setProgress(100);
      setCustomSub("Script Authenticated & Delivered!");
      setTimeout(() => {
        setAnimating(false);
        setCustomSub("Please be patient");
        setProgress(65);
      }, 1500);
    }, 1800);
  }

  function downloadPresetLua() {
    const blob = new Blob([preset.source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loading-${preset.id}-bar.lua`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell
      eyebrow="Creator Documentation & Tools"
      title="In-Game Loading Screen System"
      subtitle="Wide in-game loading bars that appear seamlessly while LuaMore authenticates and delivers your script. Pick a preset, paste the Luau, and set your loader URL."
    >
      {/* Workflow Steps */}
      <div
        className="grid gap-4 rounded-xl border p-6 text-sm sm:grid-cols-2 lg:grid-cols-4"
        style={{ borderColor: "var(--border)", background: "var(--secondary)" }}
      >
        {[
          ["01", "Create a Script", "Add it in the dashboard and pick a preset (or keyless)."],
          ["02", "Copy the Luau", "Choose from the 4 matching presets below."],
          ["03", "Set the Loader URL", "Paste the signed dashboard URL into LOADER_URL."],
          ["04", "Run & Execute", "Insert as a LocalScript while LuaMore loads in-game."],
        ].map(([number, title, description]) => (
          <div
            key={number}
            className="border-t pt-3"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <span className="font-mono text-xs font-bold" style={{ color: "var(--primary)" }}>
              {number}
            </span>
            <h2 className="mt-2 font-display text-lg font-bold">{title}</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {description}
            </p>
          </div>
        ))}
      </div>

      {/* Live Visualizer Stage */}
      <section className="mt-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <Sparkles size={12} /> Interactive Simulator
            </div>
            <h2 className="mt-1 font-display text-3xl md:text-4xl">
              Live In-Game Viewport Preview
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              Test how the loading bar renders across different positions and device viewports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileView(false)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                !isMobileView ? "btn-primary" : "btn-outline"
              }`}
            >
              <Monitor size={14} /> Desktop
            </button>
            <button
              type="button"
              onClick={() => setIsMobileView(true)}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                isMobileView ? "btn-primary" : "btn-outline"
              }`}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div
          className="mt-6 relative w-full rounded-2xl border overflow-hidden flex items-center justify-center transition-all shadow-2xl"
          style={{
            height: isMobileView ? "300px" : "380px",
            maxWidth: isMobileView ? "420px" : "100%",
            margin: isMobileView ? "24px auto 0" : "24px 0 0",
            background: "radial-gradient(circle at 50% 30%, #152238 0%, #060911 100%)",
            borderColor: "var(--border-strong)",
          }}
        >
          {/* Grid lines simulating Roblox viewport */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="absolute top-3 left-4 flex gap-3 text-[11px] font-mono opacity-50 text-white select-none">
            <span>CoreGui: Validated</span>
            <span>·</span>
            <span>FPS: 60</span>
            <span>·</span>
            <span>Ping: 28ms</span>
          </div>

          {/* Rendered Live Loading Bar */}
          <div
            className={`absolute flex flex-col justify-center rounded-xl p-3 pl-12 shadow-2xl transition-all duration-300 ${
              pos === "bottom-left"
                ? "bottom-4 left-4"
                : pos === "bottom-center"
                  ? "bottom-4 left-1/2 -translate-x-1/2"
                  : pos === "bottom-right"
                    ? "bottom-4 right-4"
                    : "top-4 left-1/2 -translate-x-1/2"
            }`}
            style={{
              width: isMobileView ? "85%" : "300px",
              height: "58px",
              background:
                id === "gold"
                  ? "#0d0c07"
                  : id === "neon"
                    ? "#040e14"
                    : id === "clean"
                      ? "#0e131d"
                      : "#080e1a",
              border: `1px solid ${
                id === "gold"
                  ? "#f6c453"
                  : id === "neon"
                    ? "#22d3ee"
                    : id === "clean"
                      ? "#94a3b8"
                      : "#3b82f6"
              }`,
              boxShadow:
                id === "gold"
                  ? "0 0 25px rgba(246,196,83,0.3)"
                  : id === "neon"
                    ? "0 0 25px rgba(34,211,238,0.3)"
                    : "0 10px 30px rgba(0,0,0,0.7)",
            }}
          >
            {/* Dot Spinner */}
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full animate-ping"
                  style={{
                    background:
                      id === "gold"
                        ? "#f6c453"
                        : id === "neon"
                          ? "#22d3ee"
                          : id === "clean"
                            ? "#e2e8f0"
                            : "#60a5fa",
                    animationDuration: "1.2s",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>

            <div className="flex flex-col">
              <span
                className="font-medium text-xs tracking-tight"
                style={{
                  color: id === "gold" ? "#fef3c7" : id === "neon" ? "#cffafe" : "#ffffff",
                }}
              >
                {customTitle}
              </span>
              <span className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {customSub}
              </span>
              <div
                className="h-1 w-full rounded-full mt-1.5 overflow-hidden"
                style={{
                  background: id === "gold" ? "#231c0a" : id === "neon" ? "#082f38" : "#1e293b",
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background:
                      id === "gold"
                        ? "#f6c453"
                        : id === "neon"
                          ? "#22d3ee"
                          : id === "clean"
                            ? "#e2e8f0"
                            : "#3b82f6",
                    boxShadow:
                      id === "gold"
                        ? "0 0 8px #f6c453"
                        : id === "neon"
                          ? "0 0 8px #22d3ee"
                          : "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Viewport Control Strip */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="card-blue p-3">
            <span className="eyebrow">Position</span>
            <select
              value={pos}
              onChange={(e) => setPos(e.target.value as typeof pos)}
              className="input-blue mt-1.5 text-xs"
            >
              <option value="bottom-left">Bottom-Left (Recommended)</option>
              <option value="bottom-center">Bottom-Center</option>
              <option value="bottom-right">Bottom-Right</option>
              <option value="top">Top Bar</option>
            </select>
          </div>

          <div className="card-blue p-3">
            <span className="eyebrow">Title Text</span>
            <input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="input-blue mt-1.5 text-xs"
              placeholder="Title"
            />
          </div>

          <div className="card-blue p-3">
            <span className="eyebrow">Subtitle Text</span>
            <input
              value={customSub}
              onChange={(e) => setCustomSub(e.target.value)}
              className="input-blue mt-1.5 text-xs"
              placeholder="Subtitle"
            />
          </div>

          <div className="card-blue p-3 flex flex-col justify-between">
            <span className="eyebrow">Test Cycle</span>
            <button
              type="button"
              onClick={runSimulateProgress}
              disabled={animating}
              className="btn-primary text-xs py-2 flex items-center justify-center gap-1.5 w-full mt-1"
            >
              {animating ? <RotateCcw size={13} className="animate-spin" /> : <Play size={13} />}
              {animating ? "Simulating..." : "Test 100% Load"}
            </button>
          </div>
        </div>
      </section>

      {/* Preset Pickers */}
      <section className="mt-14">
        <div className="eyebrow">Presets</div>
        <h2 className="mt-2 font-display text-3xl">Four Wide Loading Bars</h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          Each bar is optimized for minimal memory footprint and zero execution latency. Pick your
          preset below to inspect the source code and copy or download.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOADING_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setId(item.id)}
              className="card-blue p-4 text-left transition-all"
              style={
                id === item.id
                  ? {
                      borderColor: "var(--primary)",
                      boxShadow: "var(--shadow-hover)",
                      background: "var(--accent)",
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-bold">{item.name}</span>
                <span className="badge-blue">{item.id}</span>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                {item.blurb}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge-solid">Active Source: {preset.name}</span>
          </div>
          <button
            type="button"
            onClick={downloadPresetLua}
            className="btn-outline text-xs flex items-center gap-1.5"
          >
            <Download size={13} /> Download .lua File
          </button>
        </div>

        <div className="mt-3">
          <CopyCode label={`loading-${preset.id}-bar.lua`} code={preset.source} />
        </div>
      </section>

      {/* Loader URL Section */}
      <section className="mt-14">
        <div className="eyebrow">Loader URL</div>
        <h2 className="mt-2 font-display text-3xl">Connect the Bar to your Loader</h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          Open Dashboard → Scripts → your project and copy the loader URL for that script. Keyed
          scripts keep the key in the signed URL; keyless projects use the same overlay without a
          key parameter.
        </p>
        <div className="mt-5">
          <CopyCode label="loader-usage.lua" code={LOADER_USAGE} />
        </div>
      </section>

      {/* Best Practices & Guidelines */}
      <section className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="card-blue p-6 md:p-8 space-y-4">
          <div className="eyebrow">Security Guidelines</div>
          <h2 className="font-display text-2xl">Keep Access Out of Game Files</h2>
          <ul
            className="list-disc space-y-2.5 pl-5 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            <li>
              Never hardcode secret license keys into public game files. Use the dashboard loader.
            </li>
            <li>Never bypass the loader and attempt to fetch the raw script directly.</li>
            <li>
              Do not point <code>LOADER_URL</code> to another project; the cryptographically signed
              marker will reject the execution.
            </li>
          </ul>
        </div>

        <div className="card-blue p-6 md:p-8 space-y-4 flex flex-col justify-between">
          <div>
            <div className="eyebrow">Support & Custom UI</div>
            <h2 className="font-display text-2xl">Tailored to Your Experience</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
              LuaMore loading screens are lightweight and easy to modify. Need custom themes,
              animations, or Discord bots? Join our support community.
            </p>
          </div>
          <a
            href={DISCORD_SUPPORT}
            target="_blank"
            rel="noreferrer"
            className="btn-outline self-start flex items-center gap-2"
          >
            <Sparkles size={14} /> Join Discord Support
          </a>
        </div>
      </section>

      <div className="mt-10 flex items-center gap-4">
        <Link to="/features" className="btn-primary">
          Explore All Features
        </Link>
        <Link to="/keys" className="btn-outline">
          Key System Simulator
        </Link>
      </div>
    </PageShell>
  );
}
