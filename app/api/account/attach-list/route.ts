import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "attach-list", 30, 3_600);
    const body = await req.json();
    const listId = String(body.listId || "");
    const ownerKey = String(body.ownerKey || "");
    if (!listId || !ownerKey) return NextResponse.json({ error: "Missing list access." }, { status: 400 });

    const db = supabaseAdmin();
    const { data: list, error } = await db
      .from("wish_lists")
      .select("id,owner_key_hash,owner_user_id")
      .eq("id", listId)
      .single();
    if (error || !list || hashKey(ownerKey) !== list.owner_key_hash) {
      return NextResponse.json({ error: "That list could not be verified." }, { status: 403 });
    }
    if (list.owner_user_id && list.owner_user_id !== user.id) {
      return NextResponse.json({ error: "That list already belongs to another account." }, { status: 409 });
    }
    const { error: updateError } = await db.from("wish_lists").update({ owner_user_id: user.id }).eq("id", listId);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const status = (e as Error & { status?: number }).status || 500;
    console.error(e);
    return NextResponse.json({ error: status === 429 ? "Too many list attachments. Please try again later." : status === 503 ? "Account saving is temporarily unavailable." : "Could not save that list to your account." }, { status });
  }
}
