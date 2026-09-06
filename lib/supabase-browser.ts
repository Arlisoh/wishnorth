"use client";

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

const SUPABASE_URL = "https://yhxwdiwrenpciomrspir.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SAFvRF5OBpmWXW10urhSgg_oj6yRLpQ";

export function supabaseBrowser() {
  if (client) return client;

  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
