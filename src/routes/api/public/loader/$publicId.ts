import { createFileRoute } from "@tanstack/react-router";

// Public loader endpoint. Returns the hosted script source for a public_id.
// If a `key` query param is supplied it is validated against license_keys and
// the calling HWID (query `hwid`) is locked on first use.
//
//   GET /api/public/loader/<public_id>
//   GET /api/public/loader/<public_id>?key=LM-...&hwid=abc123
//
// Scripts marked FFA return the code without a key.

export const Route = createFileRoute("/api/public/loader/$publicId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const key = url.searchParams.get("key")?.trim() || null;
        const hwid = url.searchParams.get("hwid")?.trim() || null;

        const { data: script, error } = await supabaseAdmin
          .from("scripts")
          .select("id, user_id, name, code, ffa, public_id, is_active, run_count")
          .eq("public_id", params.publicId)
          .maybeSingle();
        if (error || !script) return luaError("Script not found");
        if (!script.is_active) return luaError("Script is disabled");
        if (!script.code) return luaError("Script has no code yet");

        const bumpRuns = () =>
          supabaseAdmin
            .from("scripts")
            .update({ run_count: (script.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
            .eq("id", script.id);


        if (script.ffa) {
          await bumpRuns();
          return lua(script.code);
        }


        if (!key) return luaError("License key required");

        const { data: lic } = await supabaseAdmin
          .from("license_keys")
          .select("*")
          .eq("key", key)
          .maybeSingle();
        if (!lic) return luaError("Invalid key");
        if (lic.revoked) return luaError("Key revoked");
        if (lic.script_id && lic.script_id !== script.id) return luaError("Key not valid for this script");
        if (lic.expires_at && new Date(lic.expires_at) < new Date()) return luaError("Key expired");

        // HWID handling
        if (hwid) {
          const { data: banned } = await supabaseAdmin
            .from("hwid_bans")
            .select("id")
            .eq("user_id", script.user_id)
            .eq("hwid", hwid)
            .maybeSingle();
          if (banned) return luaError("HWID banned");

          if (!lic.hwid) {
            await supabaseAdmin.from("license_keys").update({ hwid }).eq("id", lic.id);
          } else if (lic.hwid !== hwid) {
            return luaError("HWID mismatch — reset your HWID first");
          }
        }

        await bumpRuns();
        return lua(script.code);

      },
    },
  },
});

function lua(body: string) {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
function luaError(msg: string) {
  const escaped = msg.replace(/"/g, '\\"');
  return new Response(`error("[LuaMore] ${escaped}")`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
