import express from "express";
import cors from "cors";
import pg from "pg";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;
const DATABASE_URL = process.env.DATABASE_URL;
const VAULT_ADMIN_AUTH_FILE =
  process.env.VAULT_ADMIN_AUTH_FILE || "/vault/secrets/admin-auth.json";

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

function readAdminAuthConfig() {
  let fileConfig = {};

  if (fs.existsSync(VAULT_ADMIN_AUTH_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(VAULT_ADMIN_AUTH_FILE, "utf8"));
    } catch (error) {
      console.error("Failed to read Vault admin auth file:", error);
    }
  }

  return {
    adminUsername:
      fileConfig.ADMIN_USERNAME ||
      fileConfig.adminUsername ||
      process.env.ADMIN_USERNAME ||
      "",
    adminPasswordHash:
      fileConfig.ADMIN_PASSWORD_HASH ||
      fileConfig.adminPasswordHash ||
      process.env.ADMIN_PASSWORD_HASH ||
      "",
    jwtSecret:
      fileConfig.JWT_SECRET ||
      fileConfig.jwtSecret ||
      process.env.JWT_SECRET ||
      "",
  };
}

function isAdminAuthConfigured() {
  const config = readAdminAuthConfig();

  return Boolean(
    config.adminUsername &&
      config.adminPasswordHash &&
      config.jwtSecret
  );
}

function createAdminToken(username) {
  const { jwtSecret } = readAdminAuthConfig();

  return jwt.sign(
    {
      sub: username,
      role: "admin",
      service: "product-service",
    },
    jwtSecret,
    {
      expiresIn: "2h",
      issuer: "shoppay-product-service",
      audience: "shoppay-admin",
    }
  );
}

function requireAdminAuth(req, res, next) {
  const { jwtSecret } = readAdminAuthConfig();

  if (!jwtSecret) {
    return res.status(500).json({
      message: "Admin authentication is not configured.",
    });
  }

  const authorization = req.header("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Admin token is required.",
    });
  }

  const token = authorization.replace("Bearer ", "").trim();

  try {
    const payload = jwt.verify(token, jwtSecret, {
      issuer: "shoppay-product-service",
      audience: "shoppay-admin",
    });

    if (payload.role !== "admin") {
      return res.status(403).json({
        message: "Admin role is required.",
      });
    }

    req.admin = {
      username: payload.sub,
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired admin token.",
    });
  }
}

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

function normalizeText(value) {
  return String(value || "").trim();
}

function validateProductPayload(data, mode = "create") {
  const errors = [];

  const price = Number(data.price);
  const oldPrice =
    data.oldPrice === undefined || data.oldPrice === null || data.oldPrice === ""
      ? null
      : Number(data.oldPrice);
  const rating = Number(data.rating);

  if (mode === "create" && !normalizeText(data.id)) {
    errors.push("id is required");
  }

  if (!normalizeText(data.name)) errors.push("name is required");
  if (!normalizeText(data.category)) errors.push("category is required");

  if (!Number.isFinite(price) || price <= 0) {
    errors.push("price must be greater than 0");
  }

  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= 0)) {
    errors.push("oldPrice must be greater than 0 when provided");
  }

  if (!Number.isFinite(rating)) {
    errors.push("rating is required");
  } else if (rating < 0 || rating > 5) {
    errors.push("rating must be between 0 and 5");
  }

  if (!normalizeText(data.stock)) errors.push("stock is required");
  if (!normalizeText(data.image)) errors.push("image is required");
  if (!normalizeText(data.badge)) errors.push("badge is required");
  if (!normalizeText(data.description)) errors.push("description is required");

  return errors;
}

