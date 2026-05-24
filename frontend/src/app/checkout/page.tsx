"use client";

import ProductMedia from "@/components/ProductMedia";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createOrder } from "@/lib/api";
import { CartItem, clearCart, getCart, removeFromCart } from "@/lib/cart";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidLuhn(cardNumber: string) {
  let sum = 0;
  let shouldDouble = false;

  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function validateExpiry(expiry: string) {
  const normalized = expiry.trim();

  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(normalized)) {
    return "Expiry must be in MM/YY format.";
  }

  const [monthText, yearText] = normalized.split("/");
  const month = Number(monthText);
  const year = 2000 + Number(yearText);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return "Card expiry date is expired.";
  }

  return "";
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  function syncCart() {
    setCart(getCart());
  }

  syncCart();

  window.addEventListener("cart-updated", syncCart);

  return () => {
    window.removeEventListener("cart-updated", syncCart);
  };
}, []);


  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const isCartEmpty = cart.length === 0 || total <= 0;

  function showError(message: string) {
    setStatusType("error");
    setStatus(message);
  }

  function showSuccess(message: string) {
    setStatusType("success");
    setStatus(message);
  }

  function handleRemove(productId: string) {
    removeFromCart(productId);
    setCart(getCart());
    setStatus("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCartEmpty) {
      showError("Your cart is empty. Please add products before checkout.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim();

    const cardNumber = onlyDigits(String(formData.get("cardNumber") || ""));
    const expiry = String(formData.get("expiry") || "").trim();
    const cvc = onlyDigits(String(formData.get("cvc") || ""));

    if (!firstName || !lastName || !email) {
      showError("Please complete your shipping details.");
      return;
    }

    if (cardNumber.length < 13 || cardNumber.length > 19) {
      showError("Card number must contain 13 to 19 digits.");
      return;
    }

    if (!isValidLuhn(cardNumber)) {
      showError("Card number is not valid. Please check it and try again.");
      return;
    }

    const expiryError = validateExpiry(expiry);

    if (expiryError) {
      showError(expiryError);
      return;
    }

    if (!/^\d{3}$/.test(cvc)) {
      showError("CVC must contain exactly 3 digits.");
      return;
    }

    setLoading(true);
    setStatus("");

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

      showSuccess(
        `Order created successfully. Status: ${order.status}. Payment ID: ${
          order.paymentId || "N/A"
        }`
      );

      clearCart();
      setCart([]);
    } catch {
      showError("Failed to create order. Please try again.");
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
        <form className="form-card" onSubmit={handleSubmit} noValidate>
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
            <input
              name="cardNumber"
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              maxLength={23}
              required
            />
          </label>

          <div className="form-grid">
            <label>
              Expiry
              <input
                name="expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </label>

            <label>
              CVC
              <input
                name="cvc"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="CVC"
                maxLength={3}
                required
              />
            </label>
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={loading || isCartEmpty}
            aria-disabled={loading || isCartEmpty}
          >
            {loading ? "Processing..." : `Pay $${total.toFixed(2)}`}
          </button>

          {isCartEmpty && (
            <p className="status-message">
              Add products to your cart before checkout.
            </p>
          )}

          {status && (
            <p className={`status-message ${statusType === "error" ? "status-error" : ""}`}>
              {status}
            </p>
          )}
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
              <span className="summary-icon">
                <ProductMedia value={item.image} alt={item.name} />
              </span>

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
