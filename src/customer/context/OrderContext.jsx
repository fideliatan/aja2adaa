import { createContext, useContext, useState, useEffect } from "react";
import { SEED_ORDERS, SEED_RETURNS } from "../../data/seeds.js";
import { KEYS, loadFromStorage, saveToStorage, migrateOrders } from "../../lib/storage.js";

const OrderContext = createContext(null);

function load() {
  const saved = loadFromStorage(KEYS.ORDERS, null);
  if (saved) return migrateOrders(saved);
  return SEED_ORDERS;
}

function save(orders) {
  saveToStorage(KEYS.ORDERS, orders);
}

function loadReturns() {
  return loadFromStorage(KEYS.RETURNS, SEED_RETURNS);
}

function saveReturns(returns) {
  saveToStorage(KEYS.RETURNS, returns);
}

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(load);
  const [returns, setReturns] = useState(loadReturns);

  useEffect(() => { save(orders); }, [orders]);
  useEffect(() => { saveReturns(returns); }, [returns]);

  // Sync across browser tabs via storage events
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEYS.ORDERS) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setOrders(migrateOrders(parsed));
        } catch (_) {}
      }
      if (e.key === KEYS.RETURNS) {
        try {
          const v = JSON.parse(e.newValue);
          if (v) setReturns(v);
        } catch (_) {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (id, patch) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const addOrder     = (order)                  => setOrders((prev) => [order, ...prev]);
  const cancelOrder  = (id, reason)             => update(id, { status: "cancelled", cancelReason: reason ?? null });
  const approveOrder = (id)                     => update(id, { status: "packing", cancelDeadlineTs: null });
  const rejectOrder  = (id, reason)             => update(id, { status: "rejected", rejectionReason: reason });
  const shipOrder    = (id, courier, tracking)  => update(id, { status: "shipped", courier, trackingNumber: tracking });
  const deliverOrder = (id, deliveryProof)      => update(id, { status: "delivered", deliveryProof: deliveryProof ?? null });
  const getOrder     = (id)                     => orders.find((o) => o.id === id);
  const addReturn    = (ret)                    => setReturns((prev) => [ret, ...prev]);
  const updateReturn = (id, patch)              => setReturns((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <OrderContext.Provider
      value={{
        orders, addOrder, cancelOrder, approveOrder, rejectOrder,
        shipOrder, deliverOrder, getOrder,
        returns, addReturn, updateReturn,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => useContext(OrderContext);
