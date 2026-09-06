import { createClient } from "@supabase/supabase-js";

// NEXT_PUBLIC_SUPABASE_URL may include a trailing /rest/v1 path segment;
// supabase-js appends its own API paths, so it must be stripped first.
function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "");
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }
  return normalizeSupabaseUrl(url);
}

/**
 * Server-only Supabase client authenticated with the service role key.
 * Bypasses Row Level Security — never import this from client components.
 */
export function createSupabaseServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { persistSession: false },
  });
}
