import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type TrendRow = {
  title_normalized: string | null;
  retailer: string | null;
  created_at: string;
};

function prettyTitle(value: string) {
  return value.replace(/\b\w/g, c => c.toUpperCase());
}

export async function GET() {
  try {
    const db = supabaseAdmin();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const [{ data, error }, wishCount, listCount] = await Promise.all([
      db.from("trend_events")
        .select("title_normalized,retailer,created_at")
        .gte("created_at", since)
        .eq("event_type", "wish_added")
        .order("created_at", { ascending: false })
        .limit(5000),
      db.from("wish_items").select("id", { count: "exact", head: true }),
      db.from("wish_lists").select("id", { count: "exact", head: true }),
    ]);

    if (error) throw error;

    const rows = (data || []) as TrendRow[];
    const counts = new Map<string, number>();
    for (const row of rows) {
      const title = row.title_normalized?.trim();
      if (title) counts.set(title, (counts.get(title) || 0) + 1);
    }

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([title, count]) => ({ title: prettyTitle(title), count }));

    const seen = new Set<string>();
    const latest = rows
      .filter(row => {
        const title = row.title_normalized?.trim();
        if (!title || seen.has(title)) return false;
        seen.add(title);
        return true;
      })
      .slice(0, 8)
      .map(row => ({
        title: prettyTitle(row.title_normalized!.trim()),
        retailer: row.retailer || null,
        count: counts.get(row.title_normalized!.trim()) || 1,
      }));

    const trueTrends = ranked.filter(item => item.count >= 2);

    return NextResponse.json({
      trends: trueTrends,
      latest,
      totalWishes: wishCount.count || 0,
      totalLists: listCount.count || 0,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ trends: [], latest: [], totalWishes: 0, totalLists: 0 }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
