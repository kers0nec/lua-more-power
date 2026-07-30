import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createScript, deleteScript, listScripts } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/scripts/")({
  head: () => ({ meta: [{ title: "Scripts — LuaMore" }] }),
  component: Scripts,
});

function Scripts() {
  const list = useServerFn(listScripts);
  const create = useServerFn(createScript);
  const del = useServerFn(deleteScript);
  const qc = useQueryClient();
  const scripts = useQuery({ queryKey: ["scripts"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [ffa, setFfa] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (v: { name: string; ffa: boolean }) => create({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scripts"] }); setName(""); setFfa(false); setErr(null); },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Scripts</h1>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate({ name: name.trim(), ffa }); }}
        className="card-blue p-5 mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-64">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>NEW SCRIPT NAME</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-blue mt-1" placeholder="My Awesome Script" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ffa} onChange={(e) => setFfa(e.target.checked)} /> FFA (public)
        </label>
        <button disabled={createMut.isPending} className="btn-primary">
          {createMut.isPending ? "Creating…" : "Create script"}
        </button>
        {err && <div className="text-sm text-[color:var(--destructive)] w-full">{err}</div>}
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(scripts.data ?? []).map((s) => (
          <div key={s.id} className="card-blue p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{s.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="badge-blue">{s.public_id}</span>
                  {s.ffa && <span className="badge-blue">FFA</span>}
                  {s.is_protected && <span className="badge-solid">Protected</span>}
                  {s.obfuscator && <span className="badge-blue">{s.obfuscator}</span>}
                </div>
              </div>
              <button
                onClick={() => { if (confirm(`Delete "${s.name}"?`)) delMut.mutate(s.id); }}
                className="text-xs text-[color:var(--destructive)] hover:underline"
              >
                Delete
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/dashboard/scripts/$id" params={{ id: s.id }} className="btn-outline text-sm">Open</Link>
            </div>
          </div>
        ))}
        {scripts.data && scripts.data.length === 0 && (
          <div className="col-span-full text-center p-10" style={{ color: "var(--muted-foreground)" }}>
            No scripts yet — create your first one above.
          </div>
        )}
      </div>
    </div>
  );
}
