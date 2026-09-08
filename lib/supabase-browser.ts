"use client";
import { createClient } from "@supabase/supabase-js";
let client: ReturnType<typeof createClient> | null = null;
export function supabaseBrowser() {
  if (client) return client;
  // Both values are public browser configuration. Keep fallbacks so account
  // access survives a missing Netlify build-time variable.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yhxwdiwrenpciomrspir.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_SAFvRF5OBpmWXW10urhSgg_oj6yRLpQ";
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
