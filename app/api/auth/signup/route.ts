import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    await enforceRateLimit(req, "auth-signup", 5, 3_600);
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    if (!body.adultConfirmed) return NextResponse.json({ error: "Adult confirmation is required." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });

    const { error } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName },
    });
    if (error) {
      const exists = /already|registered|exists/i.test(error.message);
      return NextResponse.json({ error: exists ? "An account already exists for this email. Sign in instead." : "Could not create the account." }, { status: exists ? 409 : 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: status === 429 ? "Too many signup attempts. Please try again later." : "Account signup is temporarily unavailable." }, { status });
  }
}
