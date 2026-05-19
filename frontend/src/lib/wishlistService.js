import api from "./api.js";

export async function getWishlist(userId) {
  const { data } = await api.get("/api/store/wishlist/", { params: { userId } });
  return data.items ?? [];
}

export async function addWishlistItem(userId, product) {
  await api.post("/api/store/wishlist/", { userId, product });
}

export async function removeWishlistItem(userId, productId) {
  await api.delete(`/api/store/wishlist/${productId}/`, { params: { userId } });
}
