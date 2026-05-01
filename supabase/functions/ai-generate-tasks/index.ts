// Generates a JSON array of suggested tasks for a project using Lovable AI Gateway (google/gemini-2.5-flash) tool calling.
// Body: { project_name, description, tech_stack: string[], deadline?: "yyyy-mm-dd" }
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
      name: "propose_tasks",
      description: "Return a list of 6-12 actionable freelance tasks needed to deliver this project.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            minItems: 4,
            maxItems: 14,
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short, action-led task title (verb first)" },
                description: { type: "string", description: "1-2 sentence detail" },
                estimated_hours: { type: "number", minimum: 0.5 },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                is_urgent: { type: "boolean" },
                is_important: { type: "boolean" },
                suggested_due_date: { type: "string", description: "ISO date yyyy-mm-dd, on or before the project deadline" },
              },
              required: ["title", "estimated_hours", "priority", "is_urgent", "is_important", "suggested_due_date"],
              additionalProperties: false,
            },
          },
        },
        required: ["tasks"],
        additionalProperties: false,
      },
    },
  },
];

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
    const projectName = String(body.project_name ?? "Untitled").slice(0, 200);
    const description = String(body.description ?? "").slice(0, 2000);
    const techStack: string[] = Array.isArray(body.tech_stack) ? body.tech_stack.slice(0, 30) : [];
    const deadline = body.deadline ? String(body.deadline).slice(0, 20) : null;
    const today = new Date().toISOString().slice(0, 10);

    const userPrompt = `Project: ${projectName}
Description: ${description || "(none provided)"}
Tech stack: ${techStack.length ? techStack.join(", ") : "(unspecified)"}
Today: ${today}
Deadline: ${deadline ?? "not set"}

Break this project down into a sensible task plan. Sequence tasks logically (discovery → design → build → QA → launch). Set is_urgent=true only for blockers or near-deadline items; is_important=true for everything that affects the deliverable. Distribute due dates between today and the deadline (or +30 days if no deadline).`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a senior freelance project planner. Always call the propose_tasks tool." },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "propose_tasks" } },
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    return new Response(JSON.stringify({ tasks: args.tasks ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-generate-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
