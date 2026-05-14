import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4003;
const payments = [];

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "payment-service" });
});

app.post("/api/payments/authorize", (req, res) => {
  const { orderId, amount } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ message: "orderId and amount are required" });
  }

  const payment = {
    id: `pay-${Date.now()}`,
    orderId,
    amount,
    status: "approved",
    provider: "mock-provider",
    createdAt: new Date().toISOString()
  };

  payments.push(payment);
  return res.status(201).json(payment);
});

app.get("/api/payments", (req, res) => {
  res.json(payments);
});

app.listen(PORT, () => {
  console.log(`payment-service is running on port ${PORT}`);
});
