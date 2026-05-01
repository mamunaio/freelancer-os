// Streams a Gemini-generated proposal draft as Server-Sent Events via Lovable AI Gateway.
// Body: { project_name, client_name, tech_stack: string[], budget, currency, valid_until }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are an expert freelance proposal writer.
Output a polished, persuasive freelance project proposal in clean HTML (h1/h2/h3, p, ul/li, strong) — NOT markdown, NO <html>/<body>/<head> wrappers, NO code fences.
Use these exact section headings (h2):
1. Executive Summary
2. Scope of Work
3. Deliverables
4. Timeline
5. Investment
6. Terms

Tone: confident, professional, client-focused. Use bullets for deliverables and timeline phases.
In "Investment", state the price clearly and what's included.
In "Terms", cover payment schedule (50% upfront / 50% on delivery), revisions, and validity.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server not configured");

    // Auth: admin only
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser(jwt);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const projectName = String(body.project_name ?? "Untitled Project").slice(0, 200);
    const clientName = String(body.client_name ?? "the client").slice(0, 200);
    const techStack: string[] = Array.isArray(body.tech_stack) ? body.tech_stack.slice(0, 30) : [];
    const budget = Number(body.budget ?? 0);
    const currency = String(body.currency ?? "USD").slice(0, 6);
    const validUntil = body.valid_until ? String(body.valid_until).slice(0, 20) : null;
    const description = body.description ? String(body.description).slice(0, 2000) : "";

    const userPrompt = `Write a freelance project proposal with these details:

- Project: ${projectName}
- Client: ${clientName}
- Tech stack: ${techStack.length ? techStack.join(", ") : "to be defined"}
- Investment: ${currency} ${budget.toLocaleString()}
${validUntil ? `- Valid until: ${validUntil}` : ""}
${description ? `- Project context: ${description}` : ""}

Open the Executive Summary by addressing ${clientName} directly. Tailor scope and deliverables to the tech stack.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Lovable AI error:", aiResp.status, t);
      const status =
        aiResp.status === 429 ? 429 :
        aiResp.status === 402 ? 402 : 500;
      const message =
        aiResp.status === 429 ? "Rate limit reached. Try again shortly." :
        aiResp.status === 402 ? "AI credits exhausted. Add funds in Settings → Workspace → Usage." :
        `Gemini unavailable (${aiResp.status})`;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-proposal-draft error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
