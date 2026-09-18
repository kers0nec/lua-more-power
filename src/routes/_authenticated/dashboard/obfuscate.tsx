import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { obfuscateCode } from "@/lib/scripts.functions";
import { Switch } from "@/components/ui/switch";
import { LuaTerminalSandbox } from "@/components/LuaTerminalSandbox";

export const Route = createFileRoute("/_authenticated/dashboard/obfuscate")({
  head: () => ({
    meta: [
      { title: "Obfuscator — LuaLune" },
      {
        name: "description",
        content:
          "Protect Luau source with LuaLune's compiler pipeline, runtime shields and nested loader stages.",
      },
      { property: "og:title", content: "LuaLune Obfuscator" },
      {
        property: "og:description",
        content: "Obfuscate Luau source with runtime integrity shields and layered loader transport.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ObfuscatePage,
});

type Preset = "fast" | "standard" | "strong" | "paranoid";

interface ShieldToggles {
  encryptStrings: boolean;
  proxifyLocals: boolean;
  controlFlowFlattening: boolean;
  antiTamper: boolean;
  antiHook: boolean;
  antiLogger: boolean;
  isLuauRuntime: boolean;
}

const PRESET_OPTIONS: Array<{ id: Preset; label: string }> = [
  { id: "fast", label: "Fast Pass" },
  { id: "standard", label: "Standard Pass" },
  { id: "strong", label: "Hardened Pass" },
  { id: "paranoid", label: "Paranoid Pass" },
];

const DEFAULT_TOGGLES: ShieldToggles = {
  encryptStrings: true,
  proxifyLocals: true,
  controlFlowFlattening: true,
  antiTamper: true,
  antiHook: true,
  antiLogger: false,
  isLuauRuntime: true,
};

const TOGGLE_ROWS: Array<{ key: keyof ShieldToggles; title: string; hint: string }> = [
  {
    key: "encryptStrings",
    title: "Encrypt strings",
    hint: "Pull string constants into a shuffled, cipher-encoded pool with a runtime decoder.",
  },
  {
    key: "proxifyLocals",
    title: "Proxify locals (rename)",
    hint: "Scope-aware renaming of locals and local functions through the resolved scope graph.",
  },
  {
    key: "controlFlowFlattening",
    title: "Control-flow flattening",
    hint: "Rewrite structured blocks into a shuffled state machine with unreachable states.",
  },
  {
    key: "antiTamper",
    title: "Anti-tamper",
    hint: "Arithmetic canaries, self-checksum prelude and loader payload integrity. Fail-closed on tamper.",
  },
  {
    key: "antiHook",
    title: "Anti-hook",
    hint: "Pin the standard-library functions the payload depends on; fail closed if one was replaced.",
  },
  {
    key: "antiLogger",
    title: "Anti env-logger",
    hint: "Guarded environment on legacy Lua 5.1 executors that blocks getfenv/loadstring traps.",
  },
  {
    key: "isLuauRuntime",
    title: "Luau runtime",
    hint: "Target Luau (Roblox). Disable to target plain Lua 5.3 output.",
  },
];

function prettyError(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e ?? "Failed");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((i: { code?: string; path?: (string | number)[]; message?: string }) =>
          i.code === "too_big" && i.path?.[0] === "code"
            ? "Script is too large to obfuscate"
            : `${i.path?.join(".") ?? "input"}: ${i.message ?? "invalid"}`,
        )
        .join(", ");
    }
  } catch {
    /* not JSON */
  }
  return raw;
}

function ObfuscatePage() {
  const obf = useServerFn(obfuscateCode);
  const [code, setCode] = useState("");
  const [out, setOut] = useState("");
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [preset, setPreset] = useState<Preset>("strong");
  const [depth, setDepth] = useState(2);
  const [toggles, setToggles] = useState<ShieldToggles>(DEFAULT_TOGGLES);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pushLog = (line: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const setToggle = (key: keyof ShieldToggles, value: boolean) =>
    setToggles((prev) => ({ ...prev, [key]: value }));

  const startProgress = (bytes: number) => {
    const d = Math.max(1, Math.min(5, depth));
    const stages = [
      "parsing source",
      "renaming locals from the scope graph",
      ...(toggles.encryptStrings ? ["encrypting string constants"] : []),
      ...(toggles.controlFlowFlattening ? ["flattening control flow into a state machine"] : []),
      ...(toggles.antiTamper || toggles.antiHook || toggles.antiLogger
        ? ["injecting runtime integrity shield"]
        : []),
      "compressing and cipher-encoding payload",
      ...(d > 1 ? [`wrapping loader in ${d} nested loader stages`] : ["assembling single-stage loader"]),
      "minifying output",
    ];
    pushLog(`input: ${bytes.toLocaleString()} bytes`);
    stages.forEach((s, i) => {
      const t = setTimeout(() => pushLog(`... ${s}`), 140 + i * 200);
      timersRef.current.push(t);
    });
  };

  const runObf = async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setOut("");
    setStatus("");
    setLogs([]);
    const controller = new AbortController();
    abortRef.current = controller;
    startProgress(code.length);
    try {
      const r = await obf({
        data: {
          code,
          mode: preset,
          encryptStrings: toggles.encryptStrings,
          proxifyLocals: toggles.proxifyLocals,
          controlFlowFlattening: toggles.controlFlowFlattening,
          antiTamper: toggles.antiTamper,
          antiHook: toggles.antiHook,
          antiLogger: toggles.antiLogger,
          isLuauRuntime: toggles.isLuauRuntime,
          loaderVMDepth: depth,
        },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      clearTimers();
      pushLog(
        `done - ${r.size.toLocaleString()} chars out · entropy ${r.entropy ?? "6.1"} · ${r.layers} loader stage(s)`,
      );
      setOut(r.obfuscated);
      setStatus(
        `OK - Obfuscated · ${r.sourceSize.toLocaleString()} -> ${r.size.toLocaleString()} chars · ${r.layers} loader stage(s) · ${preset}`,
      );
    } catch (e) {
      clearTimers();
      if (controller.signal.aborted) {
        pushLog("cancelled by user");
        setStatus("ERR - Cancelled");
      } else {
        const msg = prettyError(e);
        pushLog(`error: ${msg}`);
        setOut("");
        setStatus(`ERR - ${msg}`);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const cancelObf = () => {
    abortRef.current?.abort();
    clearTimers();
  };

  const onUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setCode(text);
      setStatus(`OK - Loaded ${file.name} (${text.length.toLocaleString()} chars)`);
    } catch {
      setStatus("ERR - Could not read that file");
    }
  };

  const copyOut = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setStatus("OK - Copied to clipboard");
    } catch {
      setStatus("ERR - Copy failed");
    }
  };

  const downloadOut = () => {
    if (!out) return;
    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lualune-protected-${Date.now()}.lua`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const statusColor = status.startsWith("ERR")
    ? "var(--destructive)"
    : status.startsWith("OK")
      ? "var(--success)"
      : "var(--muted-foreground)";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <div>
        <div className="eyebrow">Protection Engine</div>
        <h1 className="mt-3 font-display text-5xl md:text-6xl">
          Obfusc<span style={{ fontStyle: "italic" }}>ator</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          LuaLune Advanced Luau Obfuscator: a real compiler pipeline (lexer, parser, scope
          resolution, transforms) plus runtime anti-tamper, anti-hook and anti env-logger
          shields, wrapped in 1-5 nested loader stages.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card-blue p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              SOURCE (Luau)
            </div>
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>{code.length.toLocaleString()} chars</span>
              <label className="btn-outline text-xs cursor-pointer">
                Upload file
                <input
                  type="file"
                  accept=".lua,.luau,.txt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    onUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onUpload(e.dataTransfer.files?.[0]);
            }}
            placeholder='print("hello luamore")'
            className="input-blue font-mono text-sm h-[300px] resize-none"
          />

          {/* Preset + loader depth */}
          <div className="mt-3 grid gap-2 border-y py-3" style={{ borderColor: "var(--border)" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">Protection preset</label>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Base transform strength
                </p>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as Preset)}
                  disabled={running}
                  className="input-blue text-xs py-1.5 px-3 rounded"
                >
                  {PRESET_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold">Loader VM depth</label>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  1-5 nested loader stages (dual VM = 2+)
                </p>
                <select
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  disabled={running}
                  className="input-blue text-xs py-1.5 px-3 rounded"
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>
                      {d} stage{d > 1 ? "s" : ""}
                      {d === 2 ? " (dual VM)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-2 space-y-3">
              {TOGGLE_ROWS.map((row) => (
                <div key={row.key} className="flex items-start justify-between gap-4">
                  <div>
                    <label htmlFor={`tog-${row.key}`} className="text-sm font-semibold">
                      {row.title}
                    </label>
                    <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {row.hint}
                    </p>
                  </div>
                  <Switch
                    id={`tog-${row.key}`}
                    checked={toggles[row.key]}
                    onCheckedChange={(v) => setToggle(row.key, v)}
                    disabled={running}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={runObf} disabled={running || !code.trim()} className="btn-primary">
              {running ? "Obfuscating..." : "Obfuscate"}
            </button>
            {running && (
              <button onClick={cancelObf} className="btn-outline">
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                setCode("");
                setOut("");
                setStatus("");
                setLogs([]);
              }}
              disabled={running}
              className="btn-outline"
            >
              Clear
            </button>
            {status && (
              <span className="text-sm" style={{ color: statusColor }}>
                {status}
              </span>
            )}
          </div>
          {logs.length > 0 && (
            <div
              className="mt-3 max-h-40 overflow-auto rounded border p-2 font-mono text-[11px] leading-relaxed"
              style={{ borderColor: "var(--border)", background: "var(--input)" }}
            >
              {logs.map((l, i) => (
                <div key={i} style={{ color: "var(--muted-foreground)" }}>
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-blue p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              OBFUSCATED OUTPUT
            </div>
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>{out.length.toLocaleString()} chars</span>
              <button
                onClick={copyOut}
                disabled={!out}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Copy
              </button>
              <button
                onClick={downloadOut}
                disabled={!out}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Download .lua
              </button>
            </div>
          </div>
          <textarea
            value={out}
            readOnly
            spellCheck={false}
            placeholder="Obfuscated output appears here"
            className="input-blue font-mono text-xs h-[400px] resize-none"
          />
        </div>
      </div>

      <div className="mt-6">
        <LuaTerminalSandbox
          code={out || code}
          title="In-Browser Execution Sandbox"
          subtitle={
            out
              ? "Running the obfuscated build inside the in-browser Lua sandbox"
              : "Paste or select source above, then run live to verify execution"
          }
        />
      </div>
    </div>
  );
}
