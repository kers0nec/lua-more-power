import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getScript, updateScript } from "@/lib/scripts.functions";
import { obfuscateScript } from "@/lib/larph.functions";

export const Route = createFileRoute("/_authenticated/dashboard/scripts/$id")({
  head: () => ({ meta: [{ title: "Script — LuaMore" }] }),
  component: ScriptDetail,
});

function ScriptDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getScript);
  const upd = useServerFn(updateScript);
  const obf = useServerFn(obfuscateScript);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["script", id], queryFn: () => get({ data: { id } }) });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ffa, setFfa] = useState(false);
  const [mode, setMode] = useState<"light" | "standard" | "advanced">("standard");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (q.data?.script) {
      setCode(q.data.script.code ?? "");
      setName(q.data.script.name ?? "");
      setFfa(q.data.script.ffa ?? false);
    }
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: () => upd({ data: { id, name, code, ffa } }),
    onSuccess: () => { setStatus("✓ Saved"); qc.invalidateQueries({ queryKey: ["script", id] }); },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`),
  });
  const obfMut = useMutation({
    mutationFn: () => obf({ data: { scriptId: id, mode } }),
    onSuccess: (r) => { setStatus(`✓ Obfuscated (${mode})${r.protected ? " · protected" : ""}`); qc.invalidateQueries({ queryKey: ["script", id] }); },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`),
  });

  const script = q.data?.script;
  const releases = q.data?.releases ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/dashboard/scripts" className="text-sm" style={{ color: "var(--primary)" }}>← All scripts</Link>
      <div className="mt-2 flex items-center gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input-blue text-xl font-bold max-w-md" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ffa} onChange={(e) => setFfa(e.target.checked)} /> FFA
        </label>
        <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-outline">Save</button>
      </div>
      {script && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="badge-blue">public id: {script.public_id}</span>
          {script.is_protected && <span className="badge-solid">Protected</span>}
          {script.obfuscator && <span className="badge-blue">{script.obfuscator}</span>}
          <code className="text-xs px-2 py-1 rounded" style={{ background: "var(--accent-light)" }}>
            /api/public/loader/{script.public_id}
          </code>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-blue p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>SOURCE CODE (Luau)</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="input-blue font-mono text-sm h-[420px] resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--border)" }}>
              {(["light", "standard", "advanced"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="px-3 py-1.5 text-xs font-semibold capitalize"
                  style={{
                    background: mode === m ? "var(--gradient-primary)" : "transparent",
                    color: mode === m ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={async () => { await saveMut.mutateAsync(); obfMut.mutate(); }}
              disabled={obfMut.isPending || saveMut.isPending}
              className="btn-primary"
            >
              {obfMut.isPending ? "Obfuscating…" : "Save & Obfuscate"}
            </button>
            {status && <span className="text-sm" style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}>{status}</span>}
          </div>
        </div>
        <div className="card-blue p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>LATEST OBFUSCATED OUTPUT</div>
          <textarea
            value={script?.obfuscated_code ?? ""}
            readOnly
            spellCheck={false}
            className="input-blue font-mono text-sm h-[420px] resize-none"
            placeholder="Run obfuscation to see output…"
          />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Release history</h2>
        <div className="mt-3 card-blue divide-y">
          {releases.length === 0 && <div className="p-6 text-sm text-center" style={{ color: "var(--muted-foreground)" }}>No releases yet</div>}
          {releases.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">v{r.version} · {r.obfuscator}</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(r.created_at).toLocaleString()} · {r.note}
                </div>
              </div>
              {r.is_protected && <span className="badge-solid">Protected</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
