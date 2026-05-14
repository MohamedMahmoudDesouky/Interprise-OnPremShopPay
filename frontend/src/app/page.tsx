import TodaysOrder from "@/components/TodaysOrder";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, CreditCard, Sparkles } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/products";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    text: "Clean payment flow with realistic order review.",
  },
  {
    icon: Truck,
    title: "Fast delivery",
    text: "Shipping options and premium delivery experience.",
  },
  {
    icon: CreditCard,
    title: "Payment ready",
    text: "Frontend connected to backend services through the API Gateway.",
  },
];

export default function HomePage() {
  const featured = products.slice(0, 3);

  return (
    <section className="container">
      <div className="hero">
        <div className="heroContent">
          <span className="eyebrow">
            <Sparkles size={16} /> Modern e-commerce UI
          </span>

          <h1>Shopping that feels premium, fast, and production-ready.</h1>

          <p className="heroText">
            ShopPay is a polished shopping frontend connected to backend
            microservices through an API Gateway, with product browsing, cart
            flow, contact service, and checkout order processing.
          </p>

          <div className="heroActions">
            <Link href="/products" className="primaryButton">
              Browse Products <ArrowRight size={18} />
            </Link>

            <Link href="/checkout" className="secondaryButton">
              Go to Checkout
            </Link>
          </div>

          <div className="stats">
            <div>
              <strong>99.9%</strong>
              <span>UI uptime style</span>
            </div>

            <div>
              <strong>6</strong>
              <span>Premium products</span>
            </div>

            <div>
              <strong>3-step</strong>
              <span>Cart → Checkout → Payment</span>
            </div>
          </div>
        </div>

        <div className="heroPanel">
          <TodaysOrder />
        </div>
      </div>

      <div className="benefitGrid">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;

          return (
            <article className="benefitCard" key={benefit.title}>
              <Icon size={24} />
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          );
        })}
      </div>

      <div className="sectionHeader">
        <div>
          <p className="eyebrowText">Featured</p>
          <h2>Popular Products</h2>
        </div>

        <Link href="/products" className="textLink">
          View all →
        </Link>
      </div>

      <div className="productGrid">
        {featured.map((product) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  );
}
