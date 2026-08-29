import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  createPanel,
  deletePanel,
  listPanels,
  sendPanel,
  updatePanel,
} from "@/lib/panels.functions";
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
  const upd = useServerFn(updatePanel);
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
    mutationFn: () =>
      create({
        data: {
          name,
          description: description || undefined,
          scriptId: scriptId || undefined,
          webhookUrl: webhookUrl || undefined,
          channelId: channelId || undefined,
          whitelistChannelId: whitelistChannelId || undefined,
        },
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setScriptId("");
      setWebhookUrl("");
      setChannelId("");
      setWhitelistChannelId("");
      qc.invalidateQueries({ queryKey: ["panels"] });
    },
  });

  const updMut = useMutation({
    mutationFn: (v: { id: string; roleId: string; adminRoleIds: string }) =>
      upd({
        data: {
          id: v.id,
          roleId: v.roleId.trim() || null,
          adminRoleIds: v.adminRoleIds.split(/[\s,]+/).filter(Boolean),
        },
      }),
    onSuccess: () => {
      setStatus("\u2713 Roles saved");
      qc.invalidateQueries({ queryKey: ["panels"] });
    },
    onError: (e) => setStatus(`\u2717 ${e instanceof Error ? e.message : "Failed"}`),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["panels"] }),
  });
  const sendMut = useMutation({
    mutationFn: (id: string) => send({ data: { id } }),
    onSuccess: () => setStatus("✓ Panel sent to Discord"),
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed"}`),
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-bold">Discord Panels</h1>
      <p className="mt-1" style={{ color: "var(--muted-foreground)" }}>
        Create control panels with redeem / script / role / HWID / stats buttons and post them
        straight to a Discord channel.
      </p>

      <div className="card-blue p-5 mt-6 grid gap-3 md:grid-cols-2 items-end">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            NAME
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-blue mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            SCRIPT
          </label>
          <select
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value)}
            className="input-blue mt-1"
          >
            <option value="">None</option>
            {(scriptsQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            DESCRIPTION
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-blue mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            DISCORD CHANNEL ID
          </label>
          <input
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="input-blue mt-1"
            placeholder="1234567890123456789"
          />
          <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
            Recommended — the bot posts here with working buttons.
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            WHITELIST ANNOUNCE CHANNEL ID
          </label>
          <input
            value={whitelistChannelId}
            onChange={(e) => setWhitelistChannelId(e.target.value)}
            className="input-blue mt-1"
            placeholder="optional"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            DISCORD WEBHOOK URL (FALLBACK)
          </label>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="input-blue mt-1"
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>
        <button
          onClick={() => name && createMut.mutate()}
          disabled={createMut.isPending}
          className="btn-primary md:col-start-2"
        >
          Create panel
        </button>
      </div>

      {status && (
        <div
          className="mt-4 text-sm rounded-md px-3 py-2"
          style={{
            background: status.startsWith("✓") ? "rgba(52,211,153,0.12)" : "rgba(244,63,94,0.12)",
            color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)",
          }}
        >
          {status}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(q.data ?? []).map((p) => (
          <div key={p.id} className="card-blue p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{p.name} Control Panel</h3>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {p.description || "—"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {p.channel_id
                    ? `Channel: ${p.channel_id}`
                    : p.webhook_url
                      ? "Webhook only"
                      : "No destination set"}
                </p>
              </div>
              <button
                onClick={() => confirm("Delete panel?") && delMut.mutate(p.id)}
                className="text-xs text-[color:var(--destructive)] hover:underline"
              >
                Delete
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div
                className="text-center rounded-md py-2 text-white"
                style={{ background: "#248046" }}
              >
                🔑 Redeem Key
              </div>
              <div
                className="text-center rounded-md py-2 text-white"
                style={{ background: "#5865f2" }}
              >
                🧵 Get Script
              </div>
              <div
                className="text-center rounded-md py-2 text-white"
                style={{ background: "#5865f2" }}
              >
                👤 Get Role
              </div>
              <div
                className="text-center rounded-md py-2"
                style={{ background: "var(--muted)", color: "var(--foreground)" }}
              >
                ⚙️ Reset HWID
              </div>
              <div
                className="text-center rounded-md py-2 col-span-2"
                style={{ background: "var(--muted)", color: "var(--foreground)" }}
              >
                📊 Get Stats
              </div>
            </div>
            <RoleConfig
              panel={p}
              onSave={(roleId, adminRoleIds) => updMut.mutate({ id: p.id, roleId, adminRoleIds })}
              saving={updMut.isPending}
            />

            <button
              onClick={() => sendMut.mutate(p.id)}
              disabled={sendMut.isPending || (!p.channel_id && !p.webhook_url)}
              className="btn-primary w-full mt-4 text-sm"
            >
              {p.channel_id || p.webhook_url ? "Send to Discord" : "No channel or webhook set"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type PanelRoleConfig = {
  discord_role_id?: string | null;
  admin_role_ids?: string[] | null;
};

function RoleConfig({
  panel,
  onSave,
  saving,
}: {
  panel: PanelRoleConfig;
  onSave: (roleId: string, adminRoleIds: string) => void;
  saving: boolean;
}) {
  const [buyer, setBuyer] = useState<string>(panel.discord_role_id ?? "");
  const [admins, setAdmins] = useState<string>((panel.admin_role_ids ?? []).join(", "));

  return (
    <div className="mt-4 grid gap-3 rounded-md p-3" style={{ background: "var(--muted)" }}>
      <div>
        <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          BUYER ROLE ID
        </label>
        <input
          value={buyer}
          onChange={(e) => setBuyer(e.target.value)}
          className="input-blue mt-1"
          placeholder="Given on redeem / whitelist"
        />
      </div>
      <div>
        <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
          ADMIN ROLE IDS
        </label>
        <input
          value={admins}
          onChange={(e) => setAdmins(e.target.value)}
          className="input-blue mt-1"
          placeholder="Comma separated — can run /whitelist and /resethwid"
        />
      </div>
      <button
        onClick={() => onSave(buyer, admins)}
        disabled={saving}
        className="btn-outline text-sm"
      >
        Save roles
      </button>
    </div>
  );
}
