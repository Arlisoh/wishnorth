import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    if (!body.age18 || !body.termsAccepted) return NextResponse.json({ error: "You must be 18 or older and accept the Terms and Privacy Policy." }, { status: 400 });
    const db = supabaseAdmin();
    const { data: existing, error: existingError } = await db.from("account_consents").select("terms_version,privacy_version").eq("user_id", user.id).maybeSingle();
    if (existingError) throw existingError;
    if (existing?.terms_version === "2026-09-06" && existing?.privacy_version === "2026-09-06") return NextResponse.json({ ok: true });
    await enforceRateLimit(req, `account-consent:${user.id}`, 5, 3_600);
    const now = new Date().toISOString();
    const { error } = await db.from("account_consents").upsert({
      user_id: user.id,
      terms_version: "2026-09-06",
      privacy_version: "2026-09-06",
      accepted_at: now,
      updated_at: now,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = (error as Error & { status?: number }).status || (message === "UNAUTHORIZED" ? 401 : 500);
    return NextResponse.json({ error: status === 401 ? "Sign in required." : status === 429 ? "Too many consent requests." : status === 503 ? "Consent recording is temporarily unavailable." : "Could not record consent." }, { status });
  }
}
