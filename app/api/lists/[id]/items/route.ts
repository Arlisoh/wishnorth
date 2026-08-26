import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = req.headers.get("x-owner-key") || "";
    const body = await req.json();
    const db = supabaseAdmin();
    const { data: list } = await db.from("wish_lists").select("owner_key_hash").eq("id", id).single();
    if (!list || hashKey(key) !== list.owner_key_hash) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Item name is required." }, { status: 400 });
    const priceNumber = body.price === "" || body.price == null ? null : Number(String(body.price).replace(/[^0-9.]/g, ""));
    const priceCents = typeof priceNumber === "number" && Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : null;
    const itemPayload = { list_id: id, title: title.slice(0, 300), url: body.url || null, image_url: body.imageUrl || null, retailer: body.retailer || null, price_cents: priceCents, size: body.size || null, color: body.color || null, notes: body.notes || null, priority: Math.min(3, Math.max(1, Number(body.priority) || 1)) };
    const { data: item, error } = await db.from("wish_items").insert(itemPayload).select("*").single();
    if (error) throw error;
    const normalized = title.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    await db.from("trend_events").insert({ item_id: item.id, title_normalized: normalized, retailer: itemPayload.retailer, price_cents: priceCents });
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not add that wish." }, { status: 500 });
  }
}
