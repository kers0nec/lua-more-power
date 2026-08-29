/* ============================================================
   LuaMore · Supabase client
   Real auth + real profiles, talking to the project's Supabase
   backend directly from the browser (publishable key, same one
   the dashboard app uses).
   ============================================================ */
(function () {
  window.LM_SUPABASE_URL = "https://pbuakztqfvvgooabtjkf.supabase.co";
  window.LM_SUPABASE_KEY = "sb_publishable_CO_vJ2OOKf7G6FK1KEe3Mg_77ZDDmCb";

  function boot() {
    if (!window.supabase) { window.__lmSupabaseFailed = true; return; }
    window.LMSupabase = window.supabase.createClient(window.LM_SUPABASE_URL, window.LM_SUPABASE_KEY, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true // picks up ?code= from email confirmation / reset links
      }
    });
    if (window.__lmOnSupabase) window.__lmOnSupabase(window.LMSupabase);
  }

  var s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
  s.onload = boot;
  s.onerror = function () { window.__lmSupabaseFailed = true; if (window.__lmOnSupabaseError) window.__lmOnSupabaseError(); };
  document.head.appendChild(s);
})();
