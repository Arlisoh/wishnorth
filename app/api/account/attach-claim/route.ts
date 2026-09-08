import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";
import { enforceRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    await enforceRateLimit(req, "attach-claim", 60, 3_600);
    const body = await req.json();
    const itemId = String(body.itemId || "");
    const claimCode = String(body.claimCode || "");
    if (!itemId || !claimCode) return NextResponse.json({ error: "Missing claim access." }, { status: 400 });

    const db = supabaseAdmin();
    const { data: claim, error } = await db
      .from("gift_claims")
      .select("id,claim_code_hash,claimer_user_id")
      .eq("item_id", itemId)
      .single();
    if (error || !claim || hashKey(claimCode) !== claim.claim_code_hash) {
      return NextResponse.json({ error: "That claim could not be verified." }, { status: 403 });
    }
    if (claim.claimer_user_id && claim.claimer_user_id !== user.id) {
      return NextResponse.json({ error: "That claim is already attached to another account." }, { status: 409 });
    }
    const { error: updateError } = await db.from("gift_claims").update({ claimer_user_id: user.id }).eq("id", claim.id);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const status = (e as Error & { status?: number }).status || 500;
    console.error(e);
    return NextResponse.json({ error: status === 429 ? "Too many claim attachments. Please try again later." : status === 503 ? "Account saving is temporarily unavailable." : "Could not save that claim to your account." }, { status });
  }
}
