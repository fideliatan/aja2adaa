import { useState } from "react";
import { useMockData } from "../../context/MockDataContext.jsx";
import { fmt, IcSearch, IcMail, Avatar } from "../shared.jsx";

/* ═══════════════════════════════════════════════════════════
   SECTION: CUSTOMERS
   ═══════════════════════════════════════════════════════════ */
export default function Customers() {
  const { mockStore } = useMockData();
  const [query, setQuery] = useState("");
  const customers = mockStore.users
    .filter((user) => user.role === "customer")
    .map((user) => {
      const orders = mockStore.orders.filter((order) => order.customerId === user.id);
      const spent = orders.reduce((sum, order) => sum + order.total, 0);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        orders: orders.length,
        spent,
        joined: new Intl.DateTimeFormat("id-ID", {
          month: "short",
          year: "numeric",
        }).format(new Date(user.createdAt)),
        status: orders.length === 0 ? "new" : "active",
      };
    });
  const filtered = customers.filter(c => {
    const q = query.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Data Pelanggan</h2>
          <p className="adm-section-sub">{customers.length} pelanggan terdaftar</p>
        </div>
      </div>

      <div className="adm-search-bar" style={{ marginBottom: 20 }}>
        <IcSearch />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama atau email…" className="adm-search-input" />
        {query && <button className="adm-search-clear" onClick={() => setQuery("")}>✕</button>}
      </div>

      <div className="adm-customer-grid">
        {filtered.map(c => (
          <div key={c.id} className="adm-customer-card">
            <div className="adm-customer-card-top">
              <Avatar name={c.name} size={44} />
              <span className={`adm-status-pill adm-status-pill--${c.status}`} style={c.status === "new" ? { color: "#8b5cf6", background: "rgba(139,92,246,0.1)" } : { color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>
                {c.status === "new" ? "Baru" : "Aktif"}
              </span>
            </div>
            <div className="adm-customer-card-info">
              <h4 className="adm-customer-card-name">{c.name}</h4>
              <p className="adm-customer-card-email"><IcMail /> {c.email}</p>
            </div>
            <div className="adm-customer-card-stats">
              <div className="adm-cust-stat">
                <span className="adm-cust-stat-val">{c.orders}</span>
                <span className="adm-cust-stat-label">Pesanan</span>
              </div>
              <div className="adm-cust-stat-divider" />
              <div className="adm-cust-stat">
                <span className="adm-cust-stat-val" style={{ fontSize: 12 }}>{fmt(c.spent)}</span>
                <span className="adm-cust-stat-label">Total Belanja</span>
              </div>
              <div className="adm-cust-stat-divider" />
              <div className="adm-cust-stat">
                <span className="adm-cust-stat-val" style={{ fontSize: 11 }}>{c.joined}</span>
                <span className="adm-cust-stat-label">Bergabung</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
