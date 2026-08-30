import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bot, Check, ChevronDown, RefreshCw, Send, Settings2, Trash2 } from "lucide-react";
import { createPanel, deletePanel, listPanels, sendPanel, syncDiscordCommands, updatePanel } from "@/lib/panels.functions";
import { listScripts } from "@/lib/scripts.functions";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { DashboardHeader } from "@/components/DashboardHeader";

export const Route = createFileRoute("/_authenticated/dashboard/panels")({
  head: () => ({ meta: [{ title: "Discord Panels — LuaMore" }, { name: "description", content: "Create and deploy LuaMore access panels to Discord channels." }, { property: "og:title", content: "Discord Panels — LuaMore" }, { property: "og:description", content: "Create and deploy LuaMore access panels to Discord channels." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PanelsPage,
});

type Panel = {
  id: string; name: string; description: string | null; script_id: string | null;
  channel_id: string | null; whitelist_channel_id: string | null;
  discord_role_id: string | null; admin_role_ids: string[];
};

type ScriptOption = { id: string; name: string };

function PanelsPage() {
  const list = useServerFn(listPanels);
  const create = useServerFn(createPanel);
  const remove = useServerFn(deletePanel);
  const send = useServerFn(sendPanel);
  const update = useServerFn(updatePanel);
  const sync = useServerFn(syncDiscordCommands);
  const scriptsFn = useServerFn(listScripts);
  const statsFn = useServerFn(getDashboardStats);
  const queryClient = useQueryClient();
  const panels = useQuery({ queryKey: ["panels"], queryFn: () => list() }) as { data?: Panel[]; isLoading: boolean; error: unknown };
  const scripts = useQuery({ queryKey: ["scripts"], queryFn: () => scriptsFn() }) as { data?: ScriptOption[] };
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => statsFn() });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [whitelistChannelId, setWhitelistChannelId] = useState("");
  const [status, setStatus] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["panels"] });
  const createMutation = useMutation({
    mutationFn: () => create({ data: { name, description: description || undefined, scriptId: scriptId || undefined, channelId: channelId || undefined, whitelistChannelId: whitelistChannelId || undefined } }),
    onSuccess: () => { setName(""); setDescription(""); setScriptId(""); setChannelId(""); setWhitelistChannelId(""); setShowCreate(false); setStatus("✓ Panel created"); refresh(); },
    onError: (error) => setStatus(`✗ ${error instanceof Error ? error.message : "Could not create panel"}`),
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => remove({ data: { id } }), onSuccess: () => { setStatus("✓ Panel deleted"); refresh(); }, onError: (error) => setStatus(`✗ ${error instanceof Error ? error.message : "Could not delete panel"}`) });
  const syncMutation = useMutation({ mutationFn: () => sync(), onSuccess: (result) => setStatus(result.ok ? `✓ Synced ${result.count ?? 0} Discord commands` : `✗ ${result.message}`), onError: (error) => setStatus(`✗ ${error instanceof Error ? error.message : "Could not sync commands"}`) });

  return <div className="app-page">
    <DashboardHeader eyebrow="Discord integration" title="Control panels" description="Configure your buyer experience and deploy it directly to a server channel." action={<button className="btn-primary" onClick={() => setShowCreate((value) => !value)}><Bot size={15} /> New panel</button>} />

    <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
      <Metric label="Configured panels" value={String(panels.data?.length ?? 0)} />
      <Metric label="Ready to send" value={String((panels.data ?? []).filter((panel) => panel.channel_id && panel.script_id).length)} />
      <Metric label="Delivery" value="Discord bot" />
    </div>

    {stats.data?.isOwner && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-3 text-sm"><span className="text-muted-foreground">Slash-command registration is available to the owner account.</span><button className="btn-outline text-xs" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}><RefreshCw size={14} className={syncMutation.isPending ? "animate-spin" : ""} /> Sync commands</button></div>}

    {showCreate && <form className="mt-5 grid gap-4 border border-border bg-card p-5 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
      <Field label="Panel name"><input className="input-blue" value={name} onChange={(event) => setName(event.target.value)} placeholder="Premium access" required /></Field>
      <Field label="Attached script"><select className="input-blue" value={scriptId} onChange={(event) => setScriptId(event.target.value)} required><option value="">Choose a script</option>{(scripts.data ?? []).map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}</select></Field>
      <div className="md:col-span-2"><Field label="Description"><textarea className="input-blue min-h-24 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What buyers see in Discord" /></Field></div>
      <Field label="Discord channel ID"><input className="input-blue font-mono" value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder="1234567890123456789" required inputMode="numeric" /></Field>
      <Field label="Whitelist log channel"><input className="input-blue font-mono" value={whitelistChannelId} onChange={(event) => setWhitelistChannelId(event.target.value)} placeholder="Optional" inputMode="numeric" /></Field>
      <div className="md:col-span-2 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn-primary" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create panel"}</button></div>
    </form>}

    {status && <div className={`mt-5 border px-4 py-3 text-sm ${status.startsWith("✓") ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>{status}</div>}

    <div className="mt-8 border-y border-border">
      <div className="grid grid-cols-[1fr_auto] items-center border-b border-border py-3"><span className="eyebrow">Your panels</span><span className="font-mono text-xs text-muted-foreground">{panels.data?.length ?? 0} total</span></div>
      {panels.isLoading && <div className="py-14 text-center text-sm text-muted-foreground">Loading panels…</div>}
      {!panels.isLoading && (panels.data ?? []).length === 0 && <div className="py-14 text-center"><Bot className="mx-auto text-muted-foreground" size={24} /><p className="mt-3 text-sm text-muted-foreground">No panels yet. Create one to start delivering access in Discord.</p></div>}
      <div className="divide-y divide-border">{(panels.data ?? []).map((panel) => <PanelRow key={panel.id} panel={panel} scripts={scripts.data ?? []} updatePanelFn={update} sendPanelFn={send} onRefresh={refresh} onDelete={() => confirm(`Delete ${panel.name}?`) && deleteMutation.mutate(panel.id)} setStatus={setStatus} />)}</div>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-card p-5"><div className="font-display text-2xl">{value}</div><div className="eyebrow mt-2">{label}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="eyebrow mb-2 block">{label}</span>{children}</label>;
}

function PanelRow({ panel, scripts, updatePanelFn, sendPanelFn, onRefresh, onDelete, setStatus }: { panel: Panel; scripts: ScriptOption[]; updatePanelFn: ReturnType<typeof useServerFn<typeof updatePanel>>; sendPanelFn: ReturnType<typeof useServerFn<typeof sendPanel>>; onRefresh: () => void; onDelete: () => void; setStatus: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: panel.name, description: panel.description ?? "", scriptId: panel.script_id ?? "", channelId: panel.channel_id ?? "", whitelistChannelId: panel.whitelist_channel_id ?? "", roleId: panel.discord_role_id ?? "", adminRoleIds: (panel.admin_role_ids ?? []).join(", ") });
  useEffect(() => setForm({ name: panel.name, description: panel.description ?? "", scriptId: panel.script_id ?? "", channelId: panel.channel_id ?? "", whitelistChannelId: panel.whitelist_channel_id ?? "", roleId: panel.discord_role_id ?? "", adminRoleIds: (panel.admin_role_ids ?? []).join(", ") }), [panel]);
  const saveMutation = useMutation({ mutationFn: () => updatePanelFn({ data: { id: panel.id, name: form.name, description: form.description || null, scriptId: form.scriptId || null, channelId: form.channelId || null, whitelistChannelId: form.whitelistChannelId || null, roleId: form.roleId || null, adminRoleIds: form.adminRoleIds.split(/[\s,]+/).filter(Boolean) } }), onSuccess: () => { setStatus("✓ Panel settings saved"); onRefresh(); setOpen(false); }, onError: (error) => setStatus(`✗ ${error instanceof Error ? error.message : "Could not save panel"}`) });
  const sendMutation = useMutation({ mutationFn: () => sendPanelFn({ data: { id: panel.id } }), onSuccess: (result) => setStatus(`✓ Panel sent${result.channelName ? ` to #${result.channelName}` : ""}${result.messageId ? ` · message ${result.messageId}` : ""}`), onError: (error) => setStatus(`✗ ${error instanceof Error ? error.message : "Could not send panel"}`) });
  const ready = Boolean(panel.channel_id && panel.script_id);
  return <article className="py-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg">{panel.name}</h2><span className={ready ? "badge-blue" : "eyebrow"}>{ready ? "Ready" : "Needs setup"}</span></div><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{panel.description || "No description"}</p><div className="mt-2 flex flex-wrap gap-3 font-mono text-xs text-muted-foreground"><span>{panel.channel_id ? `channel ${panel.channel_id}` : "no channel"}</span><span>{panel.script_id ? "script attached" : "no script"}</span></div></div>
      <div className="flex shrink-0 flex-wrap gap-2"><button className="btn-outline text-xs" onClick={() => setOpen((value) => !value)}><Settings2 size={14} /> Edit <ChevronDown size={13} className={open ? "rotate-180" : ""} /></button><button className="btn-primary text-xs" onClick={() => sendMutation.mutate()} disabled={!ready || sendMutation.isPending}><Send size={14} /> {sendMutation.isPending ? "Sending…" : "Send to channel"}</button><button className="btn-ghost px-2 text-destructive" onClick={onDelete} aria-label={`Delete ${panel.name}`} title="Delete panel"><Trash2 size={15} /></button></div>
    </div>
    {open && <div className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
      <Field label="Panel name"><input className="input-blue" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Attached script"><select className="input-blue" value={form.scriptId} onChange={(event) => setForm({ ...form, scriptId: event.target.value })}><option value="">Choose a script</option>{scripts.map((script) => <option key={script.id} value={script.id}>{script.name}</option>)}</select></Field>
      <div className="md:col-span-2"><Field label="Description"><textarea className="input-blue min-h-20 resize-y" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
      <Field label="Discord channel ID"><input className="input-blue font-mono" value={form.channelId} onChange={(event) => setForm({ ...form, channelId: event.target.value })} inputMode="numeric" /></Field>
      <Field label="Whitelist log channel"><input className="input-blue font-mono" value={form.whitelistChannelId} onChange={(event) => setForm({ ...form, whitelistChannelId: event.target.value })} inputMode="numeric" /></Field>
      <Field label="Buyer role ID"><input className="input-blue font-mono" value={form.roleId} onChange={(event) => setForm({ ...form, roleId: event.target.value })} inputMode="numeric" /></Field>
      <Field label="Admin role IDs"><input className="input-blue font-mono" value={form.adminRoleIds} onChange={(event) => setForm({ ...form, adminRoleIds: event.target.value })} placeholder="Comma separated" /></Field>
      <div className="md:col-span-2 flex justify-end"><button className="btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}><Check size={14} /> {saveMutation.isPending ? "Saving…" : "Save panel"}</button></div>
    </div>}
  </article>;
}
