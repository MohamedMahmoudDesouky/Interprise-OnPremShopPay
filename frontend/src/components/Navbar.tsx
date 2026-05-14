import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function Navbar() {
  return (
    <header className="navbar">
      <Link href="/" className="brand" aria-label="ShopPay home">
        <span className="brandIcon"><ShoppingBag size={20} /></span>
        <span>ShopPay</span>
      </Link>

      <nav className="navLinks">
        <Link href="/products">Products</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/checkout" className="navCta">Pay Now</Link>
      </nav>
    </header>
  );
}
