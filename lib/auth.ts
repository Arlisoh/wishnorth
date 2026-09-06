import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

export async function userFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser(req: Request): Promise<User> {
  const user = await userFromRequest(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
