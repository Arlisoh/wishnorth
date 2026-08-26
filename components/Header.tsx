import Link from "next/link";
import Logo from "./Logo";

export default function Header() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="header-actions">
        <Link href="/new" className="button button-small">Start a list</Link>
      </nav>
    </header>
  );
}
