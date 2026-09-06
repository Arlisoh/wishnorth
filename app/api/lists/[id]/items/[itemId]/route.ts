import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";
import { userFromRequest } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { id, itemId } = await params;
    const key = req.headers.get("x-owner-key") || "";
    const user = await userFromRequest(req);
    const db = supabaseAdmin();
    const { data: list } = await db.from("wish_lists").select("owner_key_hash,owner_user_id").eq("id", id).single();
    const ownerKeyMatches = Boolean(key) && Boolean(list) && hashKey(key) === list.owner_key_hash;
    const accountMatches = Boolean(user && list?.owner_user_id === user.id);
    if (!list || (!ownerKeyMatches && !accountMatches)) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const { data: item } = await db.from("wish_items").select("id").eq("id", itemId).eq("list_id", id).single();
    if (!item) return NextResponse.json({ error: "Wish not found." }, { status: 404 });
    await db.from("trend_events").delete().eq("item_id", itemId);
    const { error } = await db.from("wish_items").delete().eq("id", itemId).eq("list_id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not delete that wish." }, { status: 500 });
  }
}
