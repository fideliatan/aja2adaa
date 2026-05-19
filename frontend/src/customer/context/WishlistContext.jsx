import { createContext, useContext, useState, useEffect } from "react";
import { useMockData } from "../../context/MockDataContext.jsx";
import { getWishlist, addWishlistItem, removeWishlistItem } from "../../lib/wishlistService.js";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { session } = useMockData();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    if (!session?.userId) {
      setWishlistItems([]);
      setFavorites(new Set());
      return;
    }
    getWishlist(session.userId)
      .then((items) => {
        setWishlistItems(items);
        setFavorites(new Set(items.map((i) => i.id)));
      })
      .catch(() => {});
  }, [session?.userId]);

  const addToWishlist = (product) => {
    setWishlistItems((prev) => {
      if (prev.find((i) => i.id === product.id)) return prev;
      if (session?.userId) addWishlistItem(session.userId, product).catch(() => {});
      return [...prev, product];
    });
    setFavorites((prev) => new Set([...prev, product.id]));
  };

  const removeFromWishlist = (id) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== id));
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (session?.userId) removeWishlistItem(session.userId, id).catch(() => {});
  };

  const toggleFavorite = (id) => {
    if (favorites.has(id)) {
      removeFromWishlist(id);
    } else {
      setFavorites((prev) => new Set([...prev, id]));
    }
  };

  const isFavorite = (id) => favorites.has(id);

  return (
    <WishlistContext.Provider
      value={{ wishlistItems, favorites, addToWishlist, removeFromWishlist, toggleFavorite, isFavorite, setWishlistItems }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
