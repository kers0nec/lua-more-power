import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  createPanel,
  deletePanel,
  listPanels,
  sendPanel,
  syncDiscordCommands,
  updatePanel,
} from "@/lib/panels.functions";
import { listScripts } from "@/lib/scripts.functions";
import { getDashboardStats } from "@/lib/dashboard.functions";

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
  const syncCmds = useServerFn(syncDiscordCommands);
  const scripts = useServerFn(listScripts);
  const getStats = useServerFn(getDashboardStats);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["panels"], queryFn: () => list() });
  const scriptsQ = useQuery({ queryKey: ["scripts"], queryFn: () => scripts() });
  const statsQ = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => getStats() });
  const isOwner = Boolean(statsQ.data?.isOwner);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [whitelistChannelId, setWhitelistChannelId] = useState("");
  const [status, setStatus] = useState<string>("");

  const syncMut = useMutation({
    mutationFn: () => syncCmds(),
    onSuccess: (res) => {
      if (res.ok) {
        setStatus(
          `✓ Auto-registered ${res.count ?? 5} slash commands with Discord (/help, /login, /setup, /whitelist, /resethwid)`,
        );
      } else {
        setStatus(`✗ ${res.message}`);
      }
    },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed to sync commands"}`),
  });

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
    mutationFn: (v: {
      id: string;
      roleId?: string;
      adminRoleIds?: string;
      channelId?: string;
      whitelistChannelId?: string;
      webhookUrl?: string;
    }) =>
      upd({
        data: {
          id: v.id,
          roleId: v.roleId !== undefined ? v.roleId.trim() || null : undefined,
          adminRoleIds:
            v.adminRoleIds !== undefined
              ? v.adminRoleIds.split(/[\s,]+/).filter(Boolean)
              : undefined,
          channelId: v.channelId !== undefined ? v.channelId.trim() || null : undefined,
          whitelistChannelId:
            v.whitelistChannelId !== undefined ? v.whitelistChannelId.trim() || null : undefined,
          webhookUrl: v.webhookUrl !== undefined ? v.webhookUrl.trim() || null : undefined,
        },
      }),
    onSuccess: () => {
      setStatus("✓ Panel settings saved");
      qc.invalidateQueries({ queryKey: ["panels"] });
    },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed to update panel"}`),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["panels"] }),
  });
  const sendMut = useMutation({
    mutationFn: (id: string) => send({ data: { id } }),
    onSuccess: (res) => {
      setStatus(
        res.via === "bot"
          ? "✓ Panel sent to Discord channel via Bot!"
          : "✓ Panel sent to Discord channel via Webhook!",
      );
    },
    onError: (e) => setStatus(`✗ ${e instanceof Error ? e.message : "Failed to send panel"}`),
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Discord Panels</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Create control panels with redeem / script / role / HWID / stats buttons and post them
            straight to a Discord channel.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              className="btn-outline text-xs px-3.5 py-2 shrink-0 self-start md:self-auto flex items-center gap-2 border-blue-500/50 hover:border-blue-400"
            >
              <span>{syncMut.isPending ? "Syncing..." : "⚡ Sync Slash Commands (Owner)"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Auto-registration info badge (Owner Only) */}
      {isOwner && (
        <div
          className="card-blue p-4 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          style={{ borderColor: "rgba(59, 130, 246, 0.3)", background: "rgba(6, 14, 29, 0.8)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Slash Commands Auto-Registered:</span>
            <span className="font-mono" style={{ color: "var(--primary)" }}>
              /help, /login, /setup, /whitelist, /resethwid
            </span>
          </div>
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
            Authorized Owner Control Active.
          </span>
        </div>
      )}

      <div className="card-blue p-5 mt-4 grid gap-3 md:grid-cols-2 items-end">
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
            {/* Discord message & Embed visual representation */}
            <div className="mt-4 rounded-lg bg-[#313338] p-4 text-white font-sans border border-[#3f4147]">
              {/* Bot author row */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className="h-8 w-8 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-xs font-mono font-bold shrink-0">
                  LM
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-blue-400 hover:underline cursor-pointer">
                    LuaMore Security
                  </span>
                  <span className="bg-[#5865F2] text-[10px] text-white font-bold px-1 py-0.5 rounded">
                    APP
                  </span>
                  <span className="text-[11px] text-[#949ba4] ml-1">
                    {new Date().toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                      year: "2-digit",
                    })}
                    ,{" "}
                    {new Date().toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Embed body */}
              <div className="ml-10 rounded-md bg-[#2b2d31] border-l-4 border-[#5865f2] p-3 text-xs space-y-2">
                <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                <p className="text-[#dbdee1] leading-relaxed whitespace-pre-line">
                  {p.description ||
                    `This control panel is for the project: **${(scriptsQ.data ?? []).find((s) => s.id === p.script_id)?.name || p.name}**\nIf you're a buyer, click on the buttons below to redeem your key, get the script or get your role`}
                </p>
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#949ba4]">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                  <span>
                    Sent by{" "}
                    {(scriptsQ.data ?? []).find((s) => s.id === p.script_id)?.name || "formi"} -{" "}
                    {new Date().toLocaleDateString(undefined, {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    {new Date().toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Action Rows / Buttons matching IMG_0870 */}
              <div className="ml-10 mt-3 space-y-2 text-xs font-medium">
                <div className="flex gap-2">
                  <div className="flex-1 text-center rounded bg-[#248046] hover:bg-[#1a6334] py-2 text-white cursor-pointer select-none transition-colors">
                    🔑 Redeem Key
                  </div>
                  <div className="flex-1 text-center rounded bg-[#5865f2] hover:bg-[#4752c4] py-2 text-white cursor-pointer select-none transition-colors">
                    📜 Get Script
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 text-center rounded bg-[#5865f2] hover:bg-[#4752c4] py-2 text-white cursor-pointer select-none transition-colors">
                    👤 Get Role
                  </div>
                  <div className="flex-1 text-center rounded bg-[#4e5058] hover:bg-[#6d6f78] py-2 text-white cursor-pointer select-none transition-colors">
                    ⚙️ Reset HWID
                  </div>
                </div>
                <div className="flex">
                  <div className="w-1/2 pr-1">
                    <div className="text-center rounded bg-[#4e5058] hover:bg-[#6d6f78] py-2 text-white cursor-pointer select-none transition-colors">
                      📊 Get Stats
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <PanelSettingsConfig
              panel={p}
              onSave={(data) => updMut.mutate({ id: p.id, ...data })}
              saving={updMut.isPending}
            />

            <button
              onClick={() => sendMut.mutate(p.id)}
              disabled={sendMut.isPending || (!p.channel_id && !p.webhook_url)}
              className="btn-primary w-full mt-4 text-sm"
            >
              {p.channel_id
                ? "Send to Discord (Bot Channel)"
                : p.webhook_url
                  ? "Send to Discord (Webhook)"
                  : "No channel or webhook set"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type PanelConfigProps = {
  discord_role_id?: string | null;
  admin_role_ids?: string[] | null;
  channel_id?: string | null;
  whitelist_channel_id?: string | null;
  webhook_url?: string | null;
};

function PanelSettingsConfig({
  panel,
  onSave,
  saving,
}: {
  panel: PanelConfigProps;
  onSave: (data: {
    roleId: string;
    adminRoleIds: string;
    channelId: string;
    whitelistChannelId: string;
    webhookUrl: string;
  }) => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [buyer, setBuyer] = useState<string>(panel.discord_role_id ?? "");
  const [admins, setAdmins] = useState<string>((panel.admin_role_ids ?? []).join(", "));
  const [channel, setChannel] = useState<string>(panel.channel_id ?? "");
  const [wlChannel, setWlChannel] = useState<string>(panel.whitelist_channel_id ?? "");
  const [webhook, setWebhook] = useState<string>(panel.webhook_url ?? "");

  return (
    <div className="mt-4 rounded-md p-3" style={{ background: "var(--muted)" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs font-semibold text-left"
        style={{ color: "var(--foreground)" }}
      >
        <span>⚙️ Channel, Webhook & Role Settings</span>
        <span className="text-[11px]" style={{ color: "var(--primary)" }}>
          {open ? "Hide ▲" : "Configure ▼"}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              DISCORD CHANNEL ID
            </label>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="input-blue mt-1"
              placeholder="e.g. 1234567890123456789"
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              DISCORD WEBHOOK URL (FALLBACK / DIRECT POST)
            </label>
            <input
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              className="input-blue mt-1"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              WHITELIST ANNOUNCE CHANNEL ID
            </label>
            <input
              value={wlChannel}
              onChange={(e) => setWlChannel(e.target.value)}
              className="input-blue mt-1"
              placeholder="optional"
            />
          </div>

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
              placeholder="Comma separated role IDs"
            />
          </div>

          <button
            onClick={() =>
              onSave({
                roleId: buyer,
                adminRoleIds: admins,
                channelId: channel,
                whitelistChannelId: wlChannel,
                webhookUrl: webhook,
              })
            }
            disabled={saving}
            className="btn-outline w-full text-xs py-2 mt-2"
          >
            {saving ? "Saving..." : "Save Panel Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}
