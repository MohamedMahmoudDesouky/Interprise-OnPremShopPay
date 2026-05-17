"use client";
import ProductMedia from "@/components/ProductMedia";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  getProducts,
  Product,
  ProductPayload,
  updateProduct,
} from "@/lib/api";

const emptyForm: ProductPayload = {
  id: "",
  name: "",
  category: "",
  price: 0,
  oldPrice: null,
  rating: 4.5,
  stock: "In stock",
  image: "📦",
  badge: "New",
  description: "",
};

function toNumber(value: FormDataEntryValue | null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [search, setSearch] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      setStatusType("error");
      setStatus("Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        product.id.toLowerCase().includes(keyword) ||
        product.badge.toLowerCase().includes(keyword)
      );
    });
  }, [products, search]);

  function updateField<K extends keyof ProductPayload>(
    key: K,
    value: ProductPayload[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setStatus("");
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      oldPrice: product.oldPrice ?? null,
      rating: product.rating,
      stock: product.stock,
      image: product.image,
      badge: product.badge,
      description: product.description,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const payload: ProductPayload = {
      id: String(formData.get("id") || "").trim(),
      name: String(formData.get("name") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      price: toNumber(formData.get("price")),
      oldPrice:
        String(formData.get("oldPrice") || "").trim() === ""
          ? null
          : toNumber(formData.get("oldPrice")),
      rating: toNumber(formData.get("rating")),
      stock: String(formData.get("stock") || "").trim(),
      image: String(formData.get("image") || "").trim(),
      badge: String(formData.get("badge") || "").trim(),
      description: String(formData.get("description") || "").trim(),
    };

    if (!editingId && !payload.id) {
      setStatusType("error");
      setStatus("Product ID is required.");
      return;
    }

    if (!payload.name || !payload.category || !payload.stock || !payload.image || !payload.badge || !payload.description) {
      setStatusType("error");
      setStatus("Please fill all required fields.");
      return;
    }

    if (payload.price <= 0) {
      setStatusType("error");
      setStatus("Price must be greater than 0.");
      return;
    }

    if (payload.rating < 0 || payload.rating > 5) {
      setStatusType("error");
      setStatus("Rating must be between 0 and 5.");
      return;
    }

    try {
      setSaving(true);
      setStatus("");

      if (editingId) {
        await updateProduct(editingId, {
          ...payload,
          id: undefined,
        });

        setStatusType("success");
        setStatus(`Product ${editingId} updated successfully.`);
      } else {
        await createProduct(payload);

        setStatusType("success");
        setStatus(`Product ${payload.id} created successfully.`);
      }

      resetForm();
      await loadProducts();
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteProduct(product.id);
      setStatusType("success");
      setStatus(`Product ${product.id} deleted successfully.`);

      if (editingId === product.id) {
        resetForm();
      }

      await loadProducts();
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "Failed to delete product.");
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero admin-hero">
        <p className="eyebrow">Admin Products</p>
        <h1>Manage ShopPay products.</h1>
        <p>
          Add, update, and delete real products stored in productdb through
          product-service and Kong Gateway.
        </p>
      </section>

      <section className="admin-layout">
        <form className="form-card admin-product-form" onSubmit={handleSubmit}>
          <div className="admin-form-header">
            <div>
              <p className="eyebrowText">
                {editingId ? "Edit product" : "Create product"}
              </p>
              <h2>{editingId ? editingId : "New product"}</h2>
            </div>

            {editingId && (
              <button className="secondary-admin-button" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>

          <div className="form-grid">
            <label>
              Product ID
              <input
                name="id"
                type="text"
                placeholder="p-010"
                value={form.id || ""}
                disabled={Boolean(editingId)}
                onChange={(event) => updateField("id", event.target.value)}
                required={!editingId}
              />
            </label>

            <label>
              Name
              <input
                name="name"
                type="text"
                placeholder="Product name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Category
              <input
                name="category"
                type="text"
                placeholder="Computing"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                required
              />
            </label>

            <label>
              Stock
              <input
                name="stock"
                type="text"
                placeholder="In stock"
                value={form.stock}
                onChange={(event) => updateField("stock", event.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Price
              <input
                name="price"
                type="number"
                min="1"
                step="0.01"
                placeholder="99"
                value={form.price || ""}
                onChange={(event) => updateField("price", Number(event.target.value))}
                required
              />
            </label>

            <label>
              Old price
              <input
                name="oldPrice"
                type="number"
                min="1"
                step="0.01"
                placeholder="129"
                value={form.oldPrice ?? ""}
                onChange={(event) =>
                  updateField(
                    "oldPrice",
                    event.target.value === "" ? null : Number(event.target.value)
                  )
                }
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Rating
              <input
                name="rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder="4.8"
                value={form.rating}
                onChange={(event) => updateField("rating", Number(event.target.value))}
                required
              />
            </label>

            <label>
              Badge
              <input
                name="badge"
                type="text"
                placeholder="New Arrival"
                value={form.badge}
                onChange={(event) => updateField("badge", event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Image emoji or image URL
            <input
              name="image"
              type="text"
              placeholder="🖱️ or https://example.com/image.png"
              value={form.image}
              onChange={(event) => updateField("image", event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              placeholder="Write a short product description."
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId
                ? "Update product"
                : "Create product"}
          </button>

          {status && (
            <p className={`status-message ${statusType === "error" ? "status-error" : ""}`}>
              {status}
            </p>
          )}
        </form>

        <aside className="admin-products-panel">
          <div className="admin-list-header">
            <div>
              <p className="eyebrowText">Product database</p>
              <h2>{products.length} products</h2>
            </div>

            <button className="secondary-admin-button" type="button" onClick={loadProducts}>
              Refresh
            </button>
          </div>

          <input
            className="admin-search"
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {loading && <p className="muted">Loading products...</p>}

          {!loading && filteredProducts.length === 0 && (
            <p className="muted">No products found.</p>
          )}

          <div className="admin-products-list">
            {filteredProducts.map((product) => (
              <article className="admin-product-row" key={product.id}>
		<div className="admin-product-image">
  		  <ProductMedia value={product.image} alt={product.name} />
		</div>
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {product.id} • {product.category} • ${product.price}
                  </small>
                  <p>{product.description}</p>
                </div>

                <div className="admin-product-actions">
                  <button type="button" onClick={() => startEdit(product)}>
                    Edit
                  </button>

                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => handleDelete(product)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
