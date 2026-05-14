"use client";

import { useEffect, useMemo, useState } from "react";
import { CartItem, getCart } from "@/lib/cart";

export default function TodaysOrder() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    function syncCart() {
      setCart(getCart());
    }

    syncCart();

    window.addEventListener("cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  return (
    <div className="order-preview-card">
      <div className="order-preview-header">
        <span>Today's order</span>
        <strong>${total.toFixed(2)}</strong>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>No products added yet.</p>
          <p>Go to Products and click Buy.</p>
        </div>
      ) : (
        <div className="order-preview-list">
          {cart.map((item) => (
            <div className="order-preview-item" key={item.id}>
              <span className="order-preview-icon">{item.image}</span>

              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.category} • Qty: {item.quantity}
                </small>
              </div>

              <strong>${(item.price * item.quantity).toFixed(2)}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="payment-status-card">
        <div>
          <p>Payment status</p>
          <strong>{cart.length > 0 ? "Ready to process" : "Waiting for items"}</strong>
        </div>
        <span className={cart.length > 0 ? "pulse" : "pulse muted-pulse"} />
      </div>
    </div>
  );
}
