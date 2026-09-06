import Link from "next/link";
import Logo from "./Logo";
import AccountNav from "./AccountNav";

export default function Header() {
  return (
    <header className="site-header">
      <Logo />
      <nav className="header-actions">
        <Link href="/my-lists" className="header-text-link">My Lists</Link>
        <Link href="/my-gifts" className="header-text-link">My Gifts</Link>
        <AccountNav />
        <Link href="/new" className="button button-small">Start a list</Link>
      </nav>
    </header>
  );
}
