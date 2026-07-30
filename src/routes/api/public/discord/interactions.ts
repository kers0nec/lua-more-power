import { createFileRoute } from "@tanstack/react-router";
import { buildLoaderMessage, buildPanelComponents, buildPanelEmbed, buildWhitelistMessage, formatDuration, parseDuration } from "@/lib/discord-panel";


// Discord HTTP Interactions endpoint.
// Configure in the Discord developer portal:
//   Interactions Endpoint URL = https://<your-domain>/api/public/discord/interactions
// Requires DISCORD_PUBLIC_KEY env var.
//
// Supports all listed slash commands. User identity resolved by mapping
// interaction.member.user.id -> profiles.discord_id (linked via /login <api_key>).

type Json = Record<string, unknown>;

const COLOR_SUCCESS = 0x00aaff;
const COLOR_ERROR = 0xff4444;
const COLOR_INFO = 0x0066cc;
const COLOR_WARN = 0xffaa00;

export const Route = createFileRoute("/api/public/discord/interactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const publicKey = process.env.DISCORD_PUBLIC_KEY;
        if (!publicKey) return json({ error: "DISCORD_PUBLIC_KEY not configured" }, 500);

        const sig = request.headers.get("x-signature-ed25519");
        const ts = request.headers.get("x-signature-timestamp");
        const raw = await request.text();
        if (!sig || !ts) return new Response("missing signature", { status: 401 });
        const ok = await verifyEd25519(publicKey, sig, ts + raw);
        if (!ok) return new Response("invalid signature", { status: 401 });

        const body = JSON.parse(raw) as Json & { type: number };
        if (body.type === 1) return json({ type: 1 }); // PING → PONG
        if (body.type === 2) return json(await handleCommand(body));
        if (body.type === 3) return json(await handleComponent(body));
        if (body.type === 5) return json(await handleModal(body));
        return json({ type: 4, data: { content: "Unsupported interaction", flags: 64 } });


      },
    },
  },
});

