/* eslint-disable @typescript-eslint/no-explicit-any -- Discord payloads are runtime-defined by the external API. */
import { createFileRoute } from "@tanstack/react-router";
import {
  buildLoaderMessage,
  buildPanelComponents,
  buildPanelEmbed,
  buildWhitelistMessage,
  formatDuration,
  parseDuration,
} from "@/lib/discord-panel";
import { autoRegisterDiscordCommands } from "@/lib/discord-commands.server";
import { getScriptByPublicId, getAllScripts } from "@/lib/scripts-store.server";

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
        if (body.type === 1) {
          return json({ type: 1 }); // PING → PONG
        }
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
        return embedReply({
          title: "How to use LuaMore",
          description: HELP_TEXT,
          color: COLOR_INFO,
        });

      case "login": {
        const key = String(opts.get("api_key") ?? opts.get("key") ?? "");
        const email = String(opts.get("email") ?? "");
        const password = String(opts.get("password") ?? "");

        if (!key && !(email && password)) {
          return errorReply(
            "Missing credentials.\n\n" +
              "**Option 1:** Use `/login api_key:<your_key>` with a key from **Dashboard → API Keys** (https://luamore.app/dashboard/api-keys).\n" +
              "**Option 2:** Use `/login email:<your_email> password:<your_password>` to log in directly with your account credentials.",
          );
        }

        if (email && password) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { setDiscordSession } = await import("@/lib/discord-auth-store.server");
          const authRes = await supabaseAdmin.auth.signInWithPassword({ email, password });
          if (authRes.error || !authRes.data.user) {
            return errorReply(
              `Login failed: ${authRes.error?.message || "Invalid email or password"}`,
            );
          }
          const user = authRes.data.user;
          const sessionData = authRes.data.session;
          setDiscordSession(userId, {
            userId: user.id,
            discordId: userId,
            email: user.email,
            username:
              (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "User",
            accessToken: sessionData?.access_token,
            refreshToken: sessionData?.refresh_token,
            linkedAt: new Date().toISOString(),
          });
          return embedReply({
            title: "✅ Logged in to LuaMore",
            description: `Successfully linked Discord account to **${user.email}**.\n\nYou can now run \`/setup\` in your server to deploy panels!`,
            color: COLOR_SUCCESS,
          });
        }

        const result = await linkDiscord(userId, key);
        if (!result.success) {
          return errorReply(
            result.error ||
              "Invalid API key.\n\nTo get a valid key:\n1. Sign in to https://luamore.app/login\n2. Open **Dashboard → API Keys** (https://luamore.app/dashboard/api-keys)\n3. Click **Generate Key**\n4. Copy the new key and run `/login <your_key>` in Discord.",
          );
        }
        return embedReply({
          title: "✅ Logged in to LuaMore",
          description: `Linked Discord account to **${result.username || "LuaMore account"}**.\n\nYou can now run \`/setup\` in your server's panel channel to deploy your scripts!`,
          color: COLOR_SUCCESS,
        });
      }

      case "setup":
        return embedReply({ title: "🚀 LuaMore Setup Guide", description: ["Welcome to LuaMore! Here's how to get started:", "", "**1️⃣ Create a Script**", "Use `/create-script` with a name and Lua source.", "", "**2️⃣ Send a Panel**", "Configure a panel in the dashboard, then use `/panel panel_id:<id>`.", "", "**3️⃣ Generate Keys**", "Use `/generatekey panel_id:<id> hours:24`.", "", "**4️⃣ Whitelist Users**", "Use `/whitelist script_id:<id> user:@user duration:48`.", "", "Run `/help` to see all commands."].join("\n"), color: COLOR_INFO });

      case "whitelist": {
        const profile = await getProfileByDiscord(userId);
        const scriptRef = String(opts.get("script_id") ?? "").trim();
        const target = String(opts.get("user") ?? "").trim();
        const hours = Math.max(0, Number(opts.get("duration") ?? 0) || 0);
        if (!scriptRef || !target) return errorReply("Provide `script_id` and `user`.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const script = await findScript(supabaseAdmin, scriptRef);
        if (!script) return errorReply("Script not found.");
        if (!canManageScript(script.user_id, body, profile?.id)) return errorReply("You must own this script or have Administrator in this server.");
        const expires = hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;
        const key = randomKey();
        const { data: lic, error: keyError } = await supabaseAdmin.from("license_keys").insert({ user_id: script.user_id, script_id: script.id, key, discord_id: target, hours_valid: hours, expires_at: expires }).select("id").maybeSingle();
        if (keyError || !lic) return errorReply(keyError?.message ?? "Could not generate key.");
        const { error: wlError } = await supabaseAdmin.from("whitelists").insert({ user_id: script.user_id, script_id: script.id, discord_id: target, license_key_id: lic.id, expires_at: expires });
        if (wlError) return errorReply(wlError.message);
        const loader = keyedLoader(script.public_id, key);
        await sendDiscordDm(target, `✅ You have been whitelisted for **${script.name}**.\n\n${buildLoaderMessage(loader)}`);
        return embedReply({ title: "✅ Whitelist Granted", description: `<@${target}> has been whitelisted for **${script.name}**\n\nLicense Key: \`${key}\`\nDuration: **${hours > 0 ? `${hours} hours` : "Permanent"}**\n\n${buildLoaderMessage(loader)}`, color: COLOR_SUCCESS });
      }

      case "resethwid": {
        const scriptRef = String(opts.get("script_id") ?? "").trim();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const script = await findScript(supabaseAdmin, scriptRef);
        if (!script) return errorReply("Script not found.");
        const { count, error } = await supabaseAdmin.from("license_keys").update({ hwid: null }, { count: "exact" }).eq("script_id", script.id).eq("discord_id", userId);
        if (error) return errorReply(error.message);
        if (!count) return errorReply("No active key was found for you on this script.");
        return embedReply({ title: "✅ HWID reset complete", description: `HWID reset complete for **${script.name}**.\nRe-run your loader to link the new HWID.`, color: COLOR_SUCCESS });
      }

      case "create-script": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your Discord account from the LuaMore dashboard first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const scriptName = String(opts.get("name") ?? "").trim();
        const code = String(opts.get("code") ?? "");
        const ffa = Boolean(opts.get("ffa"));
        const protect = Boolean(opts.get("obfuscate"));
        const mode = String(opts.get("mode") ?? "standard").toLowerCase();
        if (!scriptName || !code.trim()) return errorReply("Provide a script name and Lua code.");
        if (scriptName.length > 120 || code.length > 5_000_000) return errorReply("Script name or source is too long.");
        let protectedCode: string | null = null;
        if (protect) {
          try { const { obfuscateLuaWithOptions } = await import("@/lib/obfuscator.server"); protectedCode = obfuscateLuaWithOptions(code, { loaderVMDepth: mode === "advanced" ? 3 : mode === "basic" ? 1 : 2, antiTamper: true }); }
          catch (e) { return errorReply(`Obfuscation failed: ${e instanceof Error ? e.message : "unknown"}`); }
        }
        const { data, error } = await supabaseAdmin.from("scripts").insert({ user_id: profile.id, name: scriptName, code, ffa, is_protected: protect, obfuscated_code: protectedCode, obfuscator: protect ? mode : null }).select("id, public_id, name").maybeSingle();
        if (error || !data) return errorReply(error?.message ?? "Failed to create script");
        const loader = ffa ? openLoader(data.public_id) : keyedLoader(data.public_id, "YOUR_KEY");
        return embedReply({ title: "✅ Script Created Successfully", description: `Script ID: \`${data.id}\`\nName: **${data.name}**\nPublic ID: \`${data.public_id}\`\nFFA Mode: **${ffa ? "Enabled" : "Disabled"}**\nObfuscation: **${protect ? titleCase(mode) : "Disabled"}**\n\n${buildLoaderMessage(loader)}\n\n♾️ Unlimited`, color: COLOR_SUCCESS });
      }

      case "panel": {
        const profile = await getProfileByDiscord(userId);
        const panelId = String(opts.get("panel_id") ?? "").trim();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: panel } = await supabaseAdmin.from("panels").select("*").eq("id", panelId).maybeSingle();
        if (!panel) return errorReply("Panel not found.");
        const isAdmin = (BigInt(body.member?.permissions ?? "0") & 0x8n) === 0x8n;
        if (panel.user_id !== profile?.id && !isAdmin) return errorReply("You must own this panel or have Administrator in this server.");
        const { data: script } = panel.script_id ? await supabaseAdmin.from("scripts").select("name, ffa").eq("id", panel.script_id).maybeSingle() : { data: null };
        const sentBy = body.member?.user?.global_name || body.member?.user?.username || null;
        return { type: 4, data: { embeds: [buildPanelEmbed({ id: panel.id, name: panel.name, description: panel.description, sentBy, projectName: script?.name ?? null, access: script?.ffa ? "Free access" : "Key required" })], components: buildPanelComponents(panel.id) } };
      }

      case "generatekey": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your Discord account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const panelId = String(opts.get("panel_id") ?? "").trim();
        const hours = Math.max(0, Number(opts.get("hours") ?? 0) || 0);
        const note = String(opts.get("note") ?? "").trim() || null;
        const target = String(opts.get("user") ?? "").trim() || null;
        const { data: panel } = await supabaseAdmin.from("panels").select("id, user_id, script_id").eq("id", panelId).maybeSingle();
        if (!panel || panel.user_id !== profile.id) return errorReply("Panel not found (or not yours).");
        if (!panel.script_id) return errorReply("This panel has no script attached.");
        const key = randomKey();
        const expires = hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;
        const { error } = await supabaseAdmin.from("license_keys").insert({ user_id: profile.id, panel_id: panel.id, script_id: panel.script_id, key, hours_valid: hours, expires_at: expires, note, discord_id: target });
        if (error) return errorReply(error.message);
        return embedReply({ title: "✅ Key Generated", description: `Key: \`${key}\`${target ? `\nAssigned To: <@${target}>` : "\nAssigned To: Available"}\nExpires: **${expires ? new Date(expires).toUTCString() : "Never"}**${note ? `\nNote: ${note}` : ""}\n\n♾️ Unlimited`, color: COLOR_SUCCESS });
      }

      case "blacklist": {
        const profile = await getProfileByDiscord(userId);
        const scriptRef = String(opts.get("script_id") ?? "").trim();
        const target = String(opts.get("user") ?? "").trim();
        if (!profile) return errorReply("Link your Discord account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const script = await findScript(supabaseAdmin, scriptRef);
        if (!script || script.user_id !== profile.id) return errorReply("Script not found (or not yours).");
        await supabaseAdmin.from("whitelists").delete().eq("script_id", script.id).eq("discord_id", target);
        await supabaseAdmin.from("license_keys").delete().eq("script_id", script.id).eq("discord_id", target);
        return embedReply({ title: "⛔ Blacklisted", description: `<@${target}> has been blacklisted from **${script.name}**.\nTheir whitelist and license key were revoked.`, color: COLOR_WARN });
      }

      case "deletekey": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your account first with `/login`.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const key = String(opts.get("key") ?? "");
        const { error, count } = await supabaseAdmin
          .from("license_keys")
          .delete({ count: "exact" })
          .eq("user_id", profile.id)
          .eq("key", key);
        if (error) return errorReply(error.message);
        if (!count) return errorReply("Key not found (or not yours).");
        return embedReply({ title: "🗑️ Key deleted", color: COLOR_SUCCESS });
      }

      case "forceresethwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your Discord account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: isOwner } = await supabaseAdmin.rpc("has_role", { _user_id: profile.id, _role: "owner" });
        if (!isOwner) return errorReply("LuaMore owner only.");
        const script = await findScript(supabaseAdmin, String(opts.get("script_id") ?? "").trim());
        const target = String(opts.get("user") ?? "").trim();
        if (!script) return errorReply("Script not found.");
        const { count, error } = await supabaseAdmin.from("license_keys").update({ hwid: null }, { count: "exact" }).eq("script_id", script.id).eq("discord_id", target);
        if (error) return errorReply(error.message);
        if (!count) return errorReply("No matching key was found.");
        return embedReply({ title: "✅ Forced HWID reset", description: `Forced HWID reset for <@${target}> on **${script.name}**.`, color: COLOR_SUCCESS });
      }

      case "banuser":
      case "unbanuser": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: isOwner } = await supabaseAdmin.rpc("has_role", {
          _user_id: profile.id,
          _role: "owner",
        });
        if (!isOwner) return errorReply("Owner only.");
        const target = String(opts.get("discord_id") ?? "").trim();
        if (!/^\d{17,20}$/.test(target)) return errorReply("Provide a valid Discord ID.");
        const { data: prof } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("discord_id", target)
          .maybeSingle();
        if (!prof) return errorReply("That user has no LuaMore profile.");
        await supabaseAdmin
          .from("profiles")
          .update({ is_banned: name === "banuser" })
          .eq("id", prof.id);
        return embedReply({
          title: name === "banuser" ? "🚫 User banned" : "✅ User unbanned",
          description: name === "banuser" ? `Website access blacklisted for \`${target}\`.` : `Website access restored for \`${target}\`.`,
          color: name === "banuser" ? COLOR_WARN : COLOR_SUCCESS,
        });
      }

      case "banhwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const hwid = String(opts.get("hwid") ?? "").trim();
        const reason = String(opts.get("reason") ?? "") || null;
        if (!hwid) return errorReply("Provide `hwid`.");
        const { error } = await supabaseAdmin.from("hwid_bans").insert({
          user_id: profile.id,
          hwid,
          reason,
        });
        if (error) return errorReply(error.message);
        return embedReply({ title: "🚫 HWID banned", description: `\`${hwid}\``, color: COLOR_WARN });
      }

      case "unbanhwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const hwid = String(opts.get("hwid") ?? "").trim();
        const { count, error } = await supabaseAdmin
          .from("hwid_bans")
          .delete({ count: "exact" })
          .eq("user_id", profile.id)
          .eq("hwid", hwid);
        if (error) return errorReply(error.message);
        if (!count) return errorReply("HWID not banned.");
        return embedReply({ title: "✅ HWID unbanned", description: `\`${hwid}\``, color: COLOR_SUCCESS });
      }

      case "loader": {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const script = await findScript(supabaseAdmin, String(opts.get("script_id") ?? "").trim());
        if (!script) return errorReply("Script not found.");
        let key: string | null = null;
        if (!script.ffa) {
          const { data: lic } = await supabaseAdmin.from("license_keys").select("key").eq("script_id", script.id).eq("discord_id", userId).eq("revoked", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
          key = lic?.key ?? null;
          if (!key) return errorReply("No active key is assigned to your Discord account for this script.");
        }
        return embedReply({ title: `📜 ${script.name}`, description: buildLoaderMessage(script.ffa ? openLoader(script.public_id) : keyedLoader(script.public_id, key ?? "")), color: COLOR_INFO });
      }

      case "keys": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Link your Discord account first.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const panelId = String(opts.get("panel_id") ?? "").trim();
        let query = supabaseAdmin.from("license_keys").select("key, expires_at, revoked, note, discord_id").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(10);
        if (panelId) query = query.eq("panel_id", panelId);
        const { data, error } = await query;
        if (error) return errorReply(error.message);
        if (!data?.length) return errorReply("No matching license keys were found.");
        const now = Date.now();
        const lines = data.map((k) => { const status = k.revoked ? "Revoked" : k.expires_at && new Date(k.expires_at).getTime() < now ? "Expired" : k.discord_id ? `Claimed by <@${k.discord_id}>` : "Available"; return `\`${k.key}\` | ${status}${k.note ? ` | ${k.note}` : ""}`; });
        return embedReply({ title: "🔑 Your recent keys", description: lines.join("\n"), color: COLOR_INFO });
      }

      default:
        return errorReply(`Unknown command: ${name}`);
    }
  } catch (e) {
    return errorReply(e instanceof Error ? e.message : "Command failed");
  }
}

