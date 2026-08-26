import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey, randomToken } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const subjectName = String(body.subjectName || "").trim();
    const occasion = String(body.occasion || "Christmas").trim();
    if (!subjectName || subjectName.length > 80) return NextResponse.json({ error: "Please enter a first name." }, { status: 400 });
    const ownerKey = randomToken(32);
    const shareToken = randomToken(24);
    const db = supabaseAdmin();
    const { data, error } = await db.from("wish_lists").insert({ subject_name: subjectName, occasion, is_managed: Boolean(body.isManaged), owner_key_hash: hashKey(ownerKey), share_token: shareToken }).select("id, share_token").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, ownerKey, shareToken: data.share_token });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Wish North is not connected to its database yet." }, { status: 500 });
  }
}
