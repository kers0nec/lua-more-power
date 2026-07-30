import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { obfuscateWithLarph, validateWithLarph, type LarphMode } from "./larph.server";

const modeSchema = z.enum(["light", "standard", "advanced"]).default("standard");

// Public demo endpoint (no auth) — light-weight preview on the marketing site.
export const obfuscateDemo = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; mode?: LarphMode }) =>
    z.object({ code: z.string().min(1).max(20_000), mode: modeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const result = await obfuscateWithLarph(data.code, data.mode);
    return { obfuscatedCode: result.output, protected: result.protected, hash: result.hash };
  });

export const validateSyntax = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => z.object({ code: z.string().min(1).max(200_000) }).parse(input))
  .handler(async ({ data }) => validateWithLarph(data.code));

export const obfuscatePreview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string; mode?: LarphMode }) =>
    z.object({ code: z.string().min(1).max(200_000), mode: modeSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const result = await obfuscateWithLarph(data.code, data.mode);
    return { obfuscatedCode: result.output, protected: result.protected, hash: result.hash };
  });

export const obfuscateScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scriptId: string; mode?: LarphMode }) =>
    z.object({ scriptId: z.string().uuid(), mode: modeSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: script, error } = await supabase
      .from("scripts")
      .select("id, code, name")
      .eq("id", data.scriptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!script) throw new Error("Script not found");

    const result = await obfuscateWithLarph(script.code || "", data.mode);
    const obfuscator = `larph-${data.mode}`;

    const { error: upErr } = await supabase
      .from("scripts")
      .update({
        obfuscated_code: result.output,
        obfuscator,
        larph_hash: result.hash,
        is_protected: result.protected,
      })
      .eq("id", script.id);
    if (upErr) throw new Error(upErr.message);

    // insert a release row (version = count + 1)
    const { count } = await supabase
      .from("script_releases")
      .select("id", { count: "exact", head: true })
      .eq("script_id", script.id);
    await supabase.from("script_releases").insert({
      script_id: script.id,
      user_id: userId,
      version: (count ?? 0) + 1,
      obfuscated_code: result.output,
      obfuscator,
      larph_hash: result.hash,
      is_protected: result.protected,
      note: `${data.mode} obfuscation via Larph`,
    });

    return {
      obfuscatedCode: result.output,
      protected: result.protected,
      hash: result.hash,
    };
  });
