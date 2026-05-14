import type { Product } from "./api";

export type CartItem = Product & {
  quantity: number;
};

const CART_KEY = "shoppay_cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  const rawCart = localStorage.getItem(CART_KEY);

  if (!rawCart) return [];

  try {
    return JSON.parse(rawCart) as CartItem[];
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}

export function addToCart(product: Product) {
  const currentCart = getCart();

  const existingItem = currentCart.find((item) => item.id === product.id);

  if (existingItem) {
    const updatedCart = currentCart.map((item) =>
      item.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    );

    saveCart(updatedCart);
    return;
  }

  saveCart([...currentCart, { ...product, quantity: 1 }]);
}

export function removeFromCart(productId: string) {
  const updatedCart = getCart().filter((item) => item.id !== productId);
  saveCart(updatedCart);
}

export function clearCart() {
  saveCart([]);
}