function titleCase(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function openLoader(publicId: string) { return `loadstring(game:HttpGet("${originFromEnv()}/scripts/hosted/${publicId}.lua"))()`; }
function keyedLoader(publicId: string, key: string) { return `script_key = "${key}"\nloadstring(game:HttpGet("${originFromEnv()}/scripts/hosted/${publicId}.lua"))()`; }
async function findScript(supabaseAdmin: any, reference: string) {
  if (!reference) return null;
  const { data } = await supabaseAdmin.from("scripts").select("id, user_id, name, public_id, ffa").or(`id.eq.${reference},public_id.eq.${reference}`).maybeSingle();
  return data;
}
function canManageScript(ownerId: string, body: any, profileId?: string) {
  if (profileId && profileId === ownerId) return true;
  return (BigInt(body.member?.permissions ?? "0") & 0x8n) === 0x8n;
}
async function sendDiscordDm(discordId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN; if (!token) return;
  try {
    const dm = await fetch("https://discord.com/api/v10/users/@me/channels", { method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient_id: discordId }) });
    if (!dm.ok) return; const channel = await dm.json() as { id?: string }; if (!channel.id) return;
    await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, { method: "POST", headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
  } catch { /* DMs may be disabled. */ }
}

async function getPanelForChannel(channelId?: string | null) {
  if (!channelId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("panels")
    .select("*")
    .eq("channel_id", channelId)
    .maybeSingle();
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
  // Key panels by (owner, script, channel) so the same script can be posted
  // in multiple servers/channels without stomping each other.
  const { data: existing } = await supabaseAdmin
    .from("panels")
    .select("*")
    .eq("user_id", profileId)
    .eq("script_id", script.id)
    .eq("channel_id", body.channel_id ?? "")
    .maybeSingle();

  let panel = existing;
  if (!panel) {
    const { data: created, error } = await supabaseAdmin
      .from("panels")
      .insert({
        user_id: profileId,
        script_id: script.id,
        name: script.name,
        description: script.description ?? null,
        channel_id: body.channel_id ?? null,
        whitelist_channel_id: body.channel_id ?? null,
      })
      .select("*")
      .maybeSingle();
    if (error || !created) return errorReply(error?.message ?? "Could not create panel");
    panel = created;
  }

  const sentBy = body.member?.user?.global_name || body.member?.user?.username || null;
  return {
    type: 4,
    data: {
      embeds: [
        buildPanelEmbed({ id: panel.id, name: panel.name, description: panel.description, sentBy }),
      ],
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
      .from("scripts")
      .select("id, name, description")
      .eq("public_id", publicId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!script) return errorReply("Script not found");
    return await postPanelForScript(profile.id, script, body);
  }

  if (action === "redeem") {
    return {
      type: 9, // MODAL
      data: {
        custom_id: `lm:redeem-submit:${panelId}`,
        title: "Redeem LuaMore Key",
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "key",
                label: "License key",
                style: 1,
                required: true,
                min_length: 8,
                max_length: 64,
              },
            ],
          },
        ],
      },
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: panel } = await supabaseAdmin
    .from("panels")
    .select("*")
    .eq("id", panelId)
    .maybeSingle();
  if (!panel) return errorReply("This panel no longer exists");

  if (action === "script") {
    if (!panel.script_id) return errorReply("No script is attached to this panel");
    const { data: script } = await supabaseAdmin
      .from("scripts")
      .select("public_id, name, ffa")
      .eq("id", panel.script_id)
      .maybeSingle();
    if (!script) return errorReply("Script not found");

    const { data: wl } = await supabaseAdmin
      .from("whitelists")
      .select("id, expires_at")
      .eq("script_id", panel.script_id)
      .eq("discord_id", discordId)
      .maybeSingle();
    const { data: lic } = await supabaseAdmin
      .from("license_keys")
      .select("key, revoked, expires_at")
      .eq("script_id", panel.script_id)
      .eq("discord_id", discordId)
      .maybeSingle();

    if (!script.ffa && !wl && !lic)
      return errorReply("You are not whitelisted for this script — redeem a key first.");
    if (lic?.revoked) return errorReply("Your access has been revoked");

    const url = `${originFromEnv()}/api/public/r/${script.public_id}`;

    return embedReply({
      title: `📜 ${script.name}`,
      description: buildLoaderMessage(
        `loadstring(game:HttpGet("${lic?.key ? `${originFromEnv()}/api/public/r/${lic.key}` : url}"))()`,
      ),
      color: COLOR_INFO,
      footer: { text: "LuaMore · keep this loader private" },
    });
  }

  if (action === "role") {
    if (!panel.discord_role_id) return errorReply("No role is configured for this panel");
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = body.guild_id;
    if (!botToken || !guildId) return errorReply("Bot is not configured for role granting");
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${panel.discord_role_id}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${botToken}` },
      },
    );
    if (!res.ok) return errorReply(`Could not grant the role (${res.status})`);
    return embedReply({
      title: "👤 Role granted",
      description: `<@&${panel.discord_role_id}> is yours.`,
      color: COLOR_SUCCESS,
    });
  }

  if (action === "hwid") {
    const { error } = await supabaseAdmin
      .from("license_keys")
      .update({ hwid: null })
      .eq("discord_id", discordId)
      .eq("user_id", panel.user_id);
    if (error) return errorReply(error.message);
    return embedReply({
      title: "⚙️ HWID reset",
      description: "Run the script again to lock a new HWID.",
      color: COLOR_SUCCESS,
    });
  }

  if (action === "stats") {
    const [{ count: keys }, { count: wls }] = await Promise.all([
      supabaseAdmin
        .from("license_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", panel.user_id),
      supabaseAdmin
        .from("whitelists")
        .select("id", { count: "exact", head: true })
        .eq("user_id", panel.user_id),
    ]);
    const { data: script } = panel.script_id
      ? await supabaseAdmin
          .from("scripts")
          .select("name, run_count")
          .eq("id", panel.script_id)
          .maybeSingle()
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
  const key = String(body.data?.components?.[0]?.components?.[0]?.value ?? "").trim();
  if (!key) return errorReply("No key provided");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: panel } = await supabaseAdmin
    .from("panels")
    .select("*")
    .eq("id", panelId)
    .maybeSingle();
  if (!panel) return errorReply("This panel no longer exists");

  const { data: lic } = await supabaseAdmin
    .from("license_keys")
    .select("*")
    .eq("key", key)
    .maybeSingle();
  if (!lic || lic.user_id !== panel.user_id) return errorReply("Invalid key");
  if (lic.revoked) return errorReply("This key has been revoked");
  if (lic.expires_at && new Date(lic.expires_at) < new Date())
    return errorReply("This key has expired");
  if (lic.discord_id && lic.discord_id !== discordId)
    return errorReply("This key is already bound to another user");

  const scriptId = lic.script_id ?? panel.script_id;
  await supabaseAdmin
    .from("license_keys")
    .update({ discord_id: discordId, script_id: scriptId })
    .eq("id", lic.id);
  if (scriptId) {
    await supabaseAdmin.from("whitelists").insert({
      user_id: panel.user_id,
      script_id: scriptId,
      discord_id: discordId,
      license_key_id: lic.id,
      expires_at: lic.expires_at,
    });
  }

  if (panel.discord_role_id && body.guild_id && process.env.DISCORD_BOT_TOKEN) {
    await fetch(
      `https://discord.com/api/v10/guilds/${body.guild_id}/members/${discordId}/roles/${panel.discord_role_id}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      },
    ).catch(() => undefined);
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
  return new Response(JSON.stringify(v), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function originFromEnv() {
  let base = (process.env.PUBLIC_BASE_URL || "https://luamore.app").trim();
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base.replace(/\/+$/, "");
}
function randomKey() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, "")
    .slice(0, 20);
  return `LM-${b64.slice(0, 4)}-${b64.slice(4, 12)}-${b64.slice(12, 20)}`;
}

