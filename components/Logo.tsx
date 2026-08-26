import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Wish North home">
      <span className="brand-mark">✦</span>
      <span>Wish North</span>
    </Link>
  );
}
