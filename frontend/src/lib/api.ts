export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const ADMIN_TOKEN_KEY = "shoppay-admin-token";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  stock: string;
  image: string;
  badge: string;
  description: string;
};

export type ProductPayload = {
  id?: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  rating: number;
  stock: string;
  image: string;
  badge: string;
  description: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  price: number;
};

export type Customer = {
  name: string;
  email: string;
};

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  window.dispatchEvent(new Event("admin-auth-updated"));
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  window.dispatchEvent(new Event("admin-auth-updated"));
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function loginAdmin(data: {
  username: string;
  password: string;
}): Promise<{
  token: string;
  user: {
    username: string;
    role: string;
  };
}> {
  return request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getCurrentAdmin(): Promise<{
  user: {
    username: string;
    role: string;
  };
}> {
  return request("/api/admin/me", {
    headers: {
      ...adminHeaders(),
    },
  });
}

export async function getProducts(): Promise<Product[]> {
  return request<Product[]>("/api/products");
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

export async function createProduct(data: ProductPayload): Promise<Product> {
  return request<Product>("/api/products", {
    method: "POST",
    headers: {
      ...adminHeaders(),
    },
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: ProductPayload): Promise<Product> {
  return request<Product>(`/api/products/${id}`, {
    method: "PUT",
    headers: {
      ...adminHeaders(),
    },
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return request<void>(`/api/products/${id}`, {
    method: "DELETE",
    headers: {
      ...adminHeaders(),
    },
  });
}

export async function sendContactMessage(data: {
  name: string;
  email: string;
  message: string;
  topic?: string;
}) {
  return request("/api/contact/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createOrder(data: {
  customer: Customer;
  items: CartItem[];
  total: number;
}) {
  return request("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
