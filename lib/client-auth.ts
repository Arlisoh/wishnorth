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

function headerObject(extra: HeadersInit) {
  const headers: Record<string, string> = {};

  if (typeof Headers !== "undefined" && extra instanceof Headers) {
    extra.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  if (Array.isArray(extra)) {
    for (const [key, value] of extra) headers[String(key)] = String(value);
    return headers;
  }

  for (const [key, value] of Object.entries(extra as Record<string, string>)) {
    if (value != null) headers[key] = String(value);
  }

  return headers;
}

export async function authHeaders(extra: HeadersInit = {}) {
  const token = await accessToken();
  return {
    ...headerObject(extra),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
