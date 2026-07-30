import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createPanel, deletePanel, listPanels, sendPanel } from "@/lib/panels.functions";
import { listScripts } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/panels")({
  head: () => ({ meta: [{ title: "Panels — LuaMore" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listPanels);
  const create = useServerFn(createPanel);
  const del = useServerFn(deletePanel);
  const send = useServerFn(sendPanel);
  const scripts = useServerFn(listScripts);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["panels"], queryFn: () => list() });
  const scriptsQ = useQuery({ queryKey: ["scripts"], queryFn: () => scripts() });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [whitelistChannelId, setWhitelistChannelId] = useState("");
  const [status, setStatus] = useState<string>("");

  const createMut = useMutation({
    mutationFn: () => create({ data: {
      name,
      description: description || undefined,
      scriptId: scriptId || undefined,
      webhookUrl: webhookUrl || undefined,
      channelId: channelId || undefined,
      whitelistChannelId: whitelistChannelId || undefined,
    } }),
    onSuccess: () => {
      setName(""); setDescription(""); setScriptId(""); setWebhookUrl(""); setChannelId(""); setWhitelistChannelId("");
      qc.invalidateQueries({ queryKey: ["panels"] });
    },
  });

  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["panels"] }) });
  const sendMut = useMutation({
    mutationFn: (id: string) => send({ data: { id } }),
    onSuccess: () => setStatus("✓ Panel sent to Discord"),
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`),
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold">Discord Panels</h1>
      <p className="mt-1" style={{ color: "var(--muted-foreground)" }}>Create embeds with redeem / script / role / HWID / stats buttons and post them to a Discord webhook.</p>

      <div className="card-blue p-5 mt-6 grid gap-3 md:grid-cols-2 items-end">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>NAME</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-blue mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>SCRIPT</label>
          <select value={scriptId} onChange={(e) => setScriptId(e.target.value)} className="input-blue mt-1">
            <option value="">None</option>
            {(scriptsQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>DESCRIPTION</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="input-blue mt-1" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>DISCORD WEBHOOK URL</label>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="input-blue mt-1" placeholder="https://discord.com/api/webhooks/..." />
        </div>
        <button onClick={() => name && createMut.mutate()} disabled={createMut.isPending} className="btn-primary md:col-start-2">
          Create panel
        </button>
      </div>

      {status && (
        <div className="mt-4 text-sm rounded-md px-3 py-2" style={{ background: status.startsWith("✓") ? "#e6fff4" : "#ffecec", color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}>{status}</div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(q.data ?? []).map((p) => (
          <div key={p.id} className="card-blue p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>{p.description || "—"}</p>
              </div>
              <button onClick={() => confirm("Delete panel?") && delMut.mutate(p.id)} className="text-xs text-[color:var(--destructive)] hover:underline">Delete</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="text-center rounded-md py-2 text-[color:var(--primary-foreground)]" style={{ background: "var(--gradient-primary)" }}>🔑 Redeem</div>
              <div className="text-center rounded-md py-2 text-[color:var(--primary-foreground)]" style={{ background: "var(--gradient-primary)" }}>📜 Script</div>
              <div className="text-center rounded-md py-2 text-[color:var(--primary-foreground)]" style={{ background: "var(--gradient-primary)" }}>👤 Role</div>
              <div className="text-center rounded-md py-2 text-[color:var(--primary-foreground)]" style={{ background: "var(--gradient-primary)" }}>⚙️ HWID</div>
              <div className="text-center rounded-md py-2 border-2 col-span-2" style={{ borderColor: "var(--primary)", color: "var(--primary)" }}>📊 Stats</div>
            </div>
            <button onClick={() => sendMut.mutate(p.id)} disabled={sendMut.isPending || !p.webhook_url} className="btn-primary w-full mt-4 text-sm">
              {p.webhook_url ? "Send to Discord" : "No webhook set"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
