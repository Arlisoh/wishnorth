import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/cookies"],
      disallow: ["/share/", "/list/", "/account", "/admin", "/my-lists", "/my-gifts"],
    },
  };
}
