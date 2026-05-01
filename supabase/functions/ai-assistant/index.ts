// AI Assistant edge function — uses Lovable AI Gateway (google/gemini-2.5-flash).
// Receives full workspace snapshot (projects, clients, finance, tasks) on every call.
// Supports tool: create_task.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Injaazh OS Copilot — a sharp executive assistant for a Full-Stack Developer & CEO.

You receive a JSON snapshot of the entire workspace (projects, clients, finance, tasks, time logs) at the start of every conversation.
Reason directly from that snapshot — do NOT request more data. You may call create_task when the user asks to create/remind/schedule something.

Style:
- Concise, executive tone. Markdown formatted. Short headings, bullets, **bold** key numbers.
- Weekly summary: cover income vs expense, top projects, completed/open tasks, hours tracked. End with 2-3 actionable next steps.
- Email drafts: produce subject + body. Friendly-professional. Sign off as "Best,\\n[Your name]".
- Natural-language task: ALWAYS call create_task. Infer due_date (ISO yyyy-mm-dd), priority (high/medium/low), urgent/important. Default important=true.

Today's date: ${new Date().toISOString().slice(0, 10)}.`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a task in the user's Eisenhower-style todo list.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          is_urgent: { type: "boolean" },
          is_important: { type: "boolean" },
          due_date: { type: "string", description: "ISO date yyyy-mm-dd or empty" },
          project_hint: { type: "string", description: "Optional project name to link to" },
        },
        required: ["title", "priority", "is_urgent", "is_important"],
        additionalProperties: false,
      },
    },
  },
];

async function getSnapshot(supabase: any) {
  const since = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const [finance, projects, tasks, clients, timeLogs] = await Promise.all([
    supabase.from("finance_entries").select("kind,category,amount,occurred_on,client_id,project_id,description,recurring,tax_deductible").gte("occurred_on", since).order("occurred_on", { ascending: false }).limit(500),
    supabase.from("projects").select("id,name,client_id,status,progress,budget,deadline,tech_stack,start_date").order("updated_at", { ascending: false }).limit(200),
    supabase.from("tasks").select("id,title,priority,quadrant,done,due_date,is_urgent,is_important,project_id,description").order("created_at", { ascending: false }).limit(300),
    supabase.from("clients").select("id,name,company,email,status,total_revenue,pipeline_stage,tags").order("total_revenue", { ascending: false }).limit(150),
    supabase.from("time_logs").select("duration_seconds,started_at,task_id,project_id,hourly_rate,mode").gte("started_at", since).limit(500),
  ]);
  return {
    today: new Date().toISOString().slice(0, 10),
    finance_last_60d: finance.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    clients: clients.data ?? [],
    time_logs_last_60d: timeLogs.data ?? [],
  };
}

async function callTool(name: string, args: any, supabase: any) {
  if (name === "create_task") {
    const quadrant =
      args.is_urgent && args.is_important ? "q1" :
      !args.is_urgent && args.is_important ? "q2" :
      args.is_urgent && !args.is_important ? "q3" : "q4";
    let project_id: string | null = null;
    if (args.project_hint) {
      const { data } = await supabase.from("projects").select("id").ilike("name", `%${args.project_hint}%`).limit(1);
      project_id = data?.[0]?.id ?? null;
    }
    const { data, error } = await supabase.from("tasks").insert({
      title: args.title,
      description: args.description ?? null,
      priority: args.priority,
      is_urgent: !!args.is_urgent,
      is_important: !!args.is_important,
      quadrant,
      due_date: args.due_date && args.due_date.length >= 8 ? args.due_date : null,
      project_id,
    }).select().single();
    if (error) return { error: error.message };
    return { task: data, success: true };
  }
  return { error: `Unknown tool ${name}` };
}

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

    const { messages = [] } = await req.json();
    const snapshot = await getSnapshot(admin);

    const conversation: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `WORKSPACE SNAPSHOT (JSON):\n${JSON.stringify(snapshot)}` },
      ...messages,
    ];

    // Tool-calling loop (max 3 rounds; only create_task tool now)
    for (let round = 0; round < 3; round++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversation,
          tools,
        }),
      });
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("Lovable AI error:", resp.status, t);
        throw new Error(`Gemini unavailable (${resp.status})`);
      }
      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("No assistant message");

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return new Response(JSON.stringify({ content: msg.content ?? "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      conversation.push(msg);
      for (const tc of toolCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
        const result = await callTool(tc.function.name, parsed, admin);
        conversation.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ content: "I ran out of reasoning steps. Please try a more specific request." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
