import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req);
    const { id } = await params;
    const db = supabaseAdmin();
    const { data: claim } = await db.from("gift_claims").select("id,claimer_user_id").eq("id", id).single();
    if (!claim || claim.claimer_user_id !== user.id) return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    const { error } = await db.from("gift_claims").delete().eq("id", id).eq("claimer_user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: "Could not release that gift." }, { status: 500 });
  }
}
