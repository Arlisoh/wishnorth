import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { enforceRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";

const ACTIONS = new Set(["hide", "restore", "dismiss", "delete"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(req);
    await enforceRateLimit(req, `admin-moderation:${admin.id}`, 120, 3_600);
    const { id } = await params;
    const body = await req.json();
    const action = String(body.action || "");
    const note = String(body.note || "").trim().slice(0, 1_000);
    if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown moderation action." }, { status: 400 });

    const { data, error } = await supabaseAdmin().rpc("moderate_abuse_report", {
      p_report_id: id,
      p_action: action,
      p_admin_user_id: admin.id,
      p_note: note || null,
    });
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = (error as Error & { status?: number }).status || (message === "ADMIN_REQUIRED" ? 403 : 500);
    return NextResponse.json({ error: status === 403 ? "Admin access required." : status === 429 ? "Too many moderation requests." : status === 503 ? "Moderation is temporarily unavailable." : "Could not update report." }, { status });
  }
}
