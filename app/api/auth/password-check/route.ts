import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { assertPasswordNotCompromised, UnsafePasswordError } from "@/lib/passwordSecurity";

export async function POST(req: Request) {
  try {
    await enforceRateLimit(req, "auth-password-check", 20, 3_600);
    const body = await req.json();
    const password = String(body.password || "");
    if (password.length < 8) return NextResponse.json({ error: "Use at least 8 characters." }, { status: 400 });
    await assertPasswordNotCompromised(password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof UnsafePasswordError) return NextResponse.json({ error: "That password appears in known data breaches. Choose a different password." }, { status: 400 });
    const status = (error as Error & { status?: number }).status || 500;
    return NextResponse.json({ error: status === 429 ? "Too many password checks. Please try again later." : "Could not validate that password." }, { status });
  }
}
