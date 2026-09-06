import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { assertPublicHttpUrl } from "@/lib/urlSafety";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function cacheProductImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return { imageUrl: null, sourceUrl: null };
  if (imageUrl.includes("/storage/v1/object/public/product-images/")) return { imageUrl, sourceUrl: imageUrl };
  try {
    const parsed = await assertPublicHttpUrl(imageUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(parsed, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "WishNorth/1.0 (+https://wishnorth.netlify.app)" } });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`image ${res.status}`);
    const type = (res.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const ext = TYPES[type];
    if (!ext) throw new Error("unsupported image type");
    const announced = Number(res.headers.get("content-length") || "0");
    if (announced > MAX_BYTES) throw new Error("image too large");
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error("image too large");
    const name = `${createHash("sha256").update(imageUrl).digest("hex")}.${ext}`;
    const db = supabaseAdmin();
    const { error } = await db.storage.from("product-images").upload(name, bytes, { contentType: type, cacheControl: "31536000", upsert: true });
    if (error) throw error;
    const { data } = db.storage.from("product-images").getPublicUrl(name);
    return { imageUrl: data.publicUrl, sourceUrl: imageUrl };
  } catch (error) {
    console.warn("Could not cache retailer image", error);
    return { imageUrl: null, sourceUrl: imageUrl };
  }
}
