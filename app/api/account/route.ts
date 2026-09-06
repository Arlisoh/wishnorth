import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const db = supabaseAdmin();

    const { data: lists, error: listError } = await db
      .from("wish_lists")
      .select("id,subject_name,occasion,created_at,updated_at")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false });
    if (listError) throw listError;

    const listIds = (lists || []).map(list => list.id);
    const itemCounts: Record<string, number> = {};
    if (listIds.length) {
      const { data: items, error: itemError } = await db.from("wish_items").select("list_id").in("list_id", listIds);
      if (itemError) throw itemError;
      for (const item of items || []) itemCounts[item.list_id] = (itemCounts[item.list_id] || 0) + 1;
    }

    const { data: claims, error: claimError } = await db
      .from("gift_claims")
      .select("id,item_id,claimer_name,created_at")
      .eq("claimer_user_id", user.id)
      .order("created_at", { ascending: false });
    if (claimError) throw claimError;

    const itemIds = (claims || []).map(claim => claim.item_id);
    let claimItems: any[] = [];
    if (itemIds.length) {
      const { data, error } = await db
        .from("wish_items")
        .select("id,list_id,title,url,image_url,retailer,price_cents,currency,size,color,notes")
        .in("id", itemIds);
      if (error) throw error;
      claimItems = data || [];
    }

    const claimListIds = Array.from(new Set(claimItems.map(item => item.list_id)));
    let claimLists: any[] = [];
    if (claimListIds.length) {
      const { data, error } = await db
        .from("wish_lists")
        .select("id,subject_name,occasion,share_token")
        .in("id", claimListIds);
      if (error) throw error;
      claimLists = data || [];
    }

    const itemMap = new Map(claimItems.map(item => [item.id, item]));
    const listMap = new Map(claimLists.map(list => [list.id, list]));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: String(user.user_metadata?.first_name || ""),
      },
      lists: (lists || []).map(list => ({ ...list, itemCount: itemCounts[list.id] || 0 })),
      claims: (claims || []).map(claim => {
        const item = itemMap.get(claim.item_id);
        const list = item ? listMap.get(item.list_id) : null;
        return { ...claim, item, list };
      }).filter(claim => claim.item && claim.list),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Could not load your account." }, { status: 500 });
  }
}