async function handleCommand(body: any) {
  const name = body.data?.name as string;
  const opts = new Map<string, any>((body.data?.options ?? []).map((o: any) => [o.name, o.value]));
  const userId = body.member?.user?.id ?? body.user?.id;

  try {
    switch (name) {
      case "help":
        return embedReply({ title: "How to use LuaMore", description: HELP_TEXT, color: COLOR_INFO });

      case "login": {
        const key = String(opts.get("api_key") ?? "");
        if (!key || !userId) return errorReply("Missing api_key");
        const linked = await linkDiscord(userId, key);
        if (!linked) return errorReply("Invalid API key");
        return embedReply({ title: "✅ Logged in", description: "Discord account linked. Run `/setup` in your panel channel.", color: COLOR_SUCCESS });
      }

      case "setup": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked. Use `/login <api_key>` first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const scriptPublicId = String(opts.get("script_id") ?? "");
        if (scriptPublicId) {
          const { data: script } = await supabaseAdmin
            .from("scripts").select("id, name, description")
            .eq("public_id", scriptPublicId).eq("user_id", profile.id).maybeSingle();
          if (!script) return errorReply("Script not found — check its public ID");
          return await postPanelForScript(profile.id, script, body);
        }

        const { data: scripts } = await supabaseAdmin
          .from("scripts").select("id, name, public_id")
          .eq("user_id", profile.id).order("created_at", { ascending: false }).limit(25);
        if (!scripts?.length) return errorReply("You have no scripts yet — create one on the dashboard.");

        return {
          type: 4,
          data: {
            flags: 64,
            embeds: [{ title: "LuaMore setup", description: "Pick the script this channel's panel should serve.", color: COLOR_INFO }],
            components: [{
              type: 1,
              components: [{
                type: 3,
                custom_id: "lm:setup",
                placeholder: "Select a script",
                options: scripts.map((s) => ({ label: s.name.slice(0, 100), value: s.public_id, description: s.public_id })),
              }],
            }],
          },
        };
      }

      case "whitelist": {
        const profile = await getProfileByDiscord(userId);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const panel = await getPanelForChannel(body.channel_id);
        if (!panel) return errorReply("No panel in this channel — run `/setup` here first.");
        if (!(await isPanelAdmin(panel, body, profile?.id))) return errorReply("You need an admin role for this panel.");
        if (!panel.script_id) return errorReply("This panel has no script attached.");

        const target = String(opts.get("user") ?? "");
        const ms = parseDuration(String(opts.get("duration") ?? ""));
        if (opts.get("duration") && ms === null) return errorReply("Bad duration — use 20s, 35m, 2h, 1d, 7d, 30d");
        const expires = ms ? new Date(Date.now() + ms).toISOString() : null;

        const key = randomKey();
        const { data: lic } = await supabaseAdmin.from("license_keys").insert({
          user_id: panel.user_id, script_id: panel.script_id, key, discord_id: target,
          hours_valid: ms ? Math.max(1, Math.round(ms / 3_600_000)) : 0, expires_at: expires,
        }).select("id").maybeSingle();
        await supabaseAdmin.from("whitelists").insert({
          user_id: panel.user_id, script_id: panel.script_id, discord_id: target, license_key_id: lic?.id, expires_at: expires,
        });

        if (panel.discord_role_id && body.guild_id && process.env.DISCORD_BOT_TOKEN) {
          await fetch(`https://discord.com/api/v10/guilds/${body.guild_id}/members/${target}/roles/${panel.discord_role_id}`, {
            method: "PUT", headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          }).catch(() => undefined);
        }

        return {
          type: 4,
          data: {
            content: buildWhitelistMessage(target, panel.whitelist_channel_id || panel.channel_id),
            allowed_mentions: { users: [target] },
            embeds: [{
              title: "✅ Whitelisted",
              description: `Duration: **${formatDuration(ms)}**`,
              color: COLOR_SUCCESS,
              footer: { text: "LuaMore" },
            }],
          },
        };
      }

      case "resethwid": {
        const target = String(opts.get("user") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const panel = await getPanelForChannel(body.channel_id);

        if (!target) {
          if (!panel) return errorReply("No panel in this channel — run `/setup` here first.");
          await supabaseAdmin.from("license_keys").update({ hwid: null }).eq("user_id", panel.user_id).eq("discord_id", userId);
          return embedReply({ title: "⚙️ HWID reset", description: "Run the script again to lock a new HWID.", color: COLOR_SUCCESS });
        }

        const profile = await getProfileByDiscord(userId);
        if (!panel) return errorReply("No panel in this channel — run `/setup` here first.");
        if (!(await isPanelAdmin(panel, body, profile?.id))) return errorReply("You need an admin role for this panel.");
        await supabaseAdmin.from("license_keys").update({ hwid: null }).eq("user_id", panel.user_id).eq("discord_id", target);
        return embedReply({ title: `⚙️ HWID reset for <@${target}>`, color: COLOR_SUCCESS });
      }

      default: return errorReply(`Unknown command: ${name}`);
    }
  } catch (e) {
    return errorReply(e instanceof Error ? e.message : "Command failed");
  }
}

