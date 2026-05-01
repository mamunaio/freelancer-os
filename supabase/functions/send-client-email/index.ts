// @ts-nocheck
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface Payload {
  client_id: string;
  template_id?: string | null;
  to: string;
  subject: string;
  body: string;
  from?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    if (!payload?.to || !payload?.subject || !payload?.body || !payload?.client_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: to, subject, body, client_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    let status = "sent";
    let errorMsg: string | null = null;

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      // Resend connector not yet linked — log as a draft so the UI flow still works.
      status = "draft";
      errorMsg = "Resend connector not configured. Email saved as draft. Connect Resend in workspace settings to enable sending.";
    } else {
      try {
        const resp = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: payload.from || "Injaazh OS <onboarding@resend.dev>",
            to: [payload.to],
            subject: payload.subject,
            html: payload.body.replace(/\n/g, "<br/>"),
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          status = "failed";
          errorMsg = `Resend [${resp.status}]: ${text.slice(0, 500)}`;
        }
      } catch (e) {
        status = "failed";
        errorMsg = e instanceof Error ? e.message : "Unknown send error";
      }
    }

    // Log every attempt
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { error: logErr } = await service.from("email_log").insert({
      client_id: payload.client_id,
      template_id: payload.template_id ?? null,
      to_email: payload.to,
      subject: payload.subject,
      body: payload.body,
      status,
      error: errorMsg,
    });
    if (logErr) console.error("email_log insert failed", logErr);

    return new Response(JSON.stringify({ status, error: errorMsg }), {
      status: status === "failed" ? 502 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-client-email error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
