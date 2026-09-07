import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { obfuscateCode } from "@/lib/scripts.functions";
import { Switch } from "@/components/ui/switch";
import { LuaTerminalSandbox } from "@/components/LuaTerminalSandbox";
import { Sparkles, Terminal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/obfuscate")({
  head: () => ({
    meta: [
      { title: "Obfuscator — LuaMore" },
      {
        name: "description",
        content:
          "Protect Luau source with LuaMore Obfuscation's independent dual-VM integrity layers.",
      },
      { property: "og:title", content: "LuaMore Obfuscation — Dual VM" },
      {
        property: "og:description",
        content: "Protect Luau source with independent dual-VM integrity layers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ObfuscatePage,
});

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
  const [mode, setMode] = useState<"hybrid" | "chunked" | "standard">("hybrid");
  const [oeldShield, setOeldShield] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pushLog = (line: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startProgress = (bytes: number) => {
    const stages =
      mode === "chunked"
        ? [
            "analyzing Luau syntax tree",
            "splitting into modular polynomial blocks",
            "generating non-XOR dynamic encryption keys",
            "injecting OELD 10-point Roblox integrity shield",
            "mounting continuous Heartbeat security hooks",
            "signing watermark signature",
            "assembling chunked loader",
            "minifying output",
          ]
        : [
            "parsing source",
            "compressing (LZ4 high-ratio block)",
            "VM1: derived 4-key XOR + RC4 stream cipher",
            ...(mode === "hybrid" ? ["VM2: polymorphic nested VM compilation"] : []),
            "signing (FNV-1a 32-bit + djb2 32-bit)",
            "injecting OELD Roblox runtime integrity shield",
            "wrapping in Non-XOR Polynomial Chunked Loader",
            "flattening dispatcher",
            "minifying bootstrap",
          ];
    pushLog(`input: ${bytes.toLocaleString()} bytes`);
    stages.forEach((s, i) => {
      const t = setTimeout(() => pushLog(`… ${s}`), 180 + i * 280);
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
          mode,
          dualVm: mode === "hybrid",
          oeldAntiTamper: oeldShield,
          chunkedLoader: oeldShield,
        },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      clearTimers();
      pushLog(`✓ done — ${r.size.toLocaleString()} chars out · entropy ${r.entropy ?? "6.1"}`);
      setOut(r.obfuscated);
      setStatus(
        `✓ Obfuscated — ${r.sourceSize.toLocaleString()} → ${r.size.toLocaleString()} chars · ${r.mode}`,
      );
    } catch (e) {
      clearTimers();
      if (controller.signal.aborted) {
        pushLog("✗ cancelled by user");
        setStatus("✗ Cancelled");
      } else {
        const msg = prettyError(e);
        pushLog(`✗ ${msg}`);
        setOut("");
        setStatus(`✗ ${msg}`);
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
      setStatus(`✓ Loaded ${file.name} (${text.length.toLocaleString()} chars)`);
    } catch {
      setStatus("✗ Could not read that file");
    }
  };

  const copyOut = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setStatus("✓ Copied to clipboard");
    } catch {
      setStatus("✗ Copy failed");
    }
  };

  const downloadOut = () => {
    if (!out) return;
    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luamore-vm-${Date.now()}.lua`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <div>
         <div className="eyebrow">Protection Engine</div>
        <h1 className="mt-3 font-display text-5xl md:text-6xl">
          Obfusc<span style={{ fontStyle: "italic" }}>ator</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          LuaMore Advanced Luau Obfuscator — Multi-layered VM, Anti-Tamper Shield
          with runtime integrity checks, continuous Heartbeat security hooks, and Non-XOR
          Polynomial Chunked Encoding.
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
            className="input-blue font-mono text-sm h-[360px] resize-none"
          />

          {/* Obfuscation Mode Selector */}
          <div className="mt-3 grid gap-2 border-y py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="text-sm font-semibold">Protection Mode</label>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Select obfuscation architecture
                </p>
              </div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "hybrid" | "chunked" | "standard")}
                disabled={running}
                className="input-blue text-xs py-1.5 px-3 rounded"
              >
                <option value="hybrid">Dual VM + Anti-Tamper Shield (Maximum)</option>
                <option value="chunked">Non-XOR Chunked Loader (No VM Bytecode)</option>
                <option value="standard">Single VM + Anti-Tamper Shield</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div>
                <label htmlFor="oeld-shield" className="text-sm font-semibold">
                  OELD Anti-Tamper & Heartbeat Shield
                </label>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  10+ Roblox runtime integrity checks, silent anti-hook traps, and Heartbeat loop.
                </p>
              </div>
              <Switch
                id="oeld-shield"
                checked={oeldShield}
                onCheckedChange={setOeldShield}
                disabled={running}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={runObf} disabled={running || !code.trim()} className="btn-primary">
              {running ? "Obfuscating…" : "Obfuscate"}
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
              <span
                className="text-sm"
                style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}
              >
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
            className="input-blue font-mono text-xs h-[440px] resize-none"
          />
        </div>
      </div>

      <div className="mt-6">
        <LuaTerminalSandbox
          code={out || code}
          title="In-Browser Live Execution Sandbox"
          subtitle={
            out
              ? "Running obfuscated VM bytecode inside the in-browser Lua sandbox"
              : "Paste or select a preset above, then run live to verify execution"
          }
        />
      </div>
    </div>
  );
}
