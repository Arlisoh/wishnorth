import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { enforceRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    if (id === admin.id) return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
    await enforceRateLimit(req, `admin-delete-user:${admin.id}`, 10, 3_600);
    const body = await req.json();
    const confirmationEmail = String(body.confirmationEmail || "").trim().toLowerCase();
    const db = supabaseAdmin();
    const { data, error } = await db.auth.admin.getUserById(id);
    if (error || !data.user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (!confirmationEmail || confirmationEmail !== String(data.user.email || "").toLowerCase()) return NextResponse.json({ error: "The confirmation email did not match." }, { status: 400 });
    const { error: dataError } = await db.rpc("delete_account_data", { p_user_id: id });
    if (dataError) throw dataError;
    const { error: userError } = await db.auth.admin.deleteUser(id);
    if (userError) throw userError;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = (error as Error & { status?: number }).status || (message === "ADMIN_REQUIRED" ? 403 : 500);
    return NextResponse.json({ error: status === 403 ? "Admin access required." : status === 429 ? "Too many account deletion attempts." : "Could not delete that account." }, { status });
  }
}