function getProductValues(data) {
  return {
    name: normalizeText(data.name),
    category: normalizeText(data.category),
    price: Number(data.price),
    oldPrice:
      data.oldPrice === undefined || data.oldPrice === null || data.oldPrice === ""
        ? null
        : Number(data.oldPrice),
    rating: Number(data.rating),
    stock: normalizeText(data.stock),
    image: normalizeText(data.image),
    badge: normalizeText(data.badge),
    description: normalizeText(data.description),
  };
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
      image VARCHAR(500) NOT NULL,
      badge VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);

  await pool.query(`
    ALTER TABLE products
      ALTER COLUMN image TYPE VARCHAR(500);
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
      adminAuth: isAdminAuthConfigured() ? "configured" : "not_configured",
    });
  }

  try {
    await pool.query("SELECT 1");

    return res.status(200).json({
      status: "ok",
      service: "product-service",
      database: "connected",
      adminAuth: isAdminAuthConfigured() ? "configured" : "not_configured",
    });
  } catch {
    return res.status(503).json({
      status: "error",
      service: "product-service",
      database: "unavailable",
      adminAuth: isAdminAuthConfigured() ? "configured" : "not_configured",
    });
  }
});

app.post("/api/admin/login", async (req, res) => {
  const { adminUsername, adminPasswordHash } = readAdminAuthConfig();

  if (!adminUsername || !adminPasswordHash) {
    return res.status(500).json({
      message: "Admin authentication is not configured.",
    });
  }

  const username = normalizeText(req.body.username);
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required.",
    });
  }

  if (username !== adminUsername) {
    return res.status(401).json({
      message: "Invalid admin credentials.",
    });
  }

  const passwordMatches = await bcrypt.compare(password, adminPasswordHash);

  if (!passwordMatches) {
    return res.status(401).json({
      message: "Invalid admin credentials.",
    });
  }

  const token = createAdminToken(username);

  return res.status(200).json({
    token,
    user: {
      username,
      role: "admin",
    },
  });
});

app.get("/api/admin/me", requireAdminAuth, (req, res) => {
  return res.status(200).json({
    user: req.admin,
  });
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
      ORDER BY created_at DESC, id ASC;
    `);

    return res.json(result.rows.map(mapProduct));
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
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
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

app.post("/api/products", requireAdminAuth, async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      message: "Database is not configured. Product creation is unavailable.",
    });
  }

  const errors = validateProductPayload(req.body, "create");

  if (errors.length > 0) {
    return res.status(400).json({ message: "Invalid product data", errors });
  }

  const product = getProductValues(req.body);
  const id = normalizeText(req.body.id);

  try {
    const result = await pool.query(
      `
      INSERT INTO products (
        id, name, category, price, old_price, rating, stock, image, badge, description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, category, price, old_price, rating, stock, image, badge, description;
      `,
      [
        id,
        product.name,
        product.category,
        product.price,
        product.oldPrice,
        product.rating,
        product.stock,
        product.image,
        product.badge,
        product.description,
      ]
    );

    return res.status(201).json(mapProduct(result.rows[0]));
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Product id already exists",
      });
    }

    console.error("Failed to create product:", error);
    return res.status(500).json({ message: "Failed to create product" });
  }
});

app.put("/api/products/:id", requireAdminAuth, async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      message: "Database is not configured. Product update is unavailable.",
    });
  }

  const errors = validateProductPayload(req.body, "update");

  if (errors.length > 0) {
    return res.status(400).json({ message: "Invalid product data", errors });
  }

  const product = getProductValues(req.body);

  try {
    const result = await pool.query(
      `
      UPDATE products
      SET
        name = $1,
        category = $2,
        price = $3,
        old_price = $4,
        rating = $5,
        stock = $6,
        image = $7,
        badge = $8,
        description = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING id, name, category, price, old_price, rating, stock, image, badge, description;
      `,
      [
        product.name,
        product.category,
        product.price,
        product.oldPrice,
        product.rating,
        product.stock,
        product.image,
        product.badge,
        product.description,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json(mapProduct(result.rows[0]));
  } catch (error) {
    console.error("Failed to update product:", error);
    return res.status(500).json({ message: "Failed to update product" });
  }
});

app.delete("/api/products/:id", requireAdminAuth, async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      message: "Database is not configured. Product deletion is unavailable.",
    });
  }

  try {
    const result = await pool.query(
      `
      DELETE FROM products
      WHERE id = $1
      RETURNING id;
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete product:", error);
    return res.status(500).json({ message: "Failed to delete product" });
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
