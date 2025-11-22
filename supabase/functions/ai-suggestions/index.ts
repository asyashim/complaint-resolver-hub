import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { complaintText } = await req.json();

    if (!complaintText || complaintText.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Complaint text too short for suggestions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent similar complaints for context
    const { data: recentComplaints } = await supabase
      .from("complaints")
      .select("title, description, category, status, resolution_note")
      .eq("status", "resolved")
      .limit(10)
      .order("created_at", { ascending: false });

    const systemPrompt = `You are an AI assistant for a college complaint management system. 
Analyze the student's complaint and provide:
1. Suggested category (academic, technical, hostel, infrastructure, or other)
2. Similar past complaints (if any from the provided context)
3. Potential quick solutions (if applicable)

Recent resolved complaints for reference:
${recentComplaints?.map(c => `- ${c.title} (${c.category}): ${c.resolution_note || "Resolved"}`).join("\n") || "No recent complaints"}

Format your response as JSON with this structure:
{
  "category": "suggested_category",
  "confidence": 0.0-1.0,
  "similarComplaints": ["title1", "title2"],
  "suggestions": ["solution1", "solution2"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Student complaint: "${complaintText}"` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_complaint",
              description: "Analyze a student complaint and provide suggestions",
              parameters: {
                type: "object",
                properties: {
                  category: {
                    type: "string",
                    enum: ["academic", "technical", "hostel", "infrastructure", "other"]
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0 and 1"
                  },
                  similarComplaints: {
                    type: "array",
                    items: { type: "string" },
                    description: "Titles of similar past complaints"
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Potential solutions or next steps"
                  }
                },
                required: ["category", "confidence", "similarComplaints", "suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_complaint" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    console.log("AI Response:", JSON.stringify(aiData));

    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in ai-suggestions:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
