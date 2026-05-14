"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { getProducts, Product } from "@/lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError("Failed to load products from backend.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Products API</p>
        <h1>Shop products from the backend.</h1>
        <p>
          These products are loaded from product-service through the API Gateway.
        </p>
      </section>

      {loading && <p className="muted">Loading products...</p>}

      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <section className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      )}
    </main>
  );
}
