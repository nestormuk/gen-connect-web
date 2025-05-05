// supabase.js
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Use the real values from your environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration but not full key
console.log('Supabase Config:', {
  url: supabaseUrl,
  keyProvided: Boolean(supabaseAnonKey)
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not set.');
}

// Create client with specific options to help troubleshoot
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Test connection
console.log('Testing Supabase connection...');
supabase.auth.getSession()
  .then(response => {
    console.log('Supabase connection test result:', 
      response ? 'Response received' : 'No response');
  })
  .catch(error => {
    console.error('Supabase connection test failed:', error);
  });