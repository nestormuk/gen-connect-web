import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import OpenAI from "npm:openai@4.26.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize OpenAI client
const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

interface StoryPromptOptions {
  theme?: string;
  characters?: string[];
  setting?: string;
  storyLength?: "short" | "medium" | "long";
  tone?: "funny" | "educational" | "adventure" | "fantasy";
  ageGroup?: "children" | "all-ages" | "adults";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get the authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Parse the request body
    const { prompt, options = {} } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Generate the story content
    const storyContent = await generateStoryContent(prompt, options);

    return new Response(
      JSON.stringify({ content: storyContent }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

async function generateStoryContent(prompt: string, options: StoryPromptOptions = {}) {
  const { 
    theme, 
    characters, 
    setting, 
    storyLength = "medium", 
    tone = "adventure", 
    ageGroup = "all-ages" 
  } = options;
  
  let systemPrompt = `You are a creative storyteller who specializes in creating engaging, ${ageGroup} appropriate stories that bridge generations.`;
  
  if (theme) systemPrompt += ` The theme of this story is: ${theme}.`;
  if (characters && characters.length) systemPrompt += ` The main characters are: ${characters.join(", ")}.`;
  if (setting) systemPrompt += ` The story is set in: ${setting}.`;
  
  systemPrompt += ` Create a ${storyLength} ${tone} story.`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: storyLength === "short" ? 500 : storyLength === "medium" ? 1000 : 2000,
  });
  
  return response.choices[0].message.content;
}