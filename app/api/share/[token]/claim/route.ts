import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey, randomToken } from "@/lib/security";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const itemId = String(body.itemId || "");
    const name = String(body.name || "").trim();
    if (!itemId || !name) return NextResponse.json({ error: "Your first name is required." }, { status: 400 });
    const db = supabaseAdmin();
    const { data: list } = await db.from("wish_lists").select("id").eq("share_token", token).single();
    if (!list) return NextResponse.json({ error: "Shared list not found." }, { status: 404 });
    const { data: item } = await db.from("wish_items").select("id").eq("id", itemId).eq("list_id", list.id).single();
    if (!item) return NextResponse.json({ error: "That gift is not on this list." }, { status: 400 });
    const claimCode = randomToken(24);
    const { error } = await db.from("gift_claims").insert({ item_id: itemId, claimer_name: name.slice(0, 80), claim_code_hash: hashKey(claimCode) });
    if (error?.code === "23505") return NextResponse.json({ error: "Someone else just claimed this gift." }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ ok: true, claimCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not claim this gift." }, { status: 500 });
  }
}
