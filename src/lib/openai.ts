import OpenAI from 'openai';

const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file.');
}

export const openai = new OpenAI({
  apiKey: openaiApiKey,
  dangerouslyAllowBrowser: true // For demo purposes only, in production use a backend proxy
});

interface StoryPromptOptions {
  theme?: string;
  characters?: string[];
  setting?: string;
  storyLength?: 'short' | 'medium' | 'long';
  tone?: 'funny' | 'educational' | 'adventure' | 'fantasy';
  ageGroup?: 'children' | 'all-ages' | 'adults';
}

export async function generateStoryContent(prompt: string, options: StoryPromptOptions = {}) {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key is not configured. Please check your environment variables.');
  }

  try {
    const { theme, characters, setting, storyLength = 'medium', tone = 'adventure', ageGroup = 'all-ages' } = options;
    
    let systemPrompt = `You are a creative storyteller who specializes in creating engaging, ${ageGroup} appropriate stories that bridge generations.`;
    
    if (theme) systemPrompt += ` The theme of this story is: ${theme}.`;
    if (characters && characters.length) systemPrompt += ` The main characters are: ${characters.join(', ')}.`;
    if (setting) systemPrompt += ` The story is set in: ${setting}.`;
    
    systemPrompt += ` Create a ${storyLength} ${tone} story.`;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: storyLength === 'short' ? 500 : storyLength === 'medium' ? 1000 : 2000,
    });
    
    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('Error generating story content:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    }
    throw new Error('Failed to generate story content. Please try again later.');
  }
}

export async function generateStoryIllustrationPrompt(storySection: string) {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key is not configured. Please check your environment variables.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are an expert at creating detailed image prompts for illustrations. Create a vivid, detailed prompt that would help generate a child-friendly illustration for the given story section." 
        },
        { role: "user", content: storySection }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });
    
    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('Error generating illustration prompt:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    }
    throw new Error('Failed to generate illustration prompt. Please try again later.');
  }
}