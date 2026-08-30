import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scripts")
      .select("id, name, public_id, ffa, description, category, tags, is_active, is_protected, run_count, last_run_at, updated_at, created_at")
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
    if (!script) throw new Error("Script not found");
    const { data: releases, error: releaseError } = await context.supabase
      .from("script_releases")
      .select("*")
      .eq("script_id", data.id)
      .eq("user_id", context.userId)
      .order("version", { ascending: false });
    if (releaseError) throw new Error(releaseError.message);
    return { script, releases: releases ?? [] };
  });

export const createScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; code?: string; ffa?: boolean; description?: string; category?: string; tags?: string[] }) => z.object({
    name: z.string().trim().min(1).max(120),
    code: z.string().max(25_000_000).optional(),
    ffa: z.boolean().optional(),
    description: z.string().max(2000).optional(),
    category: z.string().max(60).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("scripts").insert({
      user_id: context.userId,
      name: data.name,
      code: data.code ?? "",
      ffa: data.ffa ?? false,
      description: data.description ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
    }).select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Script could not be created");
    return row;
  });

export const updateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name?: string; code?: string; ffa?: boolean; description?: string; category?: string; tags?: string[]; is_active?: boolean; is_protected?: boolean }) => z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120).optional(),
    code: z.string().max(25_000_000).optional(),
    ffa: z.boolean().optional(),
    description: z.string().max(2000).optional(),
    category: z.string().max(60).optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
    is_active: z.boolean().optional(),
    is_protected: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    if (patch.code !== undefined && patch.code.trim().length === 0) {
      const { data: current } = await context.supabase.from("scripts").select("code").eq("id", id).eq("user_id", context.userId).maybeSingle();
      if (current?.code?.trim()) throw new Error("Refusing to overwrite saved source with an empty editor.");
    }
    const update = {
      name: patch.name,
      code: patch.code,
      ffa: patch.ffa,
      description: patch.description,
      category: patch.category,
      tags: patch.tags,
      is_active: patch.is_active,
      is_protected: patch.is_protected,
      obfuscated_code: undefined as string | undefined,
      obfuscator: undefined as string | undefined,
    };
    if (patch.is_protected && typeof patch.code === "string" && patch.code.length > 0) {
      const { obfuscateLua } = await import("@/lib/obfuscator.server");
      update.obfuscated_code = obfuscateLua(patch.code);
      update.obfuscator = "luamore-v12";
    }
    const { error } = await context.supabase.from("scripts").update(update).eq("id", id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const obfuscateScriptNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("scripts").select("id, code").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.code?.trim()) throw new Error("No source code to protect");
    const { obfuscateLua } = await import("@/lib/obfuscator.server");
    const obfuscatedCode = obfuscateLua(row.code);
    const { error: updateError } = await context.supabase.from("scripts").update({ obfuscated_code: obfuscatedCode, obfuscator: "luamore-v12", is_protected: true }).eq("id", data.id).eq("user_id", context.userId);
    if (updateError) throw new Error(updateError.message);
    return { ok: true, size: obfuscatedCode.length };
  });

export const deleteScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scripts").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const obfuscateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; dualVm?: boolean; encryptStrings?: boolean; proxifyLocals?: boolean; proxifyFunctions?: boolean; antiTamper?: boolean; controlFlowFlattening?: boolean; isLuauRuntime?: boolean; loaderVMDepth?: number; polymorphicVM?: boolean }) => z.object({
    code: z.string().min(1).max(25_000_000),
    dualVm: z.boolean().optional(),
    encryptStrings: z.boolean().optional(),
    proxifyLocals: z.boolean().optional(),
    proxifyFunctions: z.boolean().optional(),
    antiTamper: z.boolean().optional(),
    controlFlowFlattening: z.boolean().optional(),
    isLuauRuntime: z.boolean().optional(),
    loaderVMDepth: z.number().int().min(1).max(5).optional(),
    polymorphicVM: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const { obfuscateLuaWithOptions } = await import("@/lib/obfuscator.server");
    const { code, ...options } = data;
    const obfuscated = obfuscateLuaWithOptions(code, options);
    return { obfuscated, size: obfuscated.length, sourceSize: code.length, dualVm: options.dualVm ?? true, loaderVMDepth: options.loaderVMDepth, polymorphicVM: options.polymorphicVM ?? false };
  });
