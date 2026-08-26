import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const db = supabaseAdmin();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await db.from("trend_events").select("title_normalized").gte("created_at", since).eq("event_type", "wish_added").limit(5000);
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const row of data || []) {
      const t = row.title_normalized?.trim();
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const trends = [...counts.entries()].filter(([, count]) => count >= 2).sort((a,b) => b[1]-a[1]).slice(0,8).map(([title,count]) => ({ title: title.replace(/\b\w/g, c => c.toUpperCase()), count }));
    return NextResponse.json({ trends });
  } catch {
    return NextResponse.json({ trends: [] });
  }
}
