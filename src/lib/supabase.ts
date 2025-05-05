// Modified supabase.js
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration (safely)
console.log('Supabase initialization (PROD):', {
  urlDefined: Boolean(supabaseUrl),
  keyDefined: Boolean(supabaseAnonKey),
  urlPrefix: supabaseUrl?.substring(0, 10) + '...',
  mode: import.meta.env.MODE
});

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL ERROR: Missing Supabase environment variables in production');
  
  // In production, don't throw - provide safe fallbacks
  if (import.meta.env.PROD) {
    alert('Configuration error detected. Please contact support.');
  } else {
    throw new Error('Supabase environment variables are not set.');
  }
}

// Create the Supabase client with production-specific settings
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'genconnect-auth-token',
      flowType: 'implicit' // Try explicit if you have issues
    },
    global: {
      headers: {
        'x-application-name': 'GenConnect',
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Run a quick test to verify connection
console.log('Testing Supabase connection in ' + (import.meta.env.PROD ? 'PRODUCTION' : 'DEVELOPMENT'));
supabase.auth.getSession()
  .then(response => {
    console.log('Supabase connection test result:', Boolean(response));
    console.log('Session exists:', Boolean(response?.data?.session));
  })
  .catch(err => {
    console.error('Supabase connection test failed:', err);
  });