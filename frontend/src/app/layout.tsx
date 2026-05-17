import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ShopPay Enterprise by Desouky",
  description:
    "A production-style cloud-native shopping platform built by Mohamed Desouky with Next.js, microservices, PostgreSQL, Docker, Kubernetes, Helm, and Kong Gateway.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
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
