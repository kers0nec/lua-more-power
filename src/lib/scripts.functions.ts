import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const metaShape = {
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000).optional(),
  category: z.string().max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  is_active: z.boolean().optional(),
  ffa: z.boolean().optional(),
};

export const listScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scripts")
      .select(
        "id, name, public_id, ffa, description, category, tags, is_active, run_count, last_run_at, updated_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: script, error } = await context.supabase
      .from("scripts")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!script) throw new Error("Not found");
    const { data: releases } = await context.supabase
      .from("script_releases")
      .select("*")
      .eq("script_id", data.id)
      .order("version", { ascending: false });
    return { script, releases: releases ?? [] };
  });

export const createScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      code?: string;
      ffa?: boolean;
      description?: string;
      category?: string;
      tags?: string[];
    }) => z.object({ ...metaShape, code: z.string().max(1_000_000_000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("max_scripts")
      .eq("id", context.userId)
      .maybeSingle();
    const { count } = await context.supabase
      .from("scripts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if (profile && count !== null && count >= profile.max_scripts) {
      throw new Error(`Script limit reached (${profile.max_scripts})`);
    }
    const { data: row, error } = await context.supabase
      .from("scripts")
      .insert({
        name: data.name,
        code: data.code ?? "",
        ffa: data.ffa ?? false,
        description: data.description ?? null,
        category: data.category ?? null,
        tags: data.tags ?? [],
        user_id: context.userId,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row!;
  });

export const updateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      code?: string;
      ffa?: boolean;
      description?: string;
      category?: string;
      tags?: string[];
      is_active?: boolean;
      is_protected?: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          ...metaShape,
          name: metaShape.name.optional(),
          code: z.string().max(1_000_000_000).optional(),
          is_protected: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const patch: Partial<{
      name: string;
      code: string;
      ffa: boolean;
      description: string | null;
      category: string | null;
      tags: string[];
      is_active: boolean;
      is_protected: boolean;
      obfuscated_code: string;
      obfuscator: string;
    }> = { ...rest };
    if (rest.is_protected && typeof rest.code === "string" && rest.code.length > 0) {
      const { obfuscateLua } = await import("@/lib/obfuscator.server");
      patch.obfuscated_code = obfuscateLua(rest.code);
      patch.obfuscator = "luamore-vm-v11";
    }
    const { error } = await context.supabase
      .from("scripts")
      .update(patch)
      .eq("id", id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const obfuscateScriptNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("scripts")
      .select("id, code")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Not found");
    if (!row.code) throw new Error("No source code to obfuscate");
    const { obfuscateLua } = await import("@/lib/obfuscator.server");
    const obfuscated_code = obfuscateLua(row.code);
    const { error: upErr } = await context.supabase
      .from("scripts")
      .update({ obfuscated_code, obfuscator: "luamore-vm-v11" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, size: obfuscated_code.length };
  });

export const deleteScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("scripts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Standalone: obfuscate arbitrary code without saving it.
export const obfuscateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; dualVm?: boolean }) =>
    z
      .object({ code: z.string().min(1).max(1_000_000_000), dualVm: z.boolean().optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { obfuscateLuaWithOptions } = await import("@/lib/obfuscator.server");
    const dualVm = data.dualVm ?? true;
    const obfuscated = obfuscateLuaWithOptions(data.code, { dualVm });
    return { obfuscated, size: obfuscated.length, sourceSize: data.code.length, dualVm };
  });
