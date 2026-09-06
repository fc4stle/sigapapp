import { createClient } from "@supabase/supabase-js";

// Anon key client for public read operations (RLS allows SELECT for anon)
// Safe to use in server components for read-only data
export function createSupabaseAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  // Strip trailing /rest/v1 if present
  const normalizedUrl = url.replace(/\/rest\/v1\/?$/, "");

  return createClient(normalizedUrl, anonKey, {
    auth: { persistSession: false },
  });
}
