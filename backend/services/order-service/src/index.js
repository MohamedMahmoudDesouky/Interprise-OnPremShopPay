import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;
const DATABASE_URL = process.env.DATABASE_URL;
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:4003";

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  console.warn("DATABASE_URL is not set. Order service will use in-memory storage.");
}

const inMemoryOrders = [];

async function initializeDatabase() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(80) PRIMARY KEY,
      customer JSONB NOT NULL,
      items JSONB NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      payment_id VARCHAR(80),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function mapOrder(row) {
  return {
    id: row.id,
    customer: row.customer,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    paymentId: row.payment_id || undefined,
  };
}

async function saveOrder(order) {
  if (!pool) {
    inMemoryOrders.unshift(order);
    return order;
  }

  const result = await pool.query(
    `
    INSERT INTO orders (
      id, customer, items, total, status, payment_id, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, customer, items, total, status, payment_id, created_at;
    `,
    [
      order.id,
      JSON.stringify(order.customer),
      JSON.stringify(order.items),
      order.total,
      order.status,
      order.paymentId || null,
      order.createdAt,
    ]
  );

  return mapOrder(result.rows[0]);
}

async function authorizePayment(orderId, total) {
  const response = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      amount: total,
      currency: "USD",
    }),
  });

  if (!response.ok) {
    throw new Error(`Payment authorization failed with status ${response.status}`);
  }

  return response.json();
}

app.get("/health", async (req, res) => {
  const paymentUrlConfigured = Boolean(PAYMENT_SERVICE_URL);

  if (!pool) {
    return res.status(200).json({
      status: "ok",
      service: "order-service",
      database: "not_configured",
      paymentService: paymentUrlConfigured ? "configured" : "not_configured",
    });
  }

  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ok",
      service: "order-service",
      database: "connected",
      paymentService: paymentUrlConfigured ? "configured" : "not_configured",
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      service: "order-service",
      database: "unavailable",
      paymentService: paymentUrlConfigured ? "configured" : "not_configured",
    });
  }
});

app.post("/api/orders", async (req, res) => {
  const { customer, items, total } = req.body;

  if (!customer || !Array.isArray(items) || items.length === 0 || !total) {
    return res.status(400).json({
      message: "customer, items, and total are required",
    });
  }

  const order = {
    id: `ord-${Date.now()}`,
    customer,
    items,
    total,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
  };

  try {
    const payment = await authorizePayment(order.id, total);

    order.status = "paid";
    order.paymentId = payment.id;
  } catch (error) {
    console.error("Payment authorization failed:", error.message);
    order.status = "payment_failed";
  }

  try {
    const savedOrder = await saveOrder(order);
    return res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Failed to save order:", error);

    return res.status(500).json({
      message: "Failed to save order",
    });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    if (!pool) {
      return res.json(inMemoryOrders);
    }

    const result = await pool.query(`
      SELECT id, customer, items, total, status, payment_id, created_at
      FROM orders
      ORDER BY created_at DESC;
    `);

    return res.json(result.rows.map(mapOrder));
  } catch (error) {
    console.error("Failed to fetch orders:", error);

    return res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    if (!pool) {
      const order = inMemoryOrders.find((item) => item.id === req.params.id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      return res.json(order);
    }

    const result = await pool.query(
      `
      SELECT id, customer, items, total, status, payment_id, created_at
      FROM orders
      WHERE id = $1;
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json(mapOrder(result.rows[0]));
  } catch (error) {
    console.error("Failed to fetch order:", error);

    return res.status(500).json({
      message: "Failed to fetch order",
    });
  }
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`order-service is running on port ${PORT}`);
      console.log(`payment-service url: ${PAYMENT_SERVICE_URL}`);
    });
  } catch (error) {
    console.error("Failed to start order-service:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down order-service...");

  if (pool) {
    await pool.end();
  }

  process.exit(0);
});

startServer();
