import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchPublicUrl, readBytesLimited } from "@/lib/remoteFetch";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export function isCachedProductImage(value: string | null | undefined) {
  return Boolean(value && value.includes("/storage/v1/object/public/product-images/"));
}

function hasExpectedSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (type === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "image/gif") return bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  return false;
}

export async function cacheProductImage(imageUrl: string | null | undefined) {
  if (!imageUrl) return { imageUrl: null, sourceUrl: null };
  if (isCachedProductImage(imageUrl)) return { imageUrl, sourceUrl: imageUrl };
  try {
    const { response: res } = await fetchPublicUrl(imageUrl, {
      timeoutMs: 8_000,
      maxRedirects: 5,
      headers: { "user-agent": "WishNorth/1.0 (+https://wishnorth.netlify.app)", accept: "image/jpeg,image/png,image/webp,image/gif" },
    });
    if (!res.ok) throw new Error(`image ${res.status}`);
    const type = (res.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const ext = TYPES[type];
    if (!ext) throw new Error("unsupported image type");
    const bytes = await readBytesLimited(res, MAX_BYTES);
    if (!hasExpectedSignature(type, bytes)) throw new Error("image signature did not match its content type");
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
