import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";
import { assertPasswordNotCompromised, UnsafePasswordError } from "@/lib/passwordSecurity";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    if (!body.adultConfirmed) return NextResponse.json({ error: "Adult confirmation is required." }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
    await enforceRateLimit(req, "auth-signup-network", 20, 3_600);
    await enforceRateLimit(req, `auth-signup-email:${hashKey(email)}`, 3, 3_600);
    await assertPasswordNotCompromised(password);

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://wishnorth.netlify.app";
    const admin = supabaseAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { data: { first_name: firstName }, redirectTo: `${origin}/account` },
    });
    if (error) {
      const exists = /already|registered|exists/i.test(error.message);
      return NextResponse.json({ error: exists ? "An account already exists for this email. Sign in instead." : "Could not create the account." }, { status: exists ? 409 : 400 });
    }
    // Netlify exposes this only to server-side functions; it never reaches the browser.
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || !data.properties?.action_link) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error("CONFIRMATION_NOT_CONFIGURED");
    }
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Wish North <auth@mail.metricnorth.ai>",
        to: [email],
        subject: "Confirm your Wish North account",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#16211d"><h1>Confirm your Wish North account</h1><p>Click the button below to verify your email and finish creating your account.</p><p><a href="${data.properties.action_link}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#173e33;color:#fff;text-decoration:none;font-weight:700">Confirm email</a></p><p>If you did not create this account, you can ignore this email.</p></div>`,
      }),
    });
    if (!send.ok) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error(`RESEND_${send.status}`);
    }
    return NextResponse.json({ ok: true, confirmationRequired: true });
  } catch (error) {
    if (error instanceof UnsafePasswordError) return NextResponse.json({ error: "That password appears in known data breaches. Choose a different password." }, { status: 400 });
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: status === 429 ? "Too many signup attempts. Please try again later." : "Account signup is temporarily unavailable." }, { status });
  }
}
