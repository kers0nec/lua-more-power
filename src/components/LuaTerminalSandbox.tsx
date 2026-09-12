import { useState } from "react";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { runLuaInBrowser, type ExecutionResult } from "@/lib/lua-sandbox";

interface LuaTerminalSandboxProps {
  code: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function LuaTerminalSandbox({
  code,
  title = "In-Browser Execution Sandbox",
  subtitle = "Test and execute this Luau script live with real-time console stdout",
  className = "",
}: LuaTerminalSandboxProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRun() {
    if (!code.trim() || running) return;
    setRunning(true);
    try {
      const res = await runLuaInBrowser(code, { mockRobloxGlobals: true });
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      setResult({
        success: false,
        logs: [
          {
            type: "error",
            message: msg,
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
        output: `[ERROR] ${msg}`,
        error: msg,
        executionTimeMs: 0,
      });
    } finally {
      setRunning(false);
    }
  }

  function handleClear() {
    setResult(null);
  }

  async function handleCopyLogs() {
    if (!result?.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in srgb, var(--primary) 18%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Terminal size={17} />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded"
                style={{
                  background: result.success
                    ? "rgba(14, 165, 233, 0.15)"
                    : "rgba(239, 68, 68, 0.15)",
                  color: result.success ? "#0ea5e9" : "#ef4444",
                }}
              >
                {result.success ? <ShieldCheck size={13} /> : <AlertCircle size={13} />}
                {result.success ? "Passed" : "Error"}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock size={12} /> {result.executionTimeMs}ms
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRun}
            disabled={running || !code.trim()}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            <Play size={13} className={running ? "animate-spin" : ""} />
            {running ? "Executing…" : "Run in Sandbox"}
          </button>

          {result && (
            <>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="btn-ghost flex items-center gap-1 px-2 py-1.5 text-xs"
                title="Copy Terminal Logs"
              >
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="btn-ghost flex items-center gap-1 px-2 py-1.5 text-xs"
                title="Clear Output"
              >
                <RotateCcw size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Terminal Display */}
      <div
        className="mt-3 min-h-[120px] max-h-[260px] overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed"
        style={{
          background: "#0c1204",
          borderColor: "rgba(132, 204, 22, 0.25)",
        }}
      >
        {!result && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Terminal size={22} className="mb-2 opacity-40" />
            <p className="text-xs">
              Click <strong className="text-foreground">Run in Sandbox</strong> to test script
              execution.
            </p>
            <p className="text-[11px] opacity-70 mt-0.5">
              Captures print(), warn(), math, tables, string concats, and mock Roblox player
              environment.
            </p>
          </div>
        )}

        {result && result.logs.length === 0 && (
          <div className="py-4 text-center text-xs text-muted-foreground italic">
            Script completed with return code 0 (no print statements called).
          </div>
        )}

        {result && result.logs.length > 0 && (
          <div className="space-y-1.5">
            {result.logs.map((log, i) => {
              let color = "#e2e8f0";
              let badgeBg = "rgba(148, 163, 184, 0.15)";
              let badgeColor = "#94a3b8";

              if (log.type === "warn") {
                color = "#fbbf24";
                badgeBg = "rgba(245, 158, 11, 0.2)";
                badgeColor = "#f59e0b";
              } else if (log.type === "error") {
                color = "#f87171";
                badgeBg = "rgba(239, 68, 68, 0.2)";
                badgeColor = "#ef4444";
              } else if (log.type === "info") {
                color = "#22d3ee";
                badgeBg = "rgba(34, 211, 238, 0.2)";
                badgeColor = "#0ea5e9";
              }

              return (
                <div key={i} className="flex items-start gap-2 break-all">
                  <span
                    className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: badgeBg, color: badgeColor }}
                  >
                    {log.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 select-none">
                    {log.timestamp}
                  </span>
                  <span style={{ color }}>{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
