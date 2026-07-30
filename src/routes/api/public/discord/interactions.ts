import { createFileRoute } from "@tanstack/react-router";

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
      case "help": return embedReply({ title: "LuaMore Commands", description: HELP_TEXT, color: COLOR_INFO });
      case "setup": return embedReply({ title: "LuaMore Setup", description: "Visit the dashboard → Panels to create a panel with the interactive redeem/script/HWID buttons, then run `/panel <panel_id>` in the target channel.", color: COLOR_INFO });
      case "login": {
        const key = String(opts.get("api_key") ?? "");
        if (!key || !userId) return errorReply("Missing api_key");
        const linked = await linkDiscord(userId, key);
        if (!linked) return errorReply("Invalid API key");
        return embedReply({ title: "✅ Logged in", description: `Discord account linked. Use \`/limits\` to see your quota.`, color: COLOR_SUCCESS });
      }
      case "limits": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked. Use `/login <api_key>` first.");
        return embedReply({
          title: "Your limits",
          description: `**Plan:** ${profile.plan}\n**Max scripts:** ${profile.max_scripts}\n**Max panels:** ${profile.max_panels}`,
          color: COLOR_INFO,
        });
      }
      case "create-script": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked. Use `/login <api_key>` first.");
        const scriptName = String(opts.get("name") ?? "").trim();
        const code = String(opts.get("code") ?? "");
        const ffa = Boolean(opts.get("ffa") ?? false);
        if (!scriptName) return errorReply("Missing name");
        if (!code) return errorReply("Missing code");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { count } = await supabaseAdmin.from("scripts").select("id", { count: "exact", head: true }).eq("user_id", profile.id);
        if (count !== null && count >= profile.max_scripts) return errorReply(`Script limit reached (${profile.max_scripts})`);

        const { data: script, error } = await supabaseAdmin.from("scripts").insert({
          user_id: profile.id, name: scriptName, code, ffa,
        }).select("id, public_id, name").maybeSingle();
        if (error || !script) return errorReply(`Insert failed: ${error?.message ?? "unknown"}`);

        const loaderUrl = `${originFromEnv()}/api/public/loader/${script.public_id}`;
        return embedReply({
          title: "✅ Script Created Successfully",
          color: COLOR_SUCCESS,
          fields: [
            { name: "Name", value: script.name, inline: true },
            { name: "Public ID", value: script.public_id, inline: true },
            { name: "FFA", value: ffa ? "yes" : "no", inline: true },
            { name: "Loader URL", value: loaderUrl, inline: false },
          ],
          footer: { text: "LuaMore · Script Management" },
        });
      }
      case "generatekey": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const hours = Number(opts.get("hours") ?? 24);
        const panelId = String(opts.get("panel_id") ?? "");
        const key = randomKey();
        const expires = hours > 0 ? new Date(Date.now() + hours * 3_600_000).toISOString() : null;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("license_keys").insert({
          user_id: profile.id, key, panel_id: panelId || null, hours_valid: hours, expires_at: expires,
          note: String(opts.get("note") ?? "") || null,
          discord_id: String(opts.get("user") ?? "") || null,
        });
        if (error) return errorReply(error.message);
        return embedReply({ title: "🔑 Key Generated", description: `\`${key}\`\nValid: ${hours}h`, color: COLOR_SUCCESS });
      }
      case "deletekey": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const key = String(opts.get("key") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("license_keys").delete().eq("user_id", profile.id).eq("key", key);
        if (error) return errorReply(error.message);
        return embedReply({ title: "🗑 Key deleted", color: COLOR_SUCCESS });
      }
      case "keys": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const q = supabaseAdmin.from("license_keys").select("key, expires_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(10);
        const panelId = String(opts.get("panel_id") ?? "");
        if (panelId) q.eq("panel_id", panelId);
        const { data } = await q;
        return embedReply({
          title: "Your recent keys",
          description: (data ?? []).map((k) => `\`${k.key}\`${k.expires_at ? ` · expires ${k.expires_at}` : ""}`).join("\n") || "No keys",
          color: COLOR_INFO,
        });
      }
      case "loader": {
        const scriptId = String(opts.get("script_id") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: script } = await supabaseAdmin.from("scripts").select("public_id, name").eq("public_id", scriptId).maybeSingle();
        if (!script) return errorReply("Script not found");
        const url = `${originFromEnv()}/api/public/loader/${script.public_id}`;
        return embedReply({ title: `Loader · ${script.name}`, description: `\`\`\`lua\nloadstring(game:HttpGet("${url}?key=YOUR_KEY&hwid="..game:GetService('RbxAnalyticsService'):GetClientId()))()\n\`\`\``, color: COLOR_INFO });
      }
      case "resethwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("license_keys").update({ hwid: null }).eq("user_id", profile.id).eq("discord_id", userId);
        return embedReply({ title: "⚙️ HWID reset", color: COLOR_SUCCESS });
      }
      case "forceresethwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const target = String(opts.get("user") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("license_keys").update({ hwid: null }).eq("user_id", profile.id).eq("discord_id", target);
        return embedReply({ title: `⚙️ HWID reset for ${target}`, color: COLOR_SUCCESS });
      }
      case "banhwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const hwid = String(opts.get("hwid") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("hwid_bans").insert({ user_id: profile.id, hwid, reason: String(opts.get("reason") ?? "") || null });
        return embedReply({ title: "🚫 HWID banned", color: COLOR_WARN });
      }
      case "unbanhwid": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const hwid = String(opts.get("hwid") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("hwid_bans").delete().eq("user_id", profile.id).eq("hwid", hwid);
        return embedReply({ title: "✅ HWID unbanned", color: COLOR_SUCCESS });
      }
      case "banuser": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const discordId = String(opts.get("discord_id") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("user_bans").insert({ user_id: profile.id, discord_id: discordId, reason: String(opts.get("reason") ?? "") || null });
        return embedReply({ title: `🚫 User ${discordId} banned`, color: COLOR_WARN });
      }
      case "unbanuser": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const discordId = String(opts.get("discord_id") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("user_bans").delete().eq("user_id", profile.id).eq("discord_id", discordId);
        return embedReply({ title: "✅ User unbanned", color: COLOR_SUCCESS });
      }
      case "whitelist": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const scriptPublicId = String(opts.get("script_id") ?? "");
        const target = String(opts.get("user") ?? "");
        const duration = Number(opts.get("duration") ?? 0);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: script } = await supabaseAdmin.from("scripts").select("id").eq("public_id", scriptPublicId).eq("user_id", profile.id).maybeSingle();
        if (!script) return errorReply("Script not found");
        const key = randomKey();
        const expires = duration > 0 ? new Date(Date.now() + duration * 3_600_000).toISOString() : null;
        const { data: lic } = await supabaseAdmin.from("license_keys").insert({
          user_id: profile.id, script_id: script.id, key, discord_id: target, hours_valid: duration, expires_at: expires,
        }).select("id").maybeSingle();
        await supabaseAdmin.from("whitelists").insert({
          user_id: profile.id, script_id: script.id, discord_id: target, license_key_id: lic?.id, expires_at: expires,
        });
        return embedReply({ title: "✅ Whitelisted", description: `<@${target}> · key \`${key}\``, color: COLOR_SUCCESS });
      }
      case "blacklist": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const scriptPublicId = String(opts.get("script_id") ?? "");
        const target = String(opts.get("user") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: script } = await supabaseAdmin.from("scripts").select("id").eq("public_id", scriptPublicId).eq("user_id", profile.id).maybeSingle();
        if (!script) return errorReply("Script not found");
        await supabaseAdmin.from("whitelists").delete().eq("script_id", script.id).eq("discord_id", target);
        await supabaseAdmin.from("license_keys").update({ revoked: true }).eq("script_id", script.id).eq("discord_id", target);
        return embedReply({ title: "🚫 Blacklisted", color: COLOR_WARN });
      }
      case "panel": {
        const profile = await getProfileByDiscord(userId);
        if (!profile) return errorReply("Account not linked");
        const panelId = String(opts.get("panel_id") ?? "");
        const scriptPublicId = String(opts.get("script_id") ?? "");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let panel: any = null;

        if (panelId) {
          const { data } = await supabaseAdmin.from("panels").select("*").eq("id", panelId).eq("user_id", profile.id).maybeSingle();
          panel = data;
        } else if (scriptPublicId) {
          const { data: script } = await supabaseAdmin
            .from("scripts").select("id, name, description")
            .eq("public_id", scriptPublicId).eq("user_id", profile.id).maybeSingle();
          if (!script) return errorReply("Script not found — pass its public ID");
          const { data: existing } = await supabaseAdmin
            .from("panels").select("*").eq("user_id", profile.id).eq("script_id", script.id).maybeSingle();
          if (existing) {
            panel = existing;
          } else {
            const { data: created, error: createErr } = await supabaseAdmin.from("panels").insert({
              user_id: profile.id,
              script_id: script.id,
              name: String(opts.get("name") ?? "") || script.name,
              description: String(opts.get("description") ?? "") || script.description || null,
              channel_id: body.channel_id ?? null,
              whitelist_channel_id: body.channel_id ?? null,
            }).select("*").maybeSingle();
            if (createErr || !created) return errorReply(createErr?.message ?? "Could not create panel");
            panel = created;
          }
        } else {
          return errorReply("Provide `script_id` (script public ID) or `panel_id`");
        }

        if (!panel) return errorReply("Panel not found");

        // Remember the channel this panel lives in (used by whitelist messages).
        if (body.channel_id && panel.channel_id !== body.channel_id) {
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

      default: return errorReply(`Unknown command: ${name}`);
    }
  } catch (e) {
    return errorReply(e instanceof Error ? e.message : "Command failed");
  }
}

