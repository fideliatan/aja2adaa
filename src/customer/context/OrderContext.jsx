import { createContext, useContext, useState, useEffect } from "react";

const OrderContext = createContext(null);

/* ── Initial demo orders (pre-seeded for admin to manage) ── */
const SEED_ORDERS = [
  {
    id: "ORD-011", status: "pending", customer: "Sara Tancredi", date: "15 Apr 2025",
    items: [
      { name: "Vitamin C Serum",      qty: 1, price: 149000, image: "https://placehold.co/72x72/fff3e0/c4706a?text=VitC" },
      { name: "Sunscreen Aqua Gel",   qty: 1, price: 145000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=SPF"  },
    ],
    subtotal: 294000, deliveryFee: 0, total: 294000,
    payment: "BCA Transfer", paymentAccount: "1234-5678-90",
    recipient: "Sara Tancredi", phone: "(+98) 9123728167",
    address: "Jl. Sudirman No. 12, Jakarta",
    paymentProof: "bukti_tf.jpg",
    rejectionReason: null, trackingNumber: null, courier: null,
    cancelDeadlineTs: Date.now() + 23 * 60 * 60 * 1000,
  },
  {
    id: "ORD-014", status: "packing", customer: "Rina Kusuma", date: "15 Apr 2025",
    items: [
      { name: "Retinol Night Cream", qty: 1, price: 210000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=RC" },
    ],
    subtotal: 210000, deliveryFee: 0, total: 210000,
    payment: "OVO", paymentAccount: "0812-3456-7890",
    recipient: "Rina Kusuma", phone: "0821-0000-0001",
    address: "Jl. Malioboro No. 88, Yogyakarta",
    paymentProof: "bukti_ovo.jpg",
    rejectionReason: null, trackingNumber: null, courier: null,
    cancelDeadlineTs: null,
  },
  {
    id: "ORD-017", status: "shipped", customer: "Dewi Larasati", date: "14 Apr 2025",
    items: [
      { name: "Hyaluronic Acid Serum",  qty: 1, price: 189000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=HA"  },
      { name: "Ceramide Barrier Cream", qty: 1, price: 146000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=CB"  },
    ],
    subtotal: 335000, deliveryFee: 0, total: 335000,
    payment: "BNI Transfer", paymentAccount: "0987-6543-21",
    recipient: "Dewi Larasati", phone: "0822-0000-0002",
    address: "Jl. Diponegoro No. 7, Medan",
    paymentProof: "bukti_bni.jpg",
    rejectionReason: null, trackingNumber: "JNE20250414001", courier: "JNE Regular",
    cancelDeadlineTs: null,
  },
  {
    id: "ORD-007", status: "delivered", customer: "Sara Tancredi", date: "5 Apr 2025",
    items: [
      { name: "Sunscreen Aqua Gel SPF 50",       qty: 2, price: 99000,  image: "https://placehold.co/72x72/fce8e6/c4706a?text=SPF" },
      { name: "5X Ceramide Barrier Moisture Gel", qty: 1, price: 149000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=Gel" },
    ],
    subtotal: 347000, deliveryFee: 15000, total: 362000,
    payment: "BCA Transfer", paymentAccount: "1234-5678-90",
    recipient: "Sara Tancredi", phone: "(+98) 9123728167",
    address: "123 Main Street, New York, NY 10001, USA",
    paymentProof: "bukti_bca.jpg",
    rejectionReason: null, trackingNumber: "JNE20250405001", courier: "JNE Regular",
    cancelDeadlineTs: null,
  },
];

function load() {
  try {
    const saved = localStorage.getItem("coy_orders_v2");
    if (saved) {
      const orders = JSON.parse(saved);
      // Migrate: replace "__img__" placeholders left over from old split-storage format
      return orders.map(o => ({
        ...o,
        paymentProof:  o.paymentProof  === "__img__" ? null : o.paymentProof,
        deliveryProof: o.deliveryProof === "__img__" ? null : o.deliveryProof,
      }));
    }
  } catch (_) {}
  return SEED_ORDERS;
}

function save(orders) {
  try { localStorage.setItem("coy_orders_v2", JSON.stringify(orders)); } catch (_) {}
}

function loadReturns() {
  try {
    const saved = localStorage.getItem("coy_returns_v1");
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return [];
}

function saveReturns(returns) {
  try { localStorage.setItem("coy_returns_v1", JSON.stringify(returns)); } catch (_) {}
}

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(load);
  const [returns, setReturns] = useState(loadReturns);

  useEffect(() => {
    save(orders);
  }, [orders]);

  useEffect(() => { saveReturns(returns); }, [returns]);

  // Sync across browser tabs via storage events
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "coy_orders_v2") {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed) setOrders(parsed);
        } catch (_) {}
      }
      if (e.key === "coy_returns_v1") {
        try { const v = JSON.parse(e.newValue); if (v) setReturns(v); } catch (_) {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = (id, patch) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));

  const addOrder    = (order)               => setOrders(prev => [order, ...prev]);
  const cancelOrder = (id, reason)           => update(id, { status: "cancelled", cancelReason: reason ?? null });
  const approveOrder= (id)                  => update(id, { status: "packing", cancelDeadlineTs: null });
  const rejectOrder = (id, reason)          => update(id, { status: "rejected", rejectionReason: reason });
  const shipOrder   = (id, courier, tracking) => update(id, { status: "shipped", courier, trackingNumber: tracking });
  const deliverOrder= (id, deliveryProof)   => update(id, { status: "delivered", deliveryProof: deliveryProof ?? null });
  const getOrder    = (id)                  => orders.find(o => o.id === id);
  const addReturn   = (ret)                 => setReturns(prev => [ret, ...prev]);
  const updateReturn= (id, patch)           => setReturns(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  return (
    <OrderContext.Provider value={{
      orders, addOrder, cancelOrder, approveOrder, rejectOrder, shipOrder, deliverOrder, getOrder,
      returns, addReturn, updateReturn,
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export const useOrders = () => useContext(OrderContext);
