import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";

export async function POST(req: Request) {
  const generic = NextResponse.json({ ok: true });
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return generic;
    await enforceRateLimit(req, "auth-password-reset-network", 20, 3_600);
    await enforceRateLimit(req, `auth-password-reset-email:${hashKey(email)}`, 5, 3_600);

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://wishnorth.netlify.app";
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/account/reset` },
    });
    if (error || !data.properties?.action_link) return generic;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error("RESEND_NOT_CONFIGURED");
    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Wish North <auth@mail.metricnorth.ai>",
        to: [email],
        subject: "Reset your Wish North password",
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#16211d"><h1>Reset your Wish North password</h1><p>Use the button below to choose a new password.</p><p><a href="${data.properties.action_link}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#173e33;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
      }),
    });
    if (!send.ok) throw new Error(`RESEND_${send.status}`);
    return generic;
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: status === 429 ? "Too many reset requests. Please try again later." : "Password reset is temporarily unavailable." }, { status });
  }
}
