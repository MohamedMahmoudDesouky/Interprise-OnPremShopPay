import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4002;
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:4003";
const orders = [];

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "order-service" });
});

app.post("/api/orders", async (req, res) => {
  const { customer, items, total } = req.body;

  if (!customer || !Array.isArray(items) || !total) {
    return res.status(400).json({ message: "customer, items, and total are required" });
  }

  const order = {
    id: `ord-${Date.now()}`,
    customer,
    items,
    total,
    status: "pending_payment",
    createdAt: new Date().toISOString()
  };

  try {
    const paymentResponse = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, amount: total })
    });

    if (!paymentResponse.ok) {
      throw new Error("Payment authorization failed");
    }

    const payment = await paymentResponse.json();
    order.status = "paid";
    order.paymentId = payment.id;
  } catch (error) {
    order.status = "payment_failed";
  }

  orders.push(order);
  return res.status(201).json(order);
});

app.get("/api/orders", (req, res) => {
  res.json(orders);
});

app.listen(PORT, () => {
  console.log(`order-service is running on port ${PORT}`);
});
