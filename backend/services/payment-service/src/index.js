import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4003;
const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  console.warn("DATABASE_URL is not set. Payment service will use in-memory storage.");
}

const inMemoryPayments = [];

async function initializeDatabase() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(80) PRIMARY KEY,
      order_id VARCHAR(80) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      status VARCHAR(50) NOT NULL,
      provider VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function mapPayment(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

app.get("/health", async (req, res) => {
  if (!pool) {
    return res.status(200).json({
      status: "ok",
      service: "payment-service",
      database: "not_configured",
    });
  }

  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ok",
      service: "payment-service",
      database: "connected",
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      service: "payment-service",
      database: "unavailable",
    });
  }
});

app.post("/api/payments/authorize", async (req, res) => {
  const { amount, currency = "USD", orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({
      message: "amount and orderId are required",
    });
  }

  const payment = {
    id: `pay-${Date.now()}`,
    orderId,
    amount,
    currency,
    status: "approved",
    provider: "mock-provider",
    createdAt: new Date().toISOString(),
  };

  try {
    if (!pool) {
      inMemoryPayments.unshift(payment);
      return res.status(201).json(payment);
    }

    const result = await pool.query(
      `
      INSERT INTO payments (
        id, order_id, amount, currency, status, provider, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, order_id, amount, currency, status, provider, created_at;
      `,
      [
        payment.id,
        payment.orderId,
        payment.amount,
        payment.currency,
        payment.status,
        payment.provider,
        payment.createdAt,
      ]
    );

    return res.status(201).json(mapPayment(result.rows[0]));
  } catch (error) {
    console.error("Failed to authorize payment:", error);

    return res.status(500).json({
      message: "Failed to authorize payment",
    });
  }
});

app.get("/api/payments", async (req, res) => {
  try {
    if (!pool) {
      return res.json(inMemoryPayments);
    }

    const result = await pool.query(`
      SELECT id, order_id, amount, currency, status, provider, created_at
      FROM payments
      ORDER BY created_at DESC;
    `);

    return res.json(result.rows.map(mapPayment));
  } catch (error) {
    console.error("Failed to fetch payments:", error);

    return res.status(500).json({
      message: "Failed to fetch payments",
    });
  }
});

app.get("/api/payments/:id", async (req, res) => {
  try {
    if (!pool) {
      const payment = inMemoryPayments.find((item) => item.id === req.params.id);

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      return res.json(payment);
    }

    const result = await pool.query(
      `
      SELECT id, order_id, amount, currency, status, provider, created_at
      FROM payments
      WHERE id = $1;
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Payment not found" });
    }

    return res.json(mapPayment(result.rows[0]));
  } catch (error) {
    console.error("Failed to fetch payment:", error);

    return res.status(500).json({
      message: "Failed to fetch payment",
    });
  }
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`payment-service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start payment-service:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down payment-service...");

  if (pool) {
    await pool.end();
  }

  process.exit(0);
});

startServer();
