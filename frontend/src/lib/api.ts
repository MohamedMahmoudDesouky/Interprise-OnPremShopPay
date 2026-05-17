export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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

export async function getProducts(): Promise<Product[]> {
  return request<Product[]>("/api/products");
}

export async function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

export async function createProduct(data: ProductPayload): Promise<Product> {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: ProductPayload): Promise<Product> {
  return request<Product>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  return request<void>(`/api/products/${id}`, {
    method: "DELETE",
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
