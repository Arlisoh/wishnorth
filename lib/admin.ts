import type { User } from "@supabase/supabase-js";
import { userFromRequest } from "@/lib/auth";

const BUILT_IN_ADMIN_EMAILS = ["michael@mccabemedia.com"];

function adminEmails() {
  return new Set([
    ...BUILT_IN_ADMIN_EMAILS,
    ...String(process.env.ADMIN_EMAILS || "").split(","),
  ].map(v => v.trim().toLowerCase()).filter(Boolean));
}

export function isAdminUser(user: User | null) {
  const email = String(user?.email || "").toLowerCase();
  return Boolean(email && adminEmails().has(email));
}

export async function requireAdmin(req: Request) {
  const user = await userFromRequest(req);
  if (!user || !isAdminUser(user)) throw new Error("ADMIN_REQUIRED");
  return user;
}
