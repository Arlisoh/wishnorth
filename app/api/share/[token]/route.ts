import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const db = supabaseAdmin();
    const { data: list, error } = await db.from("wish_lists").select("id,subject_name,occasion,description,is_managed,share_token,created_at").eq("share_token", token).single();
    if (error || !list) return NextResponse.json({ error: "This shared list does not exist." }, { status: 404 });
    const { data: items, error: itemError } = await db.from("wish_items").select("*").eq("list_id", list.id).order("created_at", { ascending: false });
    if (itemError) throw itemError;
    const itemIds = (items || []).map(i => i.id);
    let claimed = new Set<string>();
    if (itemIds.length) {
      const { data: claims } = await db.from("gift_claims").select("item_id").in("item_id", itemIds);
      claimed = new Set((claims || []).map(c => c.item_id));
    }
    return NextResponse.json({ list: { ...list, items: (items || []).map(i => ({ ...i, claimed: claimed.has(i.id) })) } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not open this list." }, { status: 500 });
  }
}
