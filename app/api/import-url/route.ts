import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { enforceRateLimit, rejectBot } from "@/lib/rateLimit";
import { assertPublicHttpUrl } from "@/lib/urlSafety";
import { fetchPublicUrl, readTextLimited } from "@/lib/remoteFetch";
import { cacheProductImage } from "@/lib/imageCache";
import { normalizeProductUrl, normalizeRetailer, normalizeTitle, productKey, retailerDomain } from "@/lib/normalize";

function cleanPrice(value: unknown) {
  const match = String(value || "").replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
  return match?.[0] || "";
}

function manualWarning(retailer: string | null) {
  const store = retailer || "This store";
  return `${store} did not share its product details automatically. Your link is saved. Add the item name and any details you want below.`;
}

export async function POST(req: Request) {
  let safeUrl: URL | null = null;
  try {
    await enforceRateLimit(req, "import-url", 20, 600);
    const body = await req.json();
    rejectBot(body);
    safeUrl = await assertPublicHttpUrl(String(body.url || ""));
    const canonicalInput = normalizeProductUrl(safeUrl.toString()) || safeUrl.toString();
    const inputRetailer = normalizeRetailer(null, canonicalInput) || null;

    try {
      const { response, finalUrl } = await fetchPublicUrl(safeUrl, { timeoutMs:8_000,maxRedirects:5,headers:{ "user-agent":"Mozilla/5.0 (compatible; WishNorth/1.0; +https://wishnorth.netlify.app)",accept:"text/html,application/xhtml+xml" } });
      if (!response.ok) throw new Error(`Retailer returned ${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("URL is not a product web page");
      const html = await readTextLimited(response, 3_000_000);
      const $ = cheerio.load(html);
      let title = $('meta[property="og:title"]').attr("content") || $('meta[name="twitter:title"]').attr("content") || $("title").text() || "";
      let imageUrl = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content") || "";
      let price = $('meta[property="product:price:amount"]').attr("content") || $('meta[itemprop="price"]').attr("content") || "";
      let retailer = $('meta[property="og:site_name"]').attr("content") || "";
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).text());
          const nodes = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
          for (const node of nodes) {
            if (!node || typeof node !== "object") continue;
            if (node['@type'] === "Product" || (Array.isArray(node['@type']) && node['@type'].includes("Product"))) {
              title = node.name || title;
              const image = Array.isArray(node.image) ? node.image[0] : typeof node.image === "object" ? node.image?.url : node.image;
              imageUrl = image || imageUrl;
              const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
              price = offers?.price || offers?.lowPrice || price;
              if (node.brand && !retailer) retailer = typeof node.brand === "string" ? node.brand : node.brand.name || retailer;
            }
          }
        } catch {}
      });
      if (!imageUrl) {
        const dynamicImages = $("#landingImage").attr("data-a-dynamic-image") || $("#imgBlkFront").attr("data-a-dynamic-image");
        if (dynamicImages) {
          try { imageUrl = Object.keys(JSON.parse(dynamicImages))[0] || ""; } catch {}
        }
      }
      imageUrl = imageUrl || $("#landingImage").attr("data-old-hires") || $("#landingImage").attr("src") || $("#imgBlkFront").attr("src") || $("main img").first().attr("src") || "";
      price = price || $(".a-price .a-offscreen").first().text() || $("#priceblock_ourprice").text() || $("#priceblock_dealprice").text() || "";
      if (imageUrl) { try { imageUrl = new URL(imageUrl, finalUrl).toString(); } catch { imageUrl = ""; } }
      const cached = await cacheProductImage(imageUrl);
      const canonical = normalizeProductUrl(finalUrl.toString()) || canonicalInput;
      const cleanTitle = title.trim().replace(/\s+/g, " ").slice(0, 300);
      const store = normalizeRetailer(retailer, canonical) || inputRetailer;
      return NextResponse.json({ title:cleanTitle,imageUrl:cached.imageUrl,imageSourceUrl:cached.sourceUrl,price:cleanPrice(price),retailer:store,retailerDomain:retailerDomain(canonical),finalUrl:canonical,normalizedTitle:normalizeTitle(cleanTitle),productKey:productKey(cleanTitle,canonical),warning:cleanTitle?null:manualWarning(store) });
    } catch {
      return NextResponse.json({ title:"",imageUrl:null,imageSourceUrl:null,price:"",retailer:inputRetailer,finalUrl:canonicalInput,warning:manualWarning(inputRetailer),partial:true });
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 400;
    return NextResponse.json({ error: status === 429 ? "Too many product imports. Please try again in a few minutes." : status === 503 ? "Product import is temporarily unavailable. You can still enter the details manually." : "Paste a complete product-page link beginning with https://." }, { status });
  }
}
