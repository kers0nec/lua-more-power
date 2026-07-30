import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomKey(prefix = "LM") {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 24);
  return `${prefix}-${b64.slice(0, 4)}-${b64.slice(4, 12)}-${b64.slice(12, 20)}`;
}

export const listKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("license_keys")
      .select("id, key, script_id, panel_id, discord_id, hwid, note, expires_at, revoked, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const generateKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scriptId?: string; panelId?: string; hours?: number; note?: string; discordId?: string }) =>
    z
      .object({
        scriptId: z.string().uuid().optional(),
        panelId: z.string().uuid().optional(),
        hours: z.number().int().min(0).max(24 * 365).optional(),
        note: z.string().max(200).optional(),
        discordId: z.string().max(64).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const key = randomKey();
    const expires_at = data.hours && data.hours > 0 ? new Date(Date.now() + data.hours * 3_600_000).toISOString() : null;
    const { data: row, error } = await context.supabase
      .from("license_keys")
      .insert({
        user_id: context.userId,
        key,
        script_id: data.scriptId ?? null,
        panel_id: data.panelId ?? null,
        discord_id: data.discordId ?? null,
        hours_valid: data.hours ?? null,
        note: data.note ?? null,
        expires_at,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row!;
  });

export const generateBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { size: number; scriptId?: string; panelId?: string; hours?: number; note?: string }) =>
    z
      .object({
        size: z.number().int().min(1).max(500),
        scriptId: z.string().uuid().optional(),
        panelId: z.string().uuid().optional(),
        hours: z.number().int().min(0).max(24 * 365).optional(),
        note: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: batch } = await context.supabase
      .from("key_batches")
      .insert({
        user_id: context.userId,
        size: data.size,
        script_id: data.scriptId ?? null,
        panel_id: data.panelId ?? null,
        hours_valid: data.hours ?? null,
        note: data.note ?? null,
      })
      .select("id")
      .maybeSingle();

    const rows = Array.from({ length: data.size }, () => ({
      user_id: context.userId,
      key: randomKey(),
      script_id: data.scriptId ?? null,
      panel_id: data.panelId ?? null,
      batch_id: batch?.id ?? null,
      hours_valid: data.hours ?? null,
      note: data.note ?? null,
      expires_at: data.hours && data.hours > 0 ? new Date(Date.now() + data.hours * 3_600_000).toISOString() : null,
    }));

    const { data: inserted, error } = await context.supabase
      .from("license_keys")
      .insert(rows)
      .select("key");
    if (error) throw new Error(error.message);
    return { keys: inserted?.map((k) => k.key) ?? [], batchId: batch?.id };
  });

export const deleteKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; key?: string }) =>
    z.object({ id: z.string().uuid().optional(), key: z.string().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const q = context.supabase.from("license_keys").delete().eq("user_id", context.userId);
    if (data.id) q.eq("id", data.id);
    else if (data.key) q.eq("key", data.key);
    else throw new Error("id or key required");
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
