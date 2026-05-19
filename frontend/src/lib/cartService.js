import api from "./api.js";

export async function getCart(userId) {
  const { data } = await api.get("/api/store/cart/", { params: { userId } });
  return data.items ?? [];
}

export async function upsertCartItem(userId, product, qty) {
  await api.post("/api/store/cart/", { userId, product, qty });
}

export async function removeCartItem(userId, productId) {
  await api.delete(`/api/store/cart/${productId}/`, { params: { userId } });
}

export async function clearCartRemote(userId) {
  await api.delete("/api/store/cart/", { params: { userId } });
}
