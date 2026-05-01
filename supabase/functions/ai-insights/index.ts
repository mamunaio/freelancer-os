// Generates 3 weekly insights using Lovable AI Gateway (google/gemini-2.5-flash).
// Returns { insights: [{ title, body, kind: "profit"|"risk"|"alert"|"info" }] }
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
      name: "weekly_insights",
      description: "Return exactly 3 distinct weekly insights for the freelancer.",
      parameters: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short headline (max 80 chars)" },
                body: { type: "string", description: "1-2 sentence insight with concrete numbers" },
                kind: { type: "string", enum: ["profit", "risk", "alert", "info"] },
              },
              required: ["title", "body", "kind"],
              additionalProperties: false,
            },
          },
        },
        required: ["insights"],
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

    const today = new Date();
    const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

    const [{ data: clients }, { data: projects }, { data: tasks }, { data: finance }] = await Promise.all([
      admin.from("clients").select("id,name,company,total_revenue,status").order("total_revenue", { ascending: false }).limit(50),
      admin.from("projects").select("id,name,client_id,status,progress,deadline,budget").limit(80),
      admin.from("tasks").select("id,title,done,due_date,priority,is_urgent,is_important").limit(120),
      admin.from("finance_entries").select("kind,category,amount,occurred_on,client_id,description").gte("occurred_on", since).limit(300),
    ]);

    const ctx = JSON.stringify({
      today: today.toISOString().slice(0, 10),
      clients, projects, tasks, finance_last_60d: finance,
    });

    const sys = `You are a sharp finance/ops analyst for a solo freelancer. Generate 3 distinct, actionable weekly insights from the JSON snapshot.

Required coverage (one of each, in this order):
1. PROFIT — most profitable client this period (use total_revenue + recent finance), include $.
2. RISK — overdue tasks or at-risk projects (overdue task count, at-risk project name).
3. ALERT — expense spike (compare last 30d vs previous 30d category by category, call out the biggest %/$ jump).

Each insight: <=80 char title, 1-2 sentence body with the actual number, and the matching kind. Always call weekly_insights tool.`;

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
        tool_choice: { type: "function", function: { name: "weekly_insights" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Lovable AI error:", resp.status, t);
      const isFallbackable = resp.status === 429 || resp.status === 402 || resp.status >= 500;
      const message =
        resp.status === 429 ? "Rate limit reached. Please try again in a moment." :
        resp.status === 402 ? "AI credits exhausted. Add funds in Settings → Workspace → Usage." :
        `Gemini unavailable (${resp.status})`;
      return new Response(
        JSON.stringify({ insights: [], error: message, fallback: isFallbackable }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const data = await resp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(
        JSON.stringify({ insights: [], error: "Gemini unavailable", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const args = JSON.parse(tc.function.arguments || "{}");
    return new Response(JSON.stringify({ insights: args.insights ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-insights error:", e);
    return new Response(
      JSON.stringify({ insights: [], error: e instanceof Error ? e.message : "Unknown error", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
