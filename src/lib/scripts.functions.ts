import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ENGINE_NAME } from "@/lib/obfuscator.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getAllScripts,
  getScriptById,
  saveScript as saveScriptToStore,
  deleteScriptById,
  generatePublicId,
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
      const map = new Map<string, Record<string, unknown>>();
      for (const item of localList) map.set(item.id, item as unknown as Record<string, unknown>);
      for (const item of data) {
        map.set(item.id, {
          ...map.get(item.id),
          ...(item as unknown as Record<string, unknown>),
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
    let script: Record<string, unknown> | null = null;
    let releases: Record<string, unknown>[] = [];

    try {
      const { data: dbScript } = await context.supabase
        .from("scripts")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .maybeSingle();

      if (dbScript) {
        script = dbScript as unknown as Record<string, unknown>;
        const { data: rels } = await context.supabase
          .from("script_releases")
          .select("*")
          .eq("script_id", data.id)
          .order("version", { ascending: false });
        releases = (rels ?? []) as unknown as Record<string, unknown>[];
      }
    } catch {
      // ignore
    }

    if (!script) {
      const local = getScriptById(data.id, context.userId);
      if (!local) throw new Error("Script not found");
      script = local as unknown as Record<string, unknown>;
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
      autoObfuscate?: boolean;
    }) =>
      z
        .object({
          ...metaShape,
          code: z.string().max(1_000_000_000).optional(),
          autoObfuscate: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    let row: Record<string, unknown> | null = null;
    const publicId = generatePublicId();

    let obfuscated_code: string | undefined = undefined;
    let is_protected = false;
    if (data.autoObfuscate !== false && data.code && data.code.trim().length > 0) {
      try {
        const { obfuscateLua } = await import("@/lib/obfuscator.server");
        obfuscated_code = obfuscateLua(data.code);
        is_protected = true;
      } catch {
        // fallback to unprotected if obfuscator has syntax issue
      }
    }

    try {
      const { data: dbRow } = await context.supabase
        .from("scripts")
        .insert({
          name: data.name,
          public_id: publicId,
          code: data.code ?? "",
          obfuscated_code: obfuscated_code ?? null,
          is_protected,
          ffa: data.ffa ?? false,
          description: data.description ?? null,
          category: data.category ?? null,
          tags: data.tags ?? [],
          user_id: context.userId,
        })
        .select("*")
        .maybeSingle();
      if (dbRow) row = dbRow as unknown as Record<string, unknown>;
    } catch {
      // ignore
    }

    // Always persist to local store to guarantee durability
    const saved = saveScriptToStore({
      id: row?.id as string | undefined,
      user_id: context.userId,
      public_id: (row?.public_id as string | undefined) || publicId,
      name: data.name,
      code: data.code ?? "",
      obfuscated_code,
      ffa: data.ffa ?? false,
      description: data.description ?? null,
      category: data.category ?? null,
      tags: data.tags ?? [],
      is_active: true,
      is_protected,
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
      autoObfuscate?: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid(),
          ...metaShape,
          name: metaShape.name.optional(),
          code: z.string().max(1_000_000_000).optional(),
          is_protected: z.boolean().optional(),
          autoObfuscate: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, autoObfuscate, ...rest } = data;
    const patch: Partial<StoredScript> = { ...rest };

    const shouldObfuscate =
      (autoObfuscate || rest.is_protected) && typeof rest.code === "string" && rest.code.length > 0;
    if (shouldObfuscate && rest.code) {
      const { obfuscateLua } = await import("@/lib/obfuscator.server");
      patch.obfuscated_code = obfuscateLua(rest.code);
      patch.obfuscator = ENGINE_NAME;
      patch.is_protected = true;
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

    return { ok: true, is_protected: patch.is_protected, obfuscated_code: patch.obfuscated_code };
  });

export const obfuscateScriptNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; code?: string }) =>
    z
      .object({ id: z.string().uuid(), code: z.string().max(1_000_000_000).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let sourceCode = data.code || "";

    if (!sourceCode) {
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
    }

    if (!sourceCode) {
      const local = getScriptById(data.id, context.userId);
      if (local?.code) sourceCode = local.code;
    }

    if (!sourceCode) throw new Error("No source code to obfuscate");

    const { analyzeObfuscation } = await import("@/lib/obfuscator.server");
    const analysis = analyzeObfuscation(sourceCode);
    const obfuscated_code = analysis.code;

    try {
      await context.supabase
        .from("scripts")
        .update({
          ...(data.code ? { code: data.code } : {}),
          obfuscated_code,
          obfuscator: ENGINE_NAME,
          is_protected: true,
        })
        .eq("id", data.id)
        .eq("user_id", context.userId);
    } catch {
      // ignore
    }

    saveScriptToStore({
      id: data.id,
      user_id: context.userId,
      name: "Obfuscated Script",
      ...(data.code ? { code: data.code } : {}),
      obfuscated_code,
      obfuscator: ENGINE_NAME,
      is_protected: true,
    });

    return {
      ok: true,
      size: obfuscated_code.length,
      obfuscated_code,
      entropy: analysis.entropy,
      originalSize: analysis.originalSize,
      compressedSize: analysis.compressedSize,
    };
  });

export const obfuscateSourceCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) =>
    z.object({ code: z.string().min(1).max(1_000_000_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { analyzeObfuscation } = await import("@/lib/obfuscator.server");
    return analyzeObfuscation(data.code);
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
const obfuscationSettingsSchema = {
  encryptStrings: z.boolean().optional(),
  proxifyLocals: z.boolean().optional(),
  proxifyFunctions: z.boolean().optional(),
  antiTamper: z.boolean().optional(),
  antiHook: z.boolean().optional(),
  antiLogger: z.boolean().optional(),
  controlFlowFlattening: z.boolean().optional(),
  isLuauRuntime: z.boolean().optional(),
  polymorphicVM: z.boolean().optional(),
  loaderVMDepth: z.number().int().min(1).max(5).optional(),
};

export const obfuscateCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      code: string;
      mode?: string;
      dualVm?: boolean;
      oeldAntiTamper?: boolean;
      chunkedLoader?: boolean;
    } & { [K in keyof typeof obfuscationSettingsSchema]?: unknown }) =>
      z
        .object({
          code: z.string().min(1).max(1_000_000_000),
          mode: z.string().optional(),
          dualVm: z.boolean().optional(),
          oeldAntiTamper: z.boolean().optional(),
          chunkedLoader: z.boolean().optional(),
          ...obfuscationSettingsSchema,
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { analyzeObfuscation } = await import("@/lib/obfuscator.server");
    const depth = data.loaderVMDepth ?? (data.dualVm === false ? 1 : data.dualVm ? 2 : 1);
    const analysis = analyzeObfuscation(data.code, {
      mode: data.mode,
      encryptStrings: data.encryptStrings,
      proxifyLocals: data.proxifyLocals,
      proxifyFunctions: data.proxifyFunctions,
      antiTamper: data.antiTamper ?? data.oeldAntiTamper,
      antiHook: data.antiHook,
      antiLogger: data.antiLogger,
      controlFlowFlattening: data.controlFlowFlattening,
      isLuauRuntime: data.isLuauRuntime,
      polymorphicVM: data.polymorphicVM,
      loaderVMDepth: depth,
      chunkedLoader: data.chunkedLoader,
    });
    return {
      obfuscated: analysis.code,
      size: analysis.size,
      sourceSize: data.code.length,
      entropy: analysis.entropy,
      layers: analysis.layers,
      mode: analysis.mode,
      loaderVMDepth: depth,
      dualVm: depth >= 2,
    };
  });

// Public demo obfuscator for web playground (unauthenticated)
export const obfuscatePublicCode = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      code: string;
      dualVm?: boolean;
      mode?: string;
      oeldAntiTamper?: boolean;
      chunkedLoader?: boolean;
    } & { [K in keyof typeof obfuscationSettingsSchema]?: unknown }) =>
      z
        .object({
          code: z.string().min(1).max(500_000),
          dualVm: z.boolean().optional(),
          mode: z.string().optional(),
          oeldAntiTamper: z.boolean().optional(),
          chunkedLoader: z.boolean().optional(),
          ...obfuscationSettingsSchema,
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    const { analyzeObfuscation } = await import("@/lib/obfuscator.server");
    const depth = data.loaderVMDepth ?? (data.dualVm === false ? 1 : data.dualVm ? 2 : 1);
    const analysis = analyzeObfuscation(data.code, {
      mode: data.mode,
      encryptStrings: data.encryptStrings,
      proxifyLocals: data.proxifyLocals,
      proxifyFunctions: data.proxifyFunctions,
      antiTamper: data.antiTamper ?? data.oeldAntiTamper,
      antiHook: data.antiHook,
      antiLogger: data.antiLogger,
      controlFlowFlattening: data.controlFlowFlattening,
      isLuauRuntime: data.isLuauRuntime,
      polymorphicVM: data.polymorphicVM,
      loaderVMDepth: depth,
      chunkedLoader: data.chunkedLoader,
    });
    return {
      obfuscated: analysis.code,
      size: analysis.size,
      sourceSize: data.code.length,
      entropy: analysis.entropy,
      layers: analysis.layers,
      mode: analysis.mode,
      loaderVMDepth: depth,
      dualVm: depth >= 2,
    };
  });
