import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// Create a writable store for user data
export const user = writable(null);

// Initialize auth state listener
export function initAuth() {
  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    user.set(session?.user || null);
  });

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    user.set(session?.user || null);
  });
}

// Helper function to get user's display name
export function getUserDisplayName(userData) {
  if (!userData) return 'Guest';
  
  // Try to get full_name from user metadata first
  if (userData.user_metadata?.full_name) {
    return userData.user_metadata.full_name;
  }
  
  // Fallback to email username (part before @)
  if (userData.email) {
    return userData.email.split('@')[0];
  }
  
  return 'User';
}
