import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getScript, updateScript } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/scripts/$id")({
  head: () => ({ meta: [{ title: "Script — LuaMore" }] }),
  component: ScriptDetail,
});

function ScriptDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getScript);
  const upd = useServerFn(updateScript);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["script", id], queryFn: () => get({ data: { id } }) });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ffa, setFfa] = useState(false);
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
    onError: (e) => setStatus(`✗ ${prettyError(e)}`),
  });

  const onUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setCode(text);
      setStatus(`✓ Loaded ${file.name} (${text.length.toLocaleString()} chars) — press Save`);
    } catch {
      setStatus("✗ Could not read that file");
    }
  };

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
          <code className="text-xs px-2 py-1 rounded break-all" style={{ background: "var(--accent-light)" }}>
            {`loadstring(game:HttpGet("https://luamore.app/api/public/r/${script.public_id}"))()`}
          </code>

        </div>
      )}

      <div className="mt-6">
        <div className="card-blue p-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>SOURCE CODE (Luau)</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="input-blue font-mono text-sm h-[420px] resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="btn-primary">
              {saveMut.isPending ? "Saving…" : "Save changes"}
            </button>
            {status && <span className="text-sm" style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}>{status}</span>}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Release history</h2>
        <div className="mt-3 card-blue divide-y">
          {releases.length === 0 && <div className="p-6 text-sm text-center" style={{ color: "var(--muted-foreground)" }}>No releases yet</div>}
          {releases.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">v{r.version}</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(r.created_at).toLocaleString()} · {r.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
