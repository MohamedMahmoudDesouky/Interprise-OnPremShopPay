export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  stock: string;
  image: string;
  description: string;
  badge: string;
};

export const products: Product[] = [
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
    badge: "Top Rated",
    description: "Water-resistant smart backpack with laptop protection and hidden pockets."
  }
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}
