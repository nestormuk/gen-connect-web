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
    const { storySection, style = "children's book illustration" } = await req.json();

    if (!storySection) {
      return new Response(
        JSON.stringify({ error: "Story section is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Generate the illustration prompt
    const illustrationPrompt = await generateIllustrationPrompt(storySection, style);

    return new Response(
      JSON.stringify({ prompt: illustrationPrompt }),
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

async function generateIllustrationPrompt(storySection: string, style: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: `You are an expert at creating detailed image prompts for illustrations. Create a vivid, detailed prompt that would help generate a family-friendly ${style} for the given story section. Your prompt should be suitable for image generation and should not include any inappropriate or adult content.` 
        },
        { role: "user", content: storySection }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating illustration prompt:', error);
    throw new Error('Failed to generate illustration prompt. Please try again later.');
  }
}