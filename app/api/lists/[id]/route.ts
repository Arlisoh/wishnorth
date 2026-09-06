import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashKey } from "@/lib/security";
import { userFromRequest } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const key = req.headers.get("x-owner-key") || "";
    const user = await userFromRequest(req);
    const db = supabaseAdmin();
    const { data: list, error } = await db
      .from("wish_lists")
      .select("id,subject_name,occasion,description,is_managed,owner_key_hash,owner_user_id,share_token,created_at")
      .eq("id", id)
      .single();

    if (error || !list) {
      return NextResponse.json({ error: "List not found." }, { status: 404 });
    }

    const ownerKeyMatches = Boolean(key) && hashKey(key) === list.owner_key_hash;
    const accountMatches = Boolean(user && list.owner_user_id === user.id);
    if (!ownerKeyMatches && !accountMatches) {
      return NextResponse.json({ error: "You do not have access to manage this list." }, { status: 403 });
    }

    const { data: items, error: itemError } = await db.from("wish_items").select("*").eq("list_id", id).order("created_at", { ascending: false });
    if (itemError) throw itemError;
    const { owner_key_hash, owner_user_id, ...safeList } = list;
    return NextResponse.json({ list: { ...safeList, items: items || [] } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load list." }, { status: 500 });
  }
}
