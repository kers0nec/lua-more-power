import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { obfuscatePreview } from "@/lib/larph.functions";

export const Route = createFileRoute("/_authenticated/dashboard/obfuscate")({
  head: () => ({ meta: [{ title: "Obfuscate — LuaMore" }] }),
  component: Page,
});

function Page() {
  const obf = useServerFn(obfuscatePreview);
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"light" | "standard" | "advanced">("standard");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!code.trim()) return;
    setBusy(true); setStatus("");
    try {
      const r = await obf({ data: { code, mode } });
      setOutput(r.obfuscatedCode);
      setStatus(`✓ ${mode}${r.protected ? " · protected" : ""}${r.hash ? ` · ${r.hash.slice(0,10)}…` : ""}`);
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold">Standalone Obfuscation</h1>
      <p className="mt-1" style={{ color: "var(--muted-foreground)" }}>Larph-powered, no script record created.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--border)" }}>
          {(["light", "standard", "advanced"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 text-sm font-medium capitalize"
              style={{
                background: mode === m ? "var(--gradient-primary)" : "transparent",
                color: mode === m ? "var(--primary-foreground)" : "var(--muted-foreground)",
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <button onClick={run} disabled={busy} className="btn-primary">{busy ? "Obfuscating…" : "Obfuscate"}</button>
        {output && (
          <button
            onClick={() => {
              const blob = new Blob([output], { type: "text/plain" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `obfuscated_${mode}.lua`;
              a.click();
            }}
            className="btn-outline"
          >
            Download
          </button>
        )}
        {status && <span className="text-sm" style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}>{status}</span>}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-blue p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>INPUT</div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} className="input-blue font-mono text-sm h-[500px] resize-none" placeholder="-- paste Luau code" />
        </div>
        <div className="card-blue p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>OUTPUT</div>
          <textarea value={output} readOnly spellCheck={false} className="input-blue font-mono text-sm h-[500px] resize-none" />
        </div>
      </div>
    </div>
  );
}
