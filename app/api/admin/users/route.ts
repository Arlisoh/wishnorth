import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

const PER_PAGE = 25;

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const requestedPage = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const search = String(url.searchParams.get("search") || "").trim().toLowerCase().slice(0, 160);
    const db = supabaseAdmin();
    let users: User[] = [], total = 0, page = requestedPage, lastPage = 1;

    if (search) {
      const allUsers: User[] = [];
      let authPage = 1, authLastPage = 1;
      do {
        const { data, error } = await db.auth.admin.listUsers({ page: authPage, perPage: 1_000 });
        if (error) throw error;
        allUsers.push(...data.users);
        authLastPage = data.lastPage || 1;
        authPage += 1;
      } while (authPage <= authLastPage && authPage <= 20);
      const matches = allUsers.filter(user => {
        const name = String(user.user_metadata?.first_name || "").toLowerCase();
        return String(user.email || "").toLowerCase().includes(search) || name.includes(search);
      });
      total = matches.length;
      lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
      page = Math.min(requestedPage, lastPage);
      users = matches.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    } else {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: PER_PAGE });
      if (error) throw error;
      users = data.users;
      total = data.total || users.length;
      lastPage = data.lastPage || Math.max(1, Math.ceil(total / PER_PAGE));
    }

    users.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const userIds = users.map(user => user.id);
    const lists = userIds.length ? (await db.from("wish_lists").select("id,owner_user_id,subject_name,occasion,share_token,created_at,moderation_status").in("owner_user_id", userIds).order("created_at", { ascending: false })).data || [] : [];
    const listIds = lists.map(list => list.id);
    const items = listIds.length ? (await db.from("wish_items").select("list_id").in("list_id", listIds)).data || [] : [];
    const claims = userIds.length ? (await db.from("gift_claims").select("claimer_user_id").in("claimer_user_id", userIds)).data || [] : [];
    const itemCounts = new Map<string, number>(), claimCounts = new Map<string, number>();
    for (const item of items) itemCounts.set(item.list_id, (itemCounts.get(item.list_id) || 0) + 1);
    for (const claim of claims) if (claim.claimer_user_id) claimCounts.set(claim.claimer_user_id, (claimCounts.get(claim.claimer_user_id) || 0) + 1);
    const listsByUser = new Map<string, typeof lists>();
    for (const list of lists) {
      const ownerId = String(list.owner_user_id || "");
      listsByUser.set(ownerId, [...(listsByUser.get(ownerId) || []), list]);
    }

    const [{ count: totalLists }, { count: totalWishes }, { count: totalClaims }] = await Promise.all([
      db.from("wish_lists").select("id", { count: "exact", head: true }).not("owner_user_id", "is", null),
      db.from("wish_items").select("id", { count: "exact", head: true }),
      db.from("gift_claims").select("id", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      users: users.map(user => {
        const ownedLists = listsByUser.get(user.id) || [];
        return { id:user.id,email:user.email||"",firstName:String(user.user_metadata?.first_name||""),createdAt:user.created_at,confirmedAt:user.email_confirmed_at||null,lastSignInAt:user.last_sign_in_at||null,claimCount:claimCounts.get(user.id)||0,wishCount:ownedLists.reduce((sum,list)=>sum+(itemCounts.get(list.id)||0),0),lists:ownedLists.map(list=>({...list,itemCount:itemCounts.get(list.id)||0})) };
      }),
      pagination: { page, perPage: PER_PAGE, total, lastPage },
      summary: { totalUsers: total, totalLists: totalLists || 0, totalWishes: totalWishes || 0, totalClaims: totalClaims || 0 },
    });
  } catch (error) {
    const forbidden = error instanceof Error && error.message === "ADMIN_REQUIRED";
    return NextResponse.json({ error: forbidden ? "Admin access required." : "Could not load users." }, { status: forbidden ? 403 : 500 });
  }
}
