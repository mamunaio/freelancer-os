// Mints a 1-hour signed URL for a private deliverable file.
// Public endpoint — auth is the portal token (validated server-side via SECURITY DEFINER RPC).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { token, deliverable_id } = await req.json();
    if (!token || !deliverable_id) {
      return new Response(JSON.stringify({ error: "token and deliverable_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // RPC validates that this token + deliverable belong together
    const { data, error } = await supabase.rpc("get_deliverable_storage_path", {
      _token: token,
      _deliverable_id: deliverable_id,
    });
    if (error) throw error;

    const result = data as { ok: boolean; error?: string; path?: string; name?: string };
    if (!result?.ok || !result.path) {
      return new Response(JSON.stringify({ error: result?.error ?? "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await supabase
      .storage.from("project-files")
      .createSignedUrl(result.path, 3600, { download: result.name ?? undefined });
    if (signErr) throw signErr;

    return new Response(JSON.stringify({ url: signed.signedUrl, name: result.name }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