async function getProfileByDiscord(discordId?: string) {
  if (!discordId) return null;
  const { getDiscordSession } = await import("@/lib/discord-auth-store.server");
  const session = getDiscordSession(discordId);
  if (session?.userId) {
    return {
      id: session.userId,
      email: session.email || null,
      display_name: session.username || "User",
      discord_id: discordId,
      plan: "free",
      max_scripts: 999999999,
      max_panels: 999999999,
      is_banned: false,
      created_at: session.linkedAt,
      updated_at: session.linkedAt,
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("discord_id", discordId)
    .maybeSingle();
  return data;
}

async function linkDiscord(
  discordId: string,
  apiKey: string,
): Promise<{ success: boolean; username?: string; error?: string }> {
  const cleanKey = apiKey
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["'`]|["'`]$/g, "")
    .trim();
  if (!cleanKey) return { success: false, error: "Empty API key provided" };

  const { verifySignedApiKey, setDiscordSession } = await import("@/lib/discord-auth-store.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let targetUserId: string | null = null;
  let keyId: string | null = null;

  // 1. Try verifying HMAC signed API key generated by the dashboard
  const signedUserId = verifySignedApiKey(cleanKey);
  if (signedUserId) {
    targetUserId = signedUserId;
  }

  // 2. Try matching sha256 hash in database
  if (!targetUserId) {
    const hash = await sha256Hex(cleanKey);
    const { data: keyRow } = await supabaseAdmin
      .from("api_keys")
      .select("id, user_id, key_hash")
      .eq("key_hash", hash)
      .maybeSingle();

    if (keyRow?.user_id) {
      targetUserId = keyRow.user_id;
      keyId = keyRow.id;
    }
  }

  // 3. Fallback: check if cleanKey is a Supabase JWT token
  if (!targetUserId && cleanKey.includes(".")) {
    try {
      const { data: userData } = await supabaseAdmin.auth.getUser(cleanKey);
      if (userData?.user?.id) {
        targetUserId = userData.user.id;
      }
    } catch {
      /* ignore */
    }
  }

  if (!targetUserId) {
    return {
      success: false,
      error:
        "Invalid or unrecorded API key.\n\n" +
        "Please visit **https://luamore.app/dashboard/api-keys**, click **Generate Key**, copy the new key, and run `/login api_key:<key>` in Discord.\n\n" +
        "Alternatively, you can run `/login email:<your_email> password:<your_password>`.",
    };
  }

  // Update last_used_at on the key if found in DB
  if (keyId) {
    void supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId);
  }

  // Fetch profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, display_name, email, discord_id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (profile) {
    await supabaseAdmin.from("profiles").update({ discord_id: discordId }).eq("id", targetUserId);
  }

  const username = profile?.display_name || profile?.email || "LuaMore User";

  // Persist session in discord store
  setDiscordSession(discordId, {
    userId: targetUserId,
    discordId,
    email: profile?.email ?? undefined,
    username,
    linkedAt: new Date().toISOString(),
  });

  return { success: true, username };
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

const HELP_TEXT = ["**📖 LuaMore Commands**", "", "**📜 Scripts**", "`/create-script` — Create a new script", "`/loader` — Get your script loader", "", "**📋 Panels**", "`/panel` — Send a panel to this channel", "", "**🔑 Keys**", "`/generatekey` — Generate a key", "`/deletekey` — Delete a key", "`/keys` — List recent keys", "", "**👤 Whitelist**", "`/whitelist` — Grant script access", "`/blacklist` — Revoke script access", "", "**🔧 HWID**", "`/resethwid` — Reset your HWID", "`/forceresethwid` — Force reset (owner)", "`/banhwid` — Ban an HWID", "`/unbanhwid` — Unban an HWID", "", "**🛡️ Admin**", "`/banuser` — Ban website access (owner)", "`/unbanuser` — Restore website access (owner)", "", "**ℹ️ Other**", "`/setup` — Setup guide", "`/help` — This menu"].join("\n");