async function getPanelForChannel(channelId?: string | null) {
  if (!channelId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("panels").select("*").eq("channel_id", channelId).maybeSingle();
  return data;
}

async function isPanelAdmin(panel: any, body: any, profileId?: string) {
  if (profileId && profileId === panel.user_id) return true;
  const perms = BigInt(body.member?.permissions ?? "0");
  if ((perms & 0x20n) === 0x20n || (perms & 0x8n) === 0x8n) return true; // MANAGE_GUILD / ADMINISTRATOR
  const roles: string[] = body.member?.roles ?? [];
  const admins: string[] = panel.admin_role_ids ?? [];
  return roles.some((r) => admins.includes(r));
}

async function postPanelForScript(profileId: string, script: any, body: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin
    .from("panels").select("*").eq("user_id", profileId).eq("script_id", script.id).maybeSingle();

  let panel = existing;
  if (!panel) {
    const { data: created, error } = await supabaseAdmin.from("panels").insert({
      user_id: profileId,
      script_id: script.id,
      name: script.name,
      description: script.description ?? null,
      channel_id: body.channel_id ?? null,
      whitelist_channel_id: body.channel_id ?? null,
    }).select("*").maybeSingle();
    if (error || !created) return errorReply(error?.message ?? "Could not create panel");
    panel = created;
  } else if (body.channel_id && panel.channel_id !== body.channel_id) {
    await supabaseAdmin.from("panels")
      .update({ channel_id: body.channel_id, whitelist_channel_id: panel.whitelist_channel_id ?? body.channel_id })
      .eq("id", panel.id);
  }

  const sentBy = body.member?.user?.global_name || body.member?.user?.username || null;
  return {
    type: 4,
    data: {
      embeds: [buildPanelEmbed({ id: panel.id, name: panel.name, description: panel.description, sentBy })],
      components: buildPanelComponents(panel.id),
    },
  };
}


async function handleComponent(body: any) {
  const cid = String(body.data?.custom_id ?? "");
  const [, action, panelId] = cid.split(":");
  const discordId = body.member?.user?.id ?? body.user?.id;

  if (action === "setup") {
    const profile = await getProfileByDiscord(discordId);
    if (!profile) return errorReply("Account not linked. Use `/login <api_key>` first.");
    const publicId = String(body.data?.values?.[0] ?? "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: script } = await supabaseAdmin
      .from("scripts").select("id, name, description")
      .eq("public_id", publicId).eq("user_id", profile.id).maybeSingle();
    if (!script) return errorReply("Script not found");
    return await postPanelForScript(profile.id, script, body);
  }

  if (action === "redeem") {
    return {
      type: 9, // MODAL
      data: {
        custom_id: `lm:redeem-submit:${panelId}`,
        title: "Redeem LuaMore Key",
        components: [{ type: 1, components: [{ type: 4, custom_id: "key", label: "License key", style: 1, required: true, min_length: 8, max_length: 64 }] }],
      },
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: panel } = await supabaseAdmin.from("panels").select("*").eq("id", panelId).maybeSingle();
  if (!panel) return errorReply("This panel no longer exists");

  if (action === "script") {
    if (!panel.script_id) return errorReply("No script is attached to this panel");
    const { data: script } = await supabaseAdmin.from("scripts").select("public_id, name, ffa").eq("id", panel.script_id).maybeSingle();
    if (!script) return errorReply("Script not found");

    const { data: wl } = await supabaseAdmin
      .from("whitelists").select("id, expires_at").eq("script_id", panel.script_id).eq("discord_id", discordId).maybeSingle();
    const { data: lic } = await supabaseAdmin
      .from("license_keys").select("key, revoked, expires_at").eq("script_id", panel.script_id).eq("discord_id", discordId).maybeSingle();

    if (!script.ffa && !wl && !lic) return errorReply("You are not whitelisted for this script — redeem a key first.");
    if (lic?.revoked) return errorReply("Your access has been revoked");

    const url = `${originFromEnv()}/api/public/r/${script.public_id}`;

    return embedReply({
      title: `📜 ${script.name}`,
      description: buildLoaderMessage(`loadstring(game:HttpGet("${lic?.key ? `${originFromEnv()}/api/public/r/${lic.key}` : url}"))()`),
      color: COLOR_INFO,
      footer: { text: "LuaMore · keep this loader private" },
    });
  }

  if (action === "role") {
    if (!panel.discord_role_id) return errorReply("No role is configured for this panel");
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = body.guild_id;
    if (!botToken || !guildId) return errorReply("Bot is not configured for role granting");
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${panel.discord_role_id}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return errorReply(`Could not grant the role (${res.status})`);
    return embedReply({ title: "👤 Role granted", description: `<@&${panel.discord_role_id}> is yours.`, color: COLOR_SUCCESS });
  }

  if (action === "hwid") {
    const { error } = await supabaseAdmin
      .from("license_keys").update({ hwid: null })
      .eq("discord_id", discordId)
      .eq("user_id", panel.user_id);
    if (error) return errorReply(error.message);
    return embedReply({ title: "⚙️ HWID reset", description: "Run the script again to lock a new HWID.", color: COLOR_SUCCESS });
  }

  if (action === "stats") {
    const [{ count: keys }, { count: wls }] = await Promise.all([
      supabaseAdmin.from("license_keys").select("id", { count: "exact", head: true }).eq("user_id", panel.user_id),
      supabaseAdmin.from("whitelists").select("id", { count: "exact", head: true }).eq("user_id", panel.user_id),
    ]);
    const { data: script } = panel.script_id
      ? await supabaseAdmin.from("scripts").select("name, run_count").eq("id", panel.script_id).maybeSingle()
      : { data: null };
    return embedReply({
      title: "📊 Panel stats",
      color: COLOR_INFO,
      fields: [
        { name: "Script", value: script?.name ?? "—", inline: true },
        { name: "Executions", value: String(script?.run_count ?? 0), inline: true },
        { name: "Keys issued", value: String(keys ?? 0), inline: true },
        { name: "Whitelisted users", value: String(wls ?? 0), inline: true },
      ],
    });
  }

  return errorReply(`Unknown action: ${action}`);
}

async function handleModal(body: any) {
  const cid = String(body.data?.custom_id ?? "");
  const [, action, panelId] = cid.split(":");
  if (action !== "redeem-submit") return errorReply("Unknown form");
  const discordId = body.member?.user?.id ?? body.user?.id;
  const key = String(
    body.data?.components?.[0]?.components?.[0]?.value ?? "",
  ).trim();
  if (!key) return errorReply("No key provided");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: panel } = await supabaseAdmin.from("panels").select("*").eq("id", panelId).maybeSingle();
  if (!panel) return errorReply("This panel no longer exists");

  const { data: lic } = await supabaseAdmin.from("license_keys").select("*").eq("key", key).maybeSingle();
  if (!lic || lic.user_id !== panel.user_id) return errorReply("Invalid key");
  if (lic.revoked) return errorReply("This key has been revoked");
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) return errorReply("This key has expired");
  if (lic.discord_id && lic.discord_id !== discordId) return errorReply("This key is already bound to another user");

  const scriptId = lic.script_id ?? panel.script_id;
  await supabaseAdmin.from("license_keys").update({ discord_id: discordId, script_id: scriptId }).eq("id", lic.id);
  if (scriptId) {
    await supabaseAdmin.from("whitelists").insert({
      user_id: panel.user_id, script_id: scriptId, discord_id: discordId, license_key_id: lic.id, expires_at: lic.expires_at,
    });
  }

  if (panel.discord_role_id && body.guild_id && process.env.DISCORD_BOT_TOKEN) {
    await fetch(`https://discord.com/api/v10/guilds/${body.guild_id}/members/${discordId}/roles/${panel.discord_role_id}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    }).catch(() => undefined);
  }

  return embedReply({
    title: "✅ Key redeemed",
    description: buildWhitelistMessage(discordId, panel.whitelist_channel_id || panel.channel_id),
    color: COLOR_SUCCESS,
  });
}


// ---- helpers ----
function embedReply(embed: Record<string, unknown>) {
  return { type: 4, data: { embeds: [embed], flags: 64 } };
}
function errorReply(msg: string) {
  return embedReply({ title: "❌ Error", description: msg, color: COLOR_ERROR });
}
function json(v: unknown, status = 200) {
  return new Response(JSON.stringify(v), { status, headers: { "Content-Type": "application/json" } });
}
function originFromEnv() {
  return process.env.PUBLIC_BASE_URL || "https://your-luamore.lovable.app";
}
function randomKey() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 20);
  return `LM-${b64.slice(0, 4)}-${b64.slice(4, 12)}-${b64.slice(12, 20)}`;
}

async function getProfileByDiscord(discordId?: string) {
  if (!discordId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("*").eq("discord_id", discordId).maybeSingle();
  return data;
}

async function linkDiscord(discordId: string, apiKey: string) {
  const hash = await sha256Hex(apiKey);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: key } = await supabaseAdmin.from("api_keys").select("user_id").eq("key_hash", hash).maybeSingle();
  if (!key) return false;
  await supabaseAdmin.from("profiles").update({ discord_id: discordId }).eq("id", key.user_id);
  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash);
  return true;
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Ed25519 verification using Web Crypto (workerd supports Ed25519 raw import)
async function verifyEd25519(publicKeyHex: string, signatureHex: string, message: string) {
  try {
    const pub = hexToBytes(publicKeyHex);
    const sig = hexToBytes(signatureHex);
    const key = await crypto.subtle.importKey("raw", pub, { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, sig, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}
function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

const HELP_TEXT = [
  "**1.** Invite the LuaMore bot.",
  "**2.** Enable Key system on your script.",
  "**3.** Run `/setup` in a channel and pick the script.",
  "**4.** Configure the Buyer role and Admin roles for that panel on the dashboard.",
  "**5.** Use `/whitelist user duration` — duration like 20s, 35m, 2h, 1d, 7d, 30d (omit for forever).",
  "**6.** Admins can use `/resethwid user` with no cooldown.",
].join("\n");
