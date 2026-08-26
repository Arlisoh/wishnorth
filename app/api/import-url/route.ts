import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { hostFromUrl } from "@/lib/helpers";
import { assertPublicHttpUrl } from "@/lib/urlSafety";

function cleanPrice(input: unknown) {
  if (typeof input === "number") return input.toFixed(2);
  if (typeof input !== "string") return "";
  const m = input.replace(/,/g, "").match(/(?:\$|USD\s*)?([0-9]+(?:\.[0-9]{1,2})?)/i);
  return m ? m[1] : "";
}

async function safeFetch(start: URL) {
  let current = start;
  for (let i = 0; i < 6; i++) {
    await assertPublicHttpUrl(current.toString());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; WishNorth/1.0; +https://metricnorth.ai)",
          accept: "text/html,application/xhtml+xml",
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect had no location");
        current = new URL(location, current);
        continue;
      }
      return { response, finalUrl: current };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects");
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const parsed = await assertPublicHttpUrl(String(url));
    const { response, finalUrl } = await safeFetch(parsed);
    if (!response.ok) throw new Error(`Retailer returned ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("URL is not a product web page");
    const html = (await response.text()).slice(0, 3_000_000);
    const $ = cheerio.load(html);
    let title = $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || $("title").text() || "";
    let imageUrl = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
    let price = $('meta[property="product:price:amount"]').attr("content") || $('meta[itemprop="price"]').attr("content") || "";
    let retailer = $('meta[property="og:site_name"]').attr("content") || hostFromUrl(finalUrl.toString());
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).text());
        const nodes = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          if (node['@type'] === "Product" || (Array.isArray(node['@type']) && node['@type'].includes("Product"))) {
            title = node.name || title;
            const img = Array.isArray(node.image) ? node.image[0] : typeof node.image === "object" ? node.image?.url : node.image;
            imageUrl = img || imageUrl;
            const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
            price = offers?.price || offers?.lowPrice || price;
            if (node.brand) retailer = typeof node.brand === "string" ? node.brand : node.brand.name || retailer;
          }
        }
      } catch {}
    });
    if (imageUrl) { try { imageUrl = new URL(imageUrl, finalUrl).toString(); } catch { imageUrl = ""; } }
    return NextResponse.json({ title: title.trim().replace(/\s+/g, " ").slice(0,300), imageUrl, price: cleanPrice(price), retailer: String(retailer).slice(0,100), finalUrl: finalUrl.toString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "That store would not let Wish North read the product automatically. You can still enter the item details manually." }, { status: 422 });
  }
}
