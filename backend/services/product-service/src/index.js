import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;

const DATABASE_URL = process.env.DATABASE_URL;

const fallbackProducts = [
  {
    id: "p-001",
    name: "Aurora Wireless Headset",
    category: "Audio",
    price: 89,
    old_price: 129,
    rating: 4.8,
    stock: "In stock",
    image: "🎧",
    badge: "Best Seller",
    description:
      "Premium noise isolation, 40h battery life, and ultra-fast USB-C charging.",
  },
  {
    id: "p-002",
    name: "Nova Smart Watch",
    category: "Wearables",
    price: 149,
    old_price: 199,
    rating: 4.7,
    stock: "In stock",
    image: "⌚",
    badge: "New Arrival",
    description:
      "Fitness tracking, calls, sleep insights, water resistance, and AMOLED display.",
  },
  {
    id: "p-003",
    name: "Volt 65W Charger",
    category: "Accessories",
    price: 39,
    old_price: 59,
    rating: 4.9,
    stock: "Fast shipping",
    image: "🔌",
    badge: "Hot Deal",
    description:
      "Compact GaN charger with dual USB-C ports and smart device protection.",
  },
  {
    id: "p-004",
    name: "Pixel Desk Lamp",
    category: "Office",
    price: 69,
    old_price: null,
    rating: 4.6,
    stock: "In stock",
    image: "💡",
    badge: "Editor Choice",
    description:
      "Minimal LED desk lamp with warm/cool modes and wireless phone charging.",
  },
  {
    id: "p-005",
    name: "Orbit Mechanical Keyboard",
    category: "Computing",
    price: 119,
    old_price: 149,
    rating: 4.9,
    stock: "Limited stock",
    image: "⌨️",
    badge: "Pro Pick",
    description:
      "Hot-swappable switches, aluminum frame, RGB lighting, and low-latency typing.",
  },
  {
    id: "p-006",
    name: "Cloud Travel Backpack",
    category: "Lifestyle",
    price: 79,
    old_price: null,
    rating: 4.5,
    stock: "In stock",
    image: "🎒",
    badge: "Travel Ready",
    description:
      "Water-resistant backpack with laptop protection and smart compartments.",
  },
];

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    oldPrice: row.old_price === null ? undefined : Number(row.old_price),
    rating: Number(row.rating),
    stock: row.stock,
    image: row.image,
    badge: row.badge,
    description: row.description,
  };
}

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
} else {
  console.warn("DATABASE_URL is not set. Product service will use fallback data.");
}

async function initializeDatabase() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      old_price NUMERIC(10, 2),
      rating NUMERIC(2, 1) NOT NULL,
      stock VARCHAR(100) NOT NULL,
      image VARCHAR(20) NOT NULL,
      badge VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  for (const product of fallbackProducts) {
    await pool.query(
      `
      INSERT INTO products (
        id, name, category, price, old_price, rating, stock, image, badge, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING;
      `,
      [
        product.id,
        product.name,
        product.category,
        product.price,
        product.old_price,
        product.rating,
        product.stock,
        product.image,
        product.badge,
        product.description,
      ]
    );
  }
}

app.get("/health", async (req, res) => {
  if (!pool) {
    return res.status(200).json({
      status: "ok",
      service: "product-service",
      database: "not_configured",
    });
  }

  try {
    await pool.query("SELECT 1");
    return res.status(200).json({
      status: "ok",
      service: "product-service",
      database: "connected",
    });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      service: "product-service",
      database: "unavailable",
    });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    if (!pool) {
      return res.json(fallbackProducts.map(mapProduct));
    }

    const result = await pool.query(`
      SELECT
        id, name, category, price, old_price, rating, stock, image, badge, description
      FROM products
      ORDER BY id ASC;
    `);

    return res.json(result.rows.map(mapProduct));
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    if (!pool) {
      const product = fallbackProducts.find((item) => item.id === req.params.id);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      return res.json(mapProduct(product));
    }

    const result = await pool.query(
      `
      SELECT
        id, name, category, price, old_price, rating, stock, image, badge, description
      FROM products
      WHERE id = $1;
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(mapProduct(result.rows[0]));
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`product-service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start product-service:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down product-service...");

  if (pool) {
    await pool.end();
  }

  process.exit(0);
});

startServer();
