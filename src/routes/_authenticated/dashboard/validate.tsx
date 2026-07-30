import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { validateSyntax } from "@/lib/larph.functions";

export const Route = createFileRoute("/_authenticated/dashboard/validate")({
  head: () => ({ meta: [{ title: "Validate — LuaMore" }] }),
  component: Page,
});

function Page() {
  const val = useServerFn(validateSyntax);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!code.trim()) return;
    setBusy(true); setStatus(null);
    try {
      const r = await val({ data: { code } });
      setStatus({ ok: r.valid, msg: r.valid ? "Syntax OK" : (r.error ?? "Invalid syntax") });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Failed" });
    } finally { setBusy(false); }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold">Syntax Validator</h1>
      <p className="mt-1" style={{ color: "var(--muted-foreground)" }}>Powered by the Larph <code>/api/validate</code> endpoint.</p>

      <div className="card-blue p-4 mt-6">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="input-blue font-mono text-sm h-[400px] resize-none"
          placeholder="-- paste Luau code to validate"
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={run} disabled={busy} className="btn-primary">{busy ? "Validating…" : "Validate"}</button>
          {status && (
            <div
              className="text-sm rounded-md px-3 py-2"
              style={{
                background: status.ok ? "#e6fff4" : "#ffecec",
                color: status.ok ? "var(--success)" : "var(--destructive)",
              }}
            >
              {status.ok ? "✓" : "✗"} {status.msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
