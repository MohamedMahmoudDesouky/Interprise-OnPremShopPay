"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin, setAdminToken } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");

    if (!username || !password) {
      setStatus("Username and password are required.");
      return;
    }

    try {
      setLoading(true);
      setStatus("");

      const result = await loginAdmin({ username, password });
      setAdminToken(result.token);

      router.push("/admin/products");
    } catch {
      setStatus("Invalid admin credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <p className="eyebrow">Admin Login</p>
        <h1>Secure admin access.</h1>
        <p>
          Login to manage products using JWT authentication from product-service.
        </p>
      </section>

      <section className="admin-login-layout">
        <form className="form-card admin-login-card" onSubmit={handleSubmit}>
          <h2>Login</h2>

          <label>
            Username
            <input
              name="username"
              type="text"
              placeholder="admin"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              placeholder="Admin password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {status && <p className="status-message status-error">{status}</p>}
        </form>
      </section>
    </main>
  );
}
