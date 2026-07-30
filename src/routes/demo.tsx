import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { obfuscateDemo, validateSyntax } from "@/lib/larph.functions";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo — LuaMore Obfuscation Playground" },
      { name: "description", content: "Try LuaMore's Larph-powered Luau obfuscation live in your browser." },
      { property: "og:title", content: "LuaMore Demo" },
      { property: "og:description", content: "Live Larph obfuscation playground." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Demo,
});

function Demo() {
  const [code, setCode] = useState(`print("Hello from LuaMore!")\nlocal x = 1\nfor i = 1, 10 do\n  x = x + i\nend\nprint(x)`);
  const [mode, setMode] = useState<"light" | "standard" | "advanced">("standard");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const obf = useServerFn(obfuscateDemo);
  const val = useServerFn(validateSyntax);

  async function run() {
    setBusy(true); setStatus(""); setOutput("");
    try {
      const r = await obf({ data: { code, mode } });
      setOutput(r.obfuscatedCode);
      setStatus(`✓ Success · ${mode}${r.protected ? " (protected)" : ""}${r.hash ? ` · hash ${r.hash.slice(0, 10)}…` : ""}`);
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setBusy(false); }
  }
  async function validate() {
    setBusy(true); setStatus("");
    try {
      const r = await val({ data: { code } });
      setStatus(r.valid ? "✓ Syntax OK" : `✗ ${r.error ?? "Invalid syntax"}`);
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        <h1 className="text-3xl font-bold">Larph Obfuscation Demo</h1>
        <p className="mt-2" style={{ color: "var(--muted-foreground)" }}>
          Paste Luau code and try each obfuscation tier. Powered by the Larph engine.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {(["light", "standard", "advanced"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-2 text-sm font-medium capitalize"
                style={{
                  background: mode === m ? "var(--gradient-primary)" : "#ffffff",
                  color: mode === m ? "#ffffff" : "var(--foreground)",
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <button onClick={run} disabled={busy} className="btn-primary">
            {busy ? "Obfuscating…" : "Obfuscate"}
          </button>
          <button onClick={validate} disabled={busy} className="btn-outline">Validate syntax</button>
          {status && <span className="text-sm" style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}>{status}</span>}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="card-blue p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>INPUT (Luau)</div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="input-blue font-mono text-sm h-96 resize-none"
            />
          </div>
          <div className="card-blue p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>OUTPUT</div>
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              placeholder="Obfuscated code will appear here…"
              className="input-blue font-mono text-sm h-96 resize-none"
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
