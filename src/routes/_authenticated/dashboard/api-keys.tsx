import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createApiKey, deleteApiKey, listApiKeys } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — LuaMore" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const del = useServerFn(deleteApiKey);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const createMut = useMutation({
    mutationFn: () => create({ data: { label } }),
    onSuccess: (r) => { setNewKey(r.key); setLabel(""); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
  });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }) });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold">API Keys</h1>
      <p className="mt-1" style={{ color: "var(--muted-foreground)" }}>Used by the Discord <code>/login</code> command and CLI/loader integrations.</p>

      <div className="card-blue p-5 mt-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-64">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>LABEL</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="input-blue mt-1" placeholder="e.g. discord-bot" />
        </div>
        <button onClick={() => label && createMut.mutate()} disabled={createMut.isPending} className="btn-primary">Generate</button>
      </div>

      {newKey && (
        <div className="mt-4 card-blue p-4" style={{ background: "#e6fff4" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--success)" }}>Copy this key now — it won't be shown again:</div>
          <code className="block mt-2 font-mono text-sm p-2 rounded bg-white">{newKey}</code>
        </div>
      )}

      <div className="mt-6 card-blue divide-y">
        {(q.data ?? []).map((k) => (
          <div key={k.id} className="p-4 flex items-center gap-3">
            <div>
              <div className="font-semibold">{k.label}</div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{k.prefix}•••••• · created {new Date(k.created_at).toLocaleString()}</div>
            </div>
            <div className="flex-1" />
            <button onClick={() => delMut.mutate(k.id)} className="text-xs text-[color:var(--destructive)] hover:underline">Revoke</button>
          </div>
        ))}
        {q.data && q.data.length === 0 && <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No API keys yet</div>}
      </div>
    </div>
  );
}
