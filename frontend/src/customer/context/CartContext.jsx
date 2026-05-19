import { createContext, useContext, useState, useEffect } from "react";
import { useMockData } from "../../context/MockDataContext.jsx";
import { getCart, upsertCartItem, removeCartItem, clearCartRemote } from "../../lib/cartService.js";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { session } = useMockData();
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartBump, setCartBump] = useState(0);

  useEffect(() => {
    if (!session?.userId) {
      setCart([]);
      return;
    }
    getCart(session.userId)
      .then((items) => setCart(items))
      .catch(() => {});
  }, [session?.userId]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      const newQty = existing ? existing.qty + 1 : 1;
      if (session?.userId) {
        upsertCartItem(session.userId, product, newQty).catch(() => {});
      }
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: newQty } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setCartBump((n) => n + 1);
  };

  const updateQty = (id, delta) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        if (session?.userId) removeCartItem(session.userId, id).catch(() => {});
        return prev.filter((i) => i.id !== id);
      }
      if (session?.userId) upsertCartItem(session.userId, item, newQty).catch(() => {});
      return prev.map((i) => i.id === id ? { ...i, qty: newQty } : i);
    });
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
    if (session?.userId) removeCartItem(session.userId, id).catch(() => {});
  };

  const clearCart = () => {
    setCart([]);
    if (session?.userId) clearCartRemote(session.userId).catch(() => {});
  };

  return (
    <CartContext.Provider
      value={{ cart, cartOpen, setCartOpen, addToCart, updateQty, removeItem, clearCart, cartCount, cartTotal, cartBump }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
