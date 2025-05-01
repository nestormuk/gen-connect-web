import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// These would typically come from environment variables in a real app
// For this demo, we'll use placeholders that will need to be replaced after Supabase setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);