async function handleComponent(body: any) {
  const cid = String(body.data?.custom_id ?? "");
  const [, action] = cid.split(":");
  if (action === "redeem") {
    return {
      type: 9, // MODAL
      data: {
        custom_id: cid.replace(":redeem:", ":redeem-submit:"),
        title: "Redeem LuaMore Key",
        components: [{ type: 1, components: [{ type: 4, custom_id: "key", label: "License key", style: 1, required: true, min_length: 8, max_length: 64 }] }],
      },
    };
  }
  return embedReply({ title: `Action: ${action}`, description: "This button is wired — extend the handler for your workflow.", color: COLOR_INFO });
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
  "`/create-script` · create a script",
  "`/login <api_key>` · link Discord to your account",
  "`/limits` · view your quota",
  "`/panel <panel_id>` · post a panel here",
  "`/generatekey <panel_id> <hours> [note] [user]`",
  "`/whitelist <script_id> <user> [duration]`",
  "`/blacklist <script_id> <user>`",
  "`/deletekey <key>` · revoke a key",
  "`/keys [panel_id]` · list your keys",
  "`/loader <script_id>` · loader snippet",
  "`/resethwid` / `/forceresethwid`",
  "`/banhwid` / `/unbanhwid`",
  "`/banuser` / `/unbanuser`",
  "`/setup` · panel setup guide",
].join("\n");
