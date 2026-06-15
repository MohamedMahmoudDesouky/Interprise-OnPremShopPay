import express from "express";
import cors from "cors";
import pg from "pg";
import promClient from "prom-client";

const { Pool } = pg;

const app = express();

app.use(cors());
app.use(express.json());
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// 2. إضافة مقياس مخصص لزمن استجابة الـ HTTP
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5] 
});
register.registerMetric(httpRequestDurationMicroseconds);

// 3. Middleware لقياس وقت الاستجابة لكل Request
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ 
      method: req.method, 
      route: req.route?.path || req.path, 
      code: res.statusCode 
    });
  });
  next();
});
const PORT = process.env.PORT || 4004;
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
  console.warn("DATABASE_URL is not set. Contact service will use in-memory storage.");
}

const inMemoryMessages = [];

async function initializeDatabase() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id VARCHAR(80) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      topic VARCHAR(100) NOT NULL DEFAULT 'general',
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function mapMessage(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    message: row.message,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

app.get("/health", async (req, res) => {
  if (!pool) {
    return res.status(200).json({
      status: "ok",
      service: "contact-service",
      database: "not_configured",
    });
  }

  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ok",
      service: "contact-service",
      database: "connected",
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      service: "contact-service",
      database: "unavailable",
    });
  }
});

app.post("/api/contact/messages", async (req, res) => {
  const { name, email, topic = "general", message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      message: "name, email, and message are required",
    });
  }

  const contactMessage = {
    id: `msg-${Date.now()}`,
    name,
    email,
    topic,
    message,
    createdAt: new Date().toISOString(),
  };

  try {
    if (!pool) {
      inMemoryMessages.unshift(contactMessage);
      return res.status(201).json(contactMessage);
    }

    const result = await pool.query(
      `
      INSERT INTO contact_messages (
        id, name, email, topic, message, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, topic, message, created_at;
      `,
      [
        contactMessage.id,
        contactMessage.name,
        contactMessage.email,
        contactMessage.topic,
        contactMessage.message,
        contactMessage.createdAt,
      ]
    );

    return res.status(201).json(mapMessage(result.rows[0]));
  } catch (error) {
    console.error("Failed to save contact message:", error);

    return res.status(500).json({
      message: "Failed to save contact message",
    });
  }
});

app.get("/api/contact/messages", async (req, res) => {
  try {
    if (!pool) {
      return res.json(inMemoryMessages);
    }

    const result = await pool.query(`
      SELECT id, name, email, topic, message, created_at
      FROM contact_messages
      ORDER BY created_at DESC;
    `);

    return res.json(result.rows.map(mapMessage));
  } catch (error) {
    console.error("Failed to fetch contact messages:", error);

    return res.status(500).json({
      message: "Failed to fetch contact messages",
    });
  }
});
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`contact-service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start contact-service:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down contact-service...");

  if (pool) {
    await pool.end();
  }

  process.exit(0);
});

startServer();
