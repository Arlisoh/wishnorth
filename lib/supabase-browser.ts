"use client";
import { createClient } from "@supabase/supabase-js";
let client: ReturnType<typeof createClient> | null = null;
export function supabaseBrowser() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Wish North accounts are temporarily unavailable.");
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
