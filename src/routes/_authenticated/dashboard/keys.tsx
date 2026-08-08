import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteKey, generateKey, listKeys } from "@/lib/keys.functions";
import { listScripts } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/keys")({
  head: () => ({ meta: [{ title: "License Keys — Lua Security" }] }),
  component: Keys,
});

function Keys() {
  const list = useServerFn(listKeys);
  const gen = useServerFn(generateKey);
  const del = useServerFn(deleteKey);
  const scripts = useServerFn(listScripts);
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: ["keys"], queryFn: () => list() });
  const scriptsQ = useQuery({ queryKey: ["scripts"], queryFn: () => scripts() });

  const [scriptId, setScriptId] = useState<string>("");
  const [hours, setHours] = useState<number>(24);
  const [discordId, setDiscordId] = useState("");
  const [note, setNote] = useState("");

  const genMut = useMutation({
    mutationFn: () => gen({ data: { scriptId: scriptId || undefined, hours, discordId: discordId || undefined, note: note || undefined } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keys"] }),
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold">License Keys</h1>

      <div className="card-blue p-5 mt-6 grid gap-3 md:grid-cols-5 items-end">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>SCRIPT</label>
          <select value={scriptId} onChange={(e) => setScriptId(e.target.value)} className="input-blue mt-1">
            <option value="">Any</option>
            {(scriptsQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>HOURS</label>
          <input type="number" min={0} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="input-blue mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>DISCORD ID</label>
          <input value={discordId} onChange={(e) => setDiscordId(e.target.value)} className="input-blue mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>NOTE</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="input-blue mt-1" />
        </div>
        <button onClick={() => genMut.mutate()} disabled={genMut.isPending} className="btn-primary">
          {genMut.isPending ? "…" : "Generate Key"}
        </button>
      </div>

      <div className="mt-6 card-blue divide-y">
        {(keys.data ?? []).map((k) => (
          <div key={k.id} className="p-4 flex flex-wrap items-center gap-3">
            <code
              className="font-mono text-sm px-2 py-1 rounded cursor-pointer"
              style={{ background: "var(--accent-light)", color: "var(--primary-dark)" }}
              onClick={() => navigator.clipboard.writeText(k.key)}
              title="Click to copy"
            >
              {k.key}
            </code>
            {k.revoked && <span className="badge-blue" style={{ background: "#ffe0e0", color: "var(--destructive)" }}>revoked</span>}
            {k.hwid && <span className="badge-blue">🖥 {k.hwid.slice(0, 8)}…</span>}
            {k.discord_id && <span className="badge-blue">@ {k.discord_id}</span>}
            {k.expires_at && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>expires {new Date(k.expires_at).toLocaleString()}</span>}
            <div className="flex-1" />
            <button onClick={() => delMut.mutate(k.id)} className="text-xs text-[color:var(--destructive)] hover:underline">Delete</button>
          </div>
        ))}
        {keys.data && keys.data.length === 0 && (
          <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No keys yet</div>
        )}
      </div>
    </div>
  );
}
