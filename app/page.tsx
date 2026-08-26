import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrendPanel from "@/components/TrendPanel";

export default function Home() {
  return (
    <main>
      <Header />
      <section className="hero shell">
        <div className="hero-copy">
          <div className="season-pill">THE UNIVERSAL GIFT LIST</div>
          <h1>Wish anything.<br /><em>From anywhere.</em></h1>
          <p className="hero-lede">One beautiful list for every store. Share it with everyone who loves you, prevent duplicate gifts, and keep the surprises secret.</p>
          <div className="hero-buttons">
            <Link href="/new" className="button button-primary button-big">Start my list 🎁</Link>
            <a href="#how" className="button button-ghost button-big">See how it works</a>
          </div>
          <div className="trust-line"><span>✓ No app required</span><span>✓ Any store</span><span>✓ Kid-safe by design</span></div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="floating-card card-a"><span>🎧</span><div><strong>AirPods Pro</strong><small>Added from Apple</small></div></div>
          <div className="floating-card card-b"><span>👟</span><div><strong>Air Force 1</strong><small>Size 11 · ♥♥♥</small></div></div>
          <div className="floating-card card-c"><span>🧱</span><div><strong>LEGO Botanicals</strong><small>Grandma has it covered ✨</small></div></div>
          <div className="north-orbit">N</div>
        </div>
      </section>

      <section id="how" className="how shell">
        <div className="section-heading"><div className="eyebrow">SIMPLE ON PURPOSE</div><h2>Christmas lists should not feel like work.</h2></div>
        <div className="steps-grid">
          <div className="step"><b>01</b><h3>Make a list</h3><p>Create one for yourself or a child you manage. Children never need their own accounts.</p></div>
          <div className="step"><b>02</b><h3>Add anything</h3><p>Paste a product link from nearly any store. Wish North pulls in the useful details.</p></div>
          <div className="step"><b>03</b><h3>Share once</h3><p>Send one link to family and friends. They can privately claim gifts without spoiling the surprise.</p></div>
        </div>
      </section>

      <section className="trends-section">
        <div className="shell">
          <div className="section-heading split"><div><div className="eyebrow">THE WISH INDEX</div><h2>What people actually want.</h2></div><p>As real wishes are added, this becomes a live view of what is rising, not a made-up gift guide.</p></div>
          <TrendPanel />
        </div>
      </section>

      <section className="business-cta shell">
        <div><div className="eyebrow">BUILT BY METRIC NORTH</div><h2>We build digital things people want to use.</h2><p>Wish North is one example. Imagine what a smart, useful experience could do for your business.</p></div>
        <a href="https://metricnorth.ai" className="button button-dark button-big">See Metric North →</a>
      </section>
      <Footer />
    </main>
  );
}
