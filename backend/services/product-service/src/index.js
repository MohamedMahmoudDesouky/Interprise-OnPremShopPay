import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

const products = [
  {
    id: "p-001",
    name: "Aurora Wireless Headset",
    category: "Audio",
    price: 89,
    oldPrice: 129,
    rating: 4.8,
    stock: "In stock",
    image: "🎧",
    badge: "Best Seller",
    description: "Premium noise isolation, 40h battery life, and ultra-fast USB-C charging."
  },
  {
    id: "p-002",
    name: "Nova Smart Watch",
    category: "Wearables",
    price: 149,
    oldPrice: 199,
    rating: 4.7,
    stock: "In stock",
    image: "⌚",
    badge: "New Arrival",
    description: "Fitness tracking, calls, sleep insights, water resistance, and AMOLED display."
  },
  {
    id: "p-003",
    name: "Volt 65W Charger",
    category: "Accessories",
    price: 39,
    oldPrice: 59,
    rating: 4.9,
    stock: "Fast shipping",
    image: "🔌",
    badge: "Hot Deal",
    description: "Compact GaN charger with dual USB-C ports and smart device protection."
  },
  {
    id: "p-004",
    name: "Pixel Desk Lamp",
    category: "Office",
    price: 69,
    rating: 4.6,
    stock: "In stock",
    image: "💡",
    badge: "Editor Choice",
    description: "Minimal LED desk lamp with warm/cool modes and wireless phone charging."
  },
  {
    id: "p-005",
    name: "Orbit Mechanical Keyboard",
    category: "Computing",
    price: 119,
    oldPrice: 149,
    rating: 4.9,
    stock: "Limited stock",
    image: "⌨️",
    badge: "Pro Pick",
    description: "Hot-swappable switches, aluminum frame, RGB lighting, and low-latency typing."
  },
  {
    id: "p-006",
    name: "Cloud Travel Backpack",
    category: "Lifestyle",
    price: 79,
    rating: 4.5,
    stock: "In stock",
    image: "🎒",
    badge: "Travel Ready",
    description: "Water-resistant backpack with laptop protection and smart compartments."
  }
];

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "product-service" });
});

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((item) => item.id === req.params.id);

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  return res.json(product);
});

app.listen(PORT, () => {
  console.log(`product-service is running on port ${PORT}`);
});
