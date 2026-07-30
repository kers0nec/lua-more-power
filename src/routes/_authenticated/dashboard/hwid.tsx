import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { banHwid, listHwidBans, unbanHwid } from "@/lib/hwid.functions";

export const Route = createFileRoute("/_authenticated/dashboard/hwid")({
  head: () => ({ meta: [{ title: "HWID Bans — LuaMore" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listHwidBans);
  const ban = useServerFn(banHwid);
  const unban = useServerFn(unbanHwid);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["hwid-bans"], queryFn: () => list() });
  const [hwid, setHwid] = useState("");
  const [reason, setReason] = useState("");
  const banMut = useMutation({
    mutationFn: () => ban({ data: { hwid, reason: reason || undefined } }),
    onSuccess: () => { setHwid(""); setReason(""); qc.invalidateQueries({ queryKey: ["hwid-bans"] }); },
  });
  const unbanMut = useMutation({
    mutationFn: (h: string) => unban({ data: { hwid: h } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hwid-bans"] }),
  });

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold">HWID Bans</h1>

      <div className="card-blue p-5 mt-6 grid gap-3 md:grid-cols-3 items-end">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>HWID</label>
          <input value={hwid} onChange={(e) => setHwid(e.target.value)} className="input-blue mt-1" placeholder="hardware id" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>REASON</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className="input-blue mt-1" />
        </div>
        <button onClick={() => hwid && banMut.mutate()} disabled={banMut.isPending} className="btn-primary">
          Ban HWID
        </button>
      </div>

      <div className="card-blue divide-y mt-6">
        {(q.data ?? []).map((b) => (
          <div key={b.id} className="p-4 flex items-center gap-3">
            <code className="font-mono text-sm px-2 py-1 rounded" style={{ background: "var(--accent-light)" }}>{b.hwid}</code>
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>{b.reason || "—"}</span>
            <div className="flex-1" />
            <button onClick={() => unbanMut.mutate(b.hwid)} className="text-xs text-[color:var(--primary)] hover:underline">Unban</button>
          </div>
        ))}
        {q.data && q.data.length === 0 && <div className="p-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No HWID bans</div>}
      </div>
    </div>
  );
}
