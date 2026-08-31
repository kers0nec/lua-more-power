import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listExecutionLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("execution_logs")
      .select(
        "id, script_id, key, hwid, roblox_username, roblox_user_id, place_id, ip, created_at, scripts(name)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id as string,
      script_id: r.script_id as string | null,
      script_name: (r.scripts?.name as string | undefined) ?? null,
      key: r.key as string | null,
      hwid: r.hwid as string | null,
      roblox_username: r.roblox_username as string | null,
      roblox_user_id: r.roblox_user_id as string | null,
      place_id: r.place_id as string | null,
      ip: r.ip as string | null,
      created_at: r.created_at as string,
    }));
  });
