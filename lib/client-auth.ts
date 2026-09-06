"use client";

import { supabaseBrowser } from "@/lib/supabase-browser";

export async function accessToken() {
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    return data.session?.access_token || "";
  } catch {
    return "";
  }
}

export async function authHeaders(extra: HeadersInit = {}) {
  const token = await accessToken();
  return {
    ...Object.fromEntries(new Headers(extra).entries()),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
