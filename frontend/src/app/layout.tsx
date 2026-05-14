import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ShopPay | Modern Shopping Experience",
  description: "A production-style shopping frontend with products, contact, and checkout pages."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="pageGlow pageGlowOne" />
        <div className="pageGlow pageGlowTwo" />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
