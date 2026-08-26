export type WishItem = {
  id: string;
  list_id: string;
  title: string;
  url: string | null;
  image_url: string | null;
  retailer: string | null;
  price_cents: number | null;
  currency: string;
  notes: string | null;
  size: string | null;
  color: string | null;
  priority: number;
  created_at: string;
  claimed?: boolean;
};

export type WishList = {
  id: string;
  subject_name: string;
  occasion: string;
  description: string | null;
  is_managed: boolean;
  share_token: string;
  created_at: string;
  items: WishItem[];
};
