export type WishCategory =
  | "Apparel & Accessories"
  | "Toys & Games"
  | "Electronics & Tech"
  | "Beauty & Personal Care"
  | "Home & Kitchen"
  | "Sports & Outdoors"
  | "Books, Media & Gaming"
  | "Jewelry & Watches"
  | "Wine, Beer & Spirits"
  | "Food & Drink"
  | "Pets"
  | "Automotive"
  | "Experiences"
  | "Gift Cards"
  | "Other";

const RULES: Array<{ category: WishCategory; words: string[] }> = [
  { category: "Gift Cards", words: ["gift card", "egift", "e-gift", "voucher"] },
  { category: "Electronics & Tech", words: ["iphone", "ipad", "airpods", "headphone", "earbud", "speaker", "laptop", "computer", "monitor", "keyboard", "mouse", "tablet", "smartwatch", "apple watch", "kindle", "camera", "drone", "tv", "television", "gaming console", "playstation", "xbox", "nintendo switch", "vr headset", "charger", "power bank", "electronics"] },
  { category: "Toys & Games", words: ["lego", "barbie", "doll", "action figure", "squishmallow", "plush", "toy", "board game", "puzzle", "nerf", "hot wheels", "playset", "building set", "pokemon cards", "trading cards"] },
  { category: "Apparel & Accessories", words: ["shirt", "t-shirt", "tee", "hoodie", "sweatshirt", "sweater", "jacket", "coat", "jeans", "pants", "dress", "skirt", "shorts", "shoe", "sneaker", "boot", "sandals", "hat", "cap", "gloves", "scarf", "bag", "backpack", "purse", "wallet", "belt", "socks", "underwear", "clothing", "apparel"] },
  { category: "Beauty & Personal Care", words: ["perfume", "cologne", "fragrance", "makeup", "lipstick", "mascara", "skincare", "skin care", "moisturizer", "serum", "shampoo", "conditioner", "hair dryer", "styler", "dyson airwrap", "beauty", "cosmetic", "grooming", "razor"] },
  { category: "Home & Kitchen", words: ["cookware", "pan", "pot", "knife set", "air fryer", "blender", "mixer", "coffee maker", "espresso", "vacuum", "lamp", "bedding", "blanket", "pillow", "towel", "decor", "furniture", "home", "kitchen", "candle"] },
  { category: "Sports & Outdoors", words: ["golf", "basketball", "football", "soccer", "baseball", "pickleball", "tennis", "fishing", "camping", "hiking", "bike", "bicycle", "helmet", "fitness", "workout", "dumbbell", "yeti", "cooler", "outdoor", "sports"] },
  { category: "Books, Media & Gaming", words: ["book", "novel", "manga", "comic", "vinyl", "record", "blu-ray", "dvd", "video game", "game for", "ps5 game", "xbox game", "switch game"] },
  { category: "Jewelry & Watches", words: ["necklace", "bracelet", "earring", "ring", "jewelry", "jewellery", "watch", "pendant", "charm"] },
  { category: "Wine, Beer & Spirits", words: ["wine", "champagne", "prosecco", "beer", "ale", "lager", "bourbon", "whiskey", "whisky", "scotch", "tequila", "mezcal", "vodka", "gin", "rum", "brandy", "cognac", "liqueur", "spirits", "cocktail"] },
  { category: "Food & Drink", words: ["chocolate", "candy", "coffee", "tea", "snack", "food", "cookies", "cake", "drink"] },
  { category: "Pets", words: ["dog", "cat", "pet", "leash", "pet bed", "cat tree", "dog toy"] },
  { category: "Automotive", words: ["car", "truck", "automotive", "floor mats", "dash cam", "carplay", "car accessory"] },
  { category: "Experiences", words: ["ticket", "concert", "spa", "massage", "hotel", "trip", "vacation", "restaurant", "experience", "membership", "subscription"] },
];

export function categorizeWish(input: { title?: unknown; retailer?: unknown; url?: unknown; rawCategory?: unknown }): WishCategory {
  const haystack = [input.title, input.retailer, input.url, input.rawCategory]
    .map(v => String(v || "").toLowerCase())
    .join(" ");
  for (const rule of RULES) {
    if (rule.words.some(word => haystack.includes(word))) return rule.category;
  }
  return "Other";
}

export const WISH_CATEGORIES: WishCategory[] = RULES.map(r => r.category).concat("Other");
