"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createOrder } from "@/lib/api";
import { CartItem, clearCart, getCart, removeFromCart } from "@/lib/cart";

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCart(getCart());

    function syncCart() {
      setCart(getCart());
    }

    window.addEventListener("cart-updated", syncCart);

    return () => {
      window.removeEventListener("cart-updated", syncCart);
    };
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  function handleRemove(productId: string) {
    removeFromCart(productId);
    setCart(getCart());
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cart.length === 0) {
      setStatus("Your cart is empty. Please add products first.");
      return;
    }

    setLoading(true);
    setStatus("");

    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") || "");
    const lastName = String(formData.get("lastName") || "");
    const email = String(formData.get("email") || "");

    const payload = {
      customer: {
        name: `${firstName} ${lastName}`.trim(),
        email,
      },
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
    };

    try {
      const order: any = await createOrder(payload);

      setStatus(
        `Order created successfully. Status: ${order.status}. Payment ID: ${
          order.paymentId || "N/A"
        }`
      );

      clearCart();
      setCart([]);
    } catch {
      setStatus("Failed to create order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Order Service + Payment Service</p>
        <h1>Complete your checkout.</h1>
        <p>
          Your cart now comes from products selected on the Products page, then
          checkout creates a real order through order-service.
        </p>
      </section>

      <section className="checkout-layout">
        <form className="form-card" onSubmit={handleSubmit}>
          <h2>Shipping details</h2>

<div className="form-grid">
  <label>
    First name
    <input name="firstName" type="text" placeholder="First name" required />
  </label>

  <label>
    Last name
    <input name="lastName" type="text" placeholder="Last name" required />
  </label>
</div>

<label>
  Email
  <input name="email" type="email" placeholder="email@example.com" required />
</label>

<label>
  Address
  <input name="address" type="text" placeholder="Street, city, country" />
</label>

<h2>Payment details</h2>

<label>
  Card number
  <input type="text" placeholder="**** **** **** ****" />
</label>

<div className="form-grid">
  <label>
    Expiry
    <input type="text" placeholder="MM/YY" />
  </label>

  <label>
    CVC
    <input type="text" placeholder="CVC" />
  </label>
</div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </button>

          {status && <p className="status-message">{status}</p>}
        </form>

        <aside className="summary-card">
          <h2>Order summary</h2>

          {cart.length === 0 && (
            <div className="empty-cart">
              <p>Your cart is empty.</p>
              <p>Go to Products and click Buy to add items.</p>
            </div>
          )}

          {cart.map((item) => (
            <div key={item.id} className="summary-item">
              <span className="summary-icon">{item.image}</span>

              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.category} • Qty: {item.quantity}
                </small>
              </span>

              <strong>${(item.price * item.quantity).toFixed(2)}</strong>

              <button
                className="remove-button"
                type="button"
                onClick={() => handleRemove(item.id)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="summary-total">
            <span>Total</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
