import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listHwidBans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hwid_bans")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const banHwid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hwid: string; reason?: string }) =>
    z
      .object({ hwid: z.string().trim().min(3).max(128), reason: z.string().max(200).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("hwid_bans")
      .insert({ user_id: context.userId, hwid: data.hwid, reason: data.reason ?? null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unbanHwid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hwid: string }) => z.object({ hwid: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("hwid_bans")
      .delete()
      .eq("user_id", context.userId)
      .eq("hwid", data.hwid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetHwid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keyId: string }) => z.object({ keyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("license_keys")
      .update({ hwid: null })
      .eq("id", data.keyId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
