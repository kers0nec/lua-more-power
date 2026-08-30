import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAllScripts,
  getScriptById,
  saveScript as saveScriptToStore,
  deleteScriptById,
  type StoredScript,
} from "@/lib/scripts-store.server";

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
    const localList = getAllScripts(context.userId);
    try {
      const { data, error } = await context.supabase
        .from("scripts")
        .select(
          "id, name, public_id, ffa, description, category, tags, is_active, run_count, last_run_at, updated_at, created_at",
        )
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return localList;
      }

      // Merge remote and local
      const map = new Map<string, Record<string, any>>();
      for (const item of localList) map.set(item.id, item as unknown as Record<string, any>);
      for (const item of data) {
        map.set(item.id, {
          ...map.get(item.id),
          ...(item as unknown as Record<string, any>),
        });
      }

      return Array.from(map.values()).sort(
        (a, b) =>
          new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime(),
      );
    } catch {
      return localList;
    }
  });

export const getScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    let script: Record<string, any> | null = null;
    let releases: Record<string, any>[] = [];

    try {
      const { data: dbScript } = await context.supabase
        .from("scripts")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .maybeSingle();

      if (dbScript) {
        script = dbScript as unknown as Record<string, any>;
        const { data: rels } = await context.supabase
          .from("script_releases")
          .select("*")
          .eq("script_id", data.id)
          .order("version", { ascending: false });
        releases = (rels ?? []) as unknown as Record<string, any>[];
      }
    } catch {
      // ignore
    }

    if (!script) {
      const local = getScriptById(data.id, context.userId);
      if (!local) throw new Error("Script not found");
      script = local as unknown as Record<string, any>;
    }

    return { script, releases };
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
    let row: Record<string, any> | null = null;

    try {
      const { data: dbRow } = await context.supabase
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
      if (dbRow) row = dbRow as unknown as Record<string, any>;
    } catch {
      // ignore
    }

    // Always persist to local store to guarantee durability
    const saved = saveScriptToStore({
      id: row?.id as string | undefined,
      user_id: context.userId,
      public_id: row?.public_id as string | undefined,
      name: data.name,
      code: data.code ?? "",
      ffa: data.ffa ?? false,
      description: data.description ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
      is_active: true,
      is_protected: false,
    });

    return row || saved;
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
    const patch: Partial<StoredScript> = { ...rest };

    if (rest.is_protected && typeof rest.code === "string" && rest.code.length > 0) {
      const { obfuscateLua } = await import("@/lib/obfuscator.server");
      patch.obfuscated_code = obfuscateLua(rest.code);
      patch.obfuscator = "luamore-v12";
    }

    try {
      await context.supabase
        .from("scripts")
        .update(patch)
        .eq("id", id)
        .eq("user_id", context.userId);
    } catch {
      // ignore
    }

    // Persist to store
    saveScriptToStore({
      id,
      user_id: context.userId,
      name: rest.name || "Untitled Script",
      ...patch,
    });

    return { ok: true };
  });

export const obfuscateScriptNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    let sourceCode = "";

    try {
      const { data: row } = await context.supabase
        .from("scripts")
        .select("id, code")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (row?.code) sourceCode = row.code;
    } catch {
      // ignore
    }

    if (!sourceCode) {
      const local = getScriptById(data.id, context.userId);
      if (local?.code) sourceCode = local.code;
    }

    if (!sourceCode) throw new Error("No source code to obfuscate");

    const { obfuscateLua } = await import("@/lib/obfuscator.server");
    const obfuscated_code = obfuscateLua(sourceCode);

    try {
      await context.supabase
        .from("scripts")
        .update({ obfuscated_code, obfuscator: "luamore-v12" })
        .eq("id", data.id)
        .eq("user_id", context.userId);
    } catch {
      // ignore
    }

    saveScriptToStore({
      id: data.id,
      user_id: context.userId,
      name: "Obfuscated Script",
      obfuscated_code,
      obfuscator: "luamore-v12",
      is_protected: true,
    });

    return { ok: true, size: obfuscated_code.length };
  });

export const deleteScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    try {
      await context.supabase
        .from("scripts")
        .delete()
        .eq("id", data.id)
        .eq("user_id", context.userId);
    } catch {
      // ignore
    }

    deleteScriptById(data.id, context.userId);
    return { ok: true };
  });

// Standalone: obfuscate arbitrary code without saving it.
export const obfuscateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      code: string;
      dualVm?: boolean;
      encryptStrings?: boolean;
      proxifyLocals?: boolean;
      proxifyFunctions?: boolean;
      antiTamper?: boolean;
      controlFlowFlattening?: boolean;
      isLuauRuntime?: boolean;
      loaderVMDepth?: number;
    }) =>
      z
        .object({
          code: z.string().min(1).max(1_000_000_000),
          dualVm: z.boolean().optional(),
          encryptStrings: z.boolean().optional(),
          proxifyLocals: z.boolean().optional(),
          proxifyFunctions: z.boolean().optional(),
          antiTamper: z.boolean().optional(),
          controlFlowFlattening: z.boolean().optional(),
          isLuauRuntime: z.boolean().optional(),
          loaderVMDepth: z.number().int().min(1).max(5).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { obfuscateLuaWithOptions } = await import("@/lib/obfuscator.server");
    const { code, ...opts } = data;
    const obfuscated = obfuscateLuaWithOptions(code, opts);
    return {
      obfuscated,
      size: obfuscated.length,
      sourceSize: code.length,
      dualVm: opts.dualVm ?? true,
      loaderVMDepth: opts.loaderVMDepth,
    };
  });
