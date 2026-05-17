"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearAdminToken, getAdminToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    function syncAdminState() {
      setIsAdminLoggedIn(Boolean(getAdminToken()));
    }

    syncAdminState();

    window.addEventListener("storage", syncAdminState);
    window.addEventListener("admin-auth-updated", syncAdminState);

    return () => {
      window.removeEventListener("storage", syncAdminState);
      window.removeEventListener("admin-auth-updated", syncAdminState);
    };
  }, []);

  function handleLogout() {
    clearAdminToken();
    window.dispatchEvent(new Event("admin-auth-updated"));
    router.push("/admin/login");
  }

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
        <Link href="/contact">Contact</Link>

        {isAdminLoggedIn && (
          <Link href="/admin/products">Admin</Link>
        )}

        <Link href="/checkout" className="navCta">
          Pay Now
        </Link>

        {isAdminLoggedIn && (
          <button className="navLogout" type="button" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
