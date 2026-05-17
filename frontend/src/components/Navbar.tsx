import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  return (
    <header className="navbar">
      <Link href="/" className="brand" aria-label="ShopPay Enterprise home">
        <span className="brandLogo">
          <Image
            src="/desouky-logo.png"
            alt="Mohamed Desouky logo"
            width={40}
            height={40}
            priority
          />
        </span>

        <span className="brandText">
          <strong>ShopPay</strong>
          <small>Enterprise by Desouky</small>
        </span>
      </Link>

      <nav className="navLinks">
        <Link href="/products">Products</Link>
        <Link href="/admin/products">Admin</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/checkout" className="navCta">
          Pay Now
        </Link>
      </nav>
    </header>
  );
}
