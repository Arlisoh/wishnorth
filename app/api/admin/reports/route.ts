import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
export async function GET(req:Request){try{await requireAdmin(req);const db=supabaseAdmin();const{data,error}=await db.from("abuse_reports").select("*,wish_lists(subject_name,occasion,share_token),wish_items(title,url,retailer)").order("created_at",{ascending:false}).limit(200);if(error)throw error;return NextResponse.json({reports:data||[]});}catch(e){return NextResponse.json({error:(e as Error).message==="ADMIN_REQUIRED"?"Admin access required.":"Could not load reports."},{status:(e as Error).message==="ADMIN_REQUIRED"?403:500});}}
