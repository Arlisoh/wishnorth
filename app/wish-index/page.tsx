import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrendPanel from "@/components/TrendPanel";

export const metadata: Metadata = {
  title: "Wish North Index | What People Actually Want",
  description: "A live, privacy-safe look at real wish-list demand: trending products, categories, retailers, price ranges and regional patterns.",
  openGraph: {
    title: "The Wish North Index",
    description: "What people actually want, based on real wish-list activity.",
    type: "website",
  },
};

export default function WishIndexPage() {
  return <main>
    <Header />
    <section className="index-hero shell">
      <div className="eyebrow">THE WISH NORTH INDEX</div>
      <h1>What people actually want.</h1>
      <p>A live view of real wish-list demand across products, categories, retailers, price points and regions. No surveys. No sponsored rankings. No invented popularity numbers.</p>
      <div className="index-audience-tags"><span>For shoppers</span><span>For retailers</span><span>For journalists</span></div>
    </section>
    <section className="shell index-page-body"><TrendPanel full /></section>
    <section className="index-press shell">
      <div><div className="eyebrow">PRESS & RETAIL DATA</div><h2>Need a local cut of the Index?</h2><p>As the sample grows, Wish North can report privacy-safe category, retailer, price and regional patterns for media coverage and retail planning.</p></div>
      <a className="button button-dark button-big" href="https://metricnorth.ai" target="_blank" rel="noopener noreferrer">Contact Metric North →</a>
    </section>
    <Footer />
  </main>;
}
