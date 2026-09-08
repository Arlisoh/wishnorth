import type { Config, Context } from "@netlify/edge-functions";

export default async function wishGeo(req: Request, context: Context) {
  const headers = new Headers(req.headers);
  const country = context.geo?.country?.code || "";
  const region = context.geo?.subdivision?.name || "";
  const regionCode = context.geo?.subdivision?.code || "";
  const city = context.geo?.city || "";

  if (country) headers.set("x-wish-geo-country", country.slice(0, 8));
  if (region) headers.set("x-wish-geo-region", region.slice(0, 100));
  if (regionCode) headers.set("x-wish-geo-region-code", regionCode.slice(0, 20));
  if (city) headers.set("x-wish-geo-city", city.slice(0, 100));

  return context.nextRequest(new Request(req, { headers }));
}

export const config: Config = {
  path: "/api/lists/*",
  method: ["POST", "PATCH"],
};
