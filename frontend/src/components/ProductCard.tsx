"use client";

import { useState } from "react";
import type { Product } from "@/lib/api";
import { addToCart } from "@/lib/cart";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false);

  function handleBuy() {
    addToCart(product);
    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 1200);
  }

  return (
    <article className="product-card">
      <div className="product-card-top">
        <span className="badge">{product.badge}</span>
        <span className="rating">⭐ {product.rating}</span>
      </div>

      <div className="product-image">{product.image}</div>

      <p className="product-category">{product.category}</p>

      <h3>{product.name}</h3>

      <p className="product-description">{product.description}</p>

      <div className="product-footer">
        <div>
          <strong>${product.price.toFixed(2)}</strong>
          {product.oldPrice && <span>${product.oldPrice.toFixed(2)}</span>}
        </div>

        <button className="buy-button" type="button" onClick={handleBuy}>
          {added ? "Added ✓" : "Buy"}
        </button>
      </div>

      <p className="stock">{product.stock}</p>
    </article>
  );
}
