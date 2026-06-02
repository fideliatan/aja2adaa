import { useState, useEffect } from "react";
import { ShoppingBag, CreditCard, Truck, RotateCcw, Star } from "lucide-react";
import { useMockData } from "../../context/MockDataContext.jsx";
import { getAdminNotifications } from "../risk-data.js";

/* ═══════════════════════════════════════════════════════════
   SECTION: NOTIFICATIONS
   ═══════════════════════════════════════════════════════════ */
const NOTIF_TYPE_META = {
  order:   { label: "Pesanan",       color: "#e09a3a", bg: "rgba(224,154,58,0.08)",   icon: <ShoppingBag size={16} /> },
  payment: { label: "Pembayaran",    color: "#22c55e", bg: "rgba(34,197,94,0.08)",    icon: <CreditCard size={16} /> },
  shipped: { label: "Pengiriman",    color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",  icon: <Truck size={16} /> },
  return:  { label: "Pengembalian",  color: "#ef4444", bg: "rgba(239,68,68,0.08)",    icon: <RotateCcw size={16} /> },
  review:  { label: "Ulasan",        color: "#4a9fd4", bg: "rgba(74,159,212,0.08)",  icon: <Star size={16} /> },
};

export default function Notifications() {
  const { mockStore } = useMockData();
  const [notifs, setNotifs] = useState(() => getAdminNotifications(mockStore));
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setNotifs(getAdminNotifications(mockStore));
  }, [mockStore]);

  const unread = notifs.filter(n => !n.read).length;
  const types  = ["all", "order", "payment", "shipped", "return", "review"];

  const filtered = notifs.filter(n => filter === "all" || n.type === filter);

  const markRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss = (id) => setNotifs(prev => prev.filter(n => n.id !== id));

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Notifikasi</h2>
          <p className="adm-section-sub">{unread} belum dibaca · {notifs.length} total</p>
        </div>
        {unread > 0 && (
          <button className="adm-ghost-btn" onClick={markAllRead}>Tandai semua telah dibaca</button>
        )}
      </div>

      {/* Filter pills */}
      <div className="adm-notif-filters">
        {types.map(t => (
          <button
            key={t}
            className={`adm-cat-pill${filter === t ? " adm-cat-pill--active" : ""}`}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "Semua" : NOTIF_TYPE_META[t].label}
            {t === "all"
              ? <span className="adm-tab-count">{notifs.length}</span>
              : <span className="adm-tab-count">{notifs.filter(n => n.type === t).length}</span>
            }
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="adm-notif-list">
        {filtered.length === 0 ? (
          <div className="adm-card adm-notif-empty">
            <p>Tidak ada notifikasi di kategori ini.</p>
          </div>
        ) : filtered.map(n => {
          const meta = NOTIF_TYPE_META[n.type];
          return (
            <div
              key={n.id}
              className={`adm-notif-item${n.read ? "" : " adm-notif-item--unread"}`}
              onClick={() => markRead(n.id)}
            >
              <div className="adm-notif-icon" style={{ background: meta.bg, color: meta.color }}>
                <span>{meta.icon}</span>
              </div>
              <div className="adm-notif-body">
                <div className="adm-notif-top">
                  <span className="adm-notif-title">{n.title}</span>
                  <span className="adm-notif-time">{n.time}</span>
                </div>
                <p className="adm-notif-desc">{n.body}</p>
              </div>
              <div className="adm-notif-actions">
                {!n.read && <span className="adm-notif-dot" />}
                <button
                  className="adm-notif-dismiss"
                  title="Tutup"
                  onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
