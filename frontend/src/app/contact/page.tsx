"use client";

import { FormEvent, useState } from "react";
import { sendContactMessage } from "@/lib/api";

export default function ContactPage() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    const formData = new FormData(event.currentTarget);

    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      message: String(formData.get("message") || ""),
      topic: String(formData.get("topic") || "general"),
    };

    try {
      await sendContactMessage(payload);
      setStatus("Message sent successfully through contact-service.");
      event.currentTarget.reset();
    } catch {
      setStatus("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Contact Service</p>
        <h1>Talk to the ShopPay team.</h1>
        <p>
          This form sends real requests to contact-service through the API Gateway.
        </p>
      </section>

      <section className="form-card">
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" type="text" placeholder="Mohamed" required />
          </label>

          <label>
            Email
            <input name="email" type="email" placeholder="test@example.com" required />
          </label>

          <label>
            Topic
            <select name="topic" defaultValue="general">
              <option value="general">General</option>
              <option value="support">Support</option>
              <option value="sales">Sales</option>
            </select>
          </label>

          <label>
            Message
            <textarea
              name="message"
              placeholder="Write your message..."
              rows={6}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>

        {status && <p className="status-message">{status}</p>}
      </section>
    </main>
  );
}
