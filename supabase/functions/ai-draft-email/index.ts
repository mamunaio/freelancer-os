// Drafts a client email with Lovable AI Gateway (google/gemini-2.5-flash).
// Body: { client_id, template: "status_update" | "meeting_summary" | "follow_up",
//         tone: "professional" | "friendly" | "direct", notes?: string }
// Returns { subject, body }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const tools = [
  {
    type: "function",
    function: {
      name: "draft_email",
      description: "Return the drafted email subject + plain-text body.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string", description: "Plain-text email body. Use \\n for line breaks. Sign off as 'Best,\\n[Your name]'." },
        },
        required: ["subject", "body"],
        additionalProperties: false,
      },
    },
  },
];

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  status_update: "Write a concise weekly status update for this client. Lead with what shipped, list 2-4 progress bullets per active project (with progress %), call out any blockers, then state next steps for the upcoming week.",
  meeting_summary: "From the user-supplied raw meeting notes, extract: (1) a 2-3 sentence summary, (2) decisions made, (3) action items with owners, and (4) next meeting/deadline. If notes mention specific people/dates use them verbatim.",
  follow_up: "Write a warm, light follow-up email. Reference the most recent project or last touchpoint. Propose a concrete next step (e.g. 15-min call next week). Keep it under 120 words.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional: "Tone: polished, professional, business-formal. Avoid emojis.",
  friendly: "Tone: warm and friendly, conversational. One emoji at most.",
  direct: "Tone: direct and concise. No fluff, no greetings beyond a name. Get to the point.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData } = await userClient.auth.getUser(jwt);
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const clientId = String(body.client_id ?? "");
    const template = String(body.template ?? "follow_up");
    const tone = String(body.tone ?? "professional");
    const notes = body.notes ? String(body.notes).slice(0, 4000) : "";

    if (!TEMPLATE_INSTRUCTIONS[template]) {
      return new Response(JSON.stringify({ error: "Invalid template" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!TONE_INSTRUCTIONS[tone]) {
      return new Response(JSON.stringify({ error: "Invalid tone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: client } = await admin.from("clients").select("name,company,email,total_revenue,status").eq("id", clientId).maybeSingle();
    if (!client) return new Response(JSON.stringify({ error: "Client not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: projects } = await admin.from("projects").select("name,status,progress,deadline").eq("client_id", clientId).order("updated_at", { ascending: false }).limit(8);

    const ctx = `CLIENT: ${client.name}${client.company ? ` (${client.company})` : ""}
PROJECTS:
${(projects ?? []).map((p) => `- ${p.name} — ${p.status.replace("_", " ")} · ${p.progress}% · deadline ${p.deadline ?? "n/a"}`).join("\n") || "(no projects)"}
${notes ? `\nUSER NOTES / CONTEXT:\n${notes}` : ""}`;

    const sys = `You are an executive freelance assistant drafting client emails on behalf of the developer.
${TONE_INSTRUCTIONS[tone]}
${TEMPLATE_INSTRUCTIONS[template]}
Always call the draft_email tool. Use the client's first name in the salutation. Sign off as "Best,\\n[Your name]".`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: ctx },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "draft_email" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("Lovable AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: `Gemini unavailable (${resp.status})` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("No tool call returned");
    const args = JSON.parse(tc.function.arguments || "{}");
    return new Response(JSON.stringify({ subject: args.subject ?? "", body: args.body ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-draft-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
