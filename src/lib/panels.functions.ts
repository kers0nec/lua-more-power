import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPanels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("panels")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string; scriptId?: string; webhookUrl?: string; roleId?: string }) =>
    z
      .object({
        name: z.string().trim().min(1).max(120),
        description: z.string().max(500).optional(),
        scriptId: z.string().uuid().optional(),
        webhookUrl: z.string().url().optional(),
        roleId: z.string().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("panels")
      .insert({
        user_id: context.userId,
        name: data.name,
        description: data.description ?? null,
        script_id: data.scriptId ?? null,
        webhook_url: data.webhookUrl ?? null,
        discord_role_id: data.roleId ?? null,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row!;
  });

export const deletePanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("panels")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Fire a Discord embed to the panel's webhook URL
export const sendPanel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: panel, error } = await context.supabase
      .from("panels")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!panel) throw new Error("Panel not found");
    if (!panel.webhook_url) throw new Error("Panel has no Discord webhook URL configured");

    const embed = {
      title: `LuaMore · ${panel.name}`,
      description: panel.description || "More Power, More Security, More Lua",
      color: 0x00aaff,
      footer: { text: "LuaMore · Script Delivery" },
      timestamp: new Date().toISOString(),
    };
    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 1, label: "🔑 Redeem Key", custom_id: `lm:redeem:${panel.id}` },
          { type: 2, style: 1, label: "📜 Get Script", custom_id: `lm:script:${panel.id}` },
          { type: 2, style: 1, label: "👤 Get Role", custom_id: `lm:role:${panel.id}` },
        ],
      },
      {
        type: 1,
        components: [
          { type: 2, style: 1, label: "⚙️ Reset HWID", custom_id: `lm:hwid:${panel.id}` },
          { type: 2, style: 2, label: "📊 Get Stats", custom_id: `lm:stats:${panel.id}` },
        ],
      },
    ];

    const res = await fetch(panel.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed], components }),
    });
    if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
    return { ok: true };
  });
