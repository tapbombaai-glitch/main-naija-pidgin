import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0;

let client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Check the public environment variables in Render."
    );
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

/*
 * Keep the client lazy so a missing environment variable
 * does not crash the page just because this file is imported.
 */
export const supabase = {
  get auth() {
    return createSupabaseClient().auth;
  },
  from(table: string) {
    return createSupabaseClient().from(table);
  },
  storage: {
    from(bucket: string) {
      return createSupabaseClient().storage.from(bucket);
    },
  },
};