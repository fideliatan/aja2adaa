import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import { useMockData } from "../context/MockDataContext.jsx";
import { getAdminNotifications } from "./risk-data.js";
import {
  IcGrid,
  IcOrders,
  IcProducts,
  IcCustomers,
  IcSettings,
  IcLogOut,
  IcSearch,
  IcBell,
  IcNotif,
  IcReturn,
  IcHistory,
  IcStore,
} from "./shared.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { Orders, OrderDetail } from "./pages/Orders.jsx";
import Products from "./pages/Products.jsx";
import Customers from "./pages/Customers.jsx";
import Settings from "./pages/Settings.jsx";
import Notifications from "./pages/Notifications.jsx";
import { Returns, ReturnDetail } from "./pages/Returns.jsx";
import VerifyHistory from "./pages/VerifyHistory.jsx";

/* ═══════════════════════════════════════════════════════════
   SIDEBAR NAV CONFIG
   ═══════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: "dashboard",       label: "Dasbor",           icon: <IcGrid />       },
  { id: "orders",          label: "Pesanan",           icon: <IcOrders />     },
  { id: "products",        label: "Produk",            icon: <IcProducts />   },
  { id: "customers",       label: "Pelanggan",         icon: <IcCustomers />  },
  { id: "returns",         label: "Return Paket",      icon: <IcReturn />     },
  { id: "verify-history",  label: "Riwayat Verifikasi",icon: <IcHistory />    },
  { id: "notifications",   label: "Notifikasi",        icon: <IcNotif />      },
  { id: "settings",        label: "Pengaturan",        icon: <IcSettings />   },
];

/* ═══════════════════════════════════════════════════════════
   MAIN ADMIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const navigate = useNavigate();
  const { mockStore, session, logoutUser } = useMockData();
  const adminNotifications = getAdminNotifications(mockStore);
  const [active,            setActive]            = useState("dashboard");
  const [query,             setQuery]             = useState("");
  const [selectedOrderId,   setSelectedOrderId]   = useState(null);
  const [selectedReturnId,  setSelectedReturnId]  = useState(null);

  const pendingOrders = mockStore.orders.filter((order) => order.status === "pending").length;
  const unreadNotifs = adminNotifications.filter((notif) => !notif.read).length;
  const pendingReturns = mockStore.returns.filter(
    (ret) => ret.status === "pending" || ret.status === "approved"
  ).length;

  const goToOrderDetail  = (id) => { setSelectedOrderId(id);  setActive("payment-approval"); };
  const goToReturnDetail = (id) => { setSelectedReturnId(id); setActive("return-detail"); };

  const renderSection = () => {
    switch (active) {
      case "dashboard": return <Dashboard setActive={setActive} />;
      case "orders":    return <Orders setActive={setActive} setSelectedOrderId={setSelectedOrderId} goToOrderDetail={goToOrderDetail} />;
      case "products":  return <Products />;
      case "customers": return <Customers />;
      case "payment-approval": return <OrderDetail selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} setActive={setActive} />;
      case "verify-history":   return <VerifyHistory />;
      case "returns":          return <Returns goToReturnDetail={goToReturnDetail} />;
      case "return-detail":    return <ReturnDetail selectedReturnId={selectedReturnId} setSelectedReturnId={setSelectedReturnId} setActive={setActive} />;
      case "notifications":    return <Notifications />;
      case "settings":         return <Settings />;
      default:          return <Dashboard setActive={setActive} />;
    }
  };

  return (
    <div className="adm-root">

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        {/* Logo */}
        <div className="adm-sidebar-logo">
          <img src="/logo-careofyou.png" alt="Careofyou" className="adm-sidebar-logo-img" />
          <div>
            <span className="adm-sidebar-brand">careofyou</span>
            <span className="adm-sidebar-role">Panel Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="adm-sidebar-nav">
          <p className="adm-nav-group-label">Menu</p>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`adm-nav-item${active === item.id ? " adm-nav-item--active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              <span className="adm-nav-label">{item.label}</span>
              {item.id === "orders" && pendingOrders > 0 && (
                <span className="adm-nav-badge adm-nav-badge--amber">{pendingOrders}</span>
              )}
              {item.id === "returns" && pendingReturns > 0 && (
                <span className="adm-nav-badge adm-nav-badge--rose">{pendingReturns}</span>
              )}
              {item.id === "notifications" && unreadNotifs > 0 && (
                <span className="adm-nav-badge adm-nav-badge--rose">{unreadNotifs}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom: visit store + logout */}
        <div className="adm-sidebar-bottom">
          <button className="adm-nav-item adm-nav-item--store" onClick={() => navigate("/")}>
            <span className="adm-nav-icon"><IcStore /></span>
            <span className="adm-nav-label">Lihat Toko</span>
          </button>
          <button
            className="adm-nav-item adm-nav-item--logout"
            onClick={() => {
              logoutUser();
              navigate("/login", { replace: true });
            }}
          >
            <span className="adm-nav-icon"><IcLogOut /></span>
            <span className="adm-nav-label">Keluar</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="adm-main">
        {/* Topbar */}
        <header className="adm-topbar">
          <div className="adm-topbar-search">
            <IcSearch />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari apapun…"
              className="adm-topbar-input"
            />
          </div>

          <div className="adm-topbar-right">
            {/* Notification bell */}
            <button className="adm-topbar-icon-btn">
              <IcBell />
              {unreadNotifs > 0 && (
                <span className="adm-notif-dot">{unreadNotifs}</span>
              )}
            </button>

            {/* Admin profile */}
            <div className="adm-topbar-profile">
              <img src="/logo-careofyou.png" alt="Admin" className="adm-topbar-avatar-img" />
              <div className="adm-topbar-info">
                <span className="adm-topbar-name">{session?.name ?? "Admin"}</span>
                <span className="adm-topbar-email">{session?.email ?? "admin@careofyou.id"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="adm-content">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
