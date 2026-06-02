import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useOrders } from "../../customer/context/OrderContext";
import { useMockData } from "../../context/MockDataContext.jsx";
import api from "../../lib/api.js";
import { getMonitoringSummary, getCaseRiskSummary } from "../risk-data.js";
import { MonitoringSummaryCards, CompactRiskIndicator } from "../risk-monitoring.jsx";
import {
  fmt,
  STATUS_META,
  IcRevenue,
  IcOrders,
  IcProducts,
  IcCustomers,
  IcArrowUp,
  IcStar,
  Avatar,
} from "../shared.jsx";

/* ═══════════════════════════════════════════════════════════
   COMPONENT: Revenue Chart (live data from DB)
   ═══════════════════════════════════════════════════════════ */
function RevenueChart() {
  const [period, setPeriod] = useState("monthly");
  const [tooltip, setTooltip] = useState(null);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchRevenue = useCallback(async (p) => {
    if (cache[p]) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/store/revenue/?period=${p}`);
      setCache((prev) => ({ ...prev, [p]: data }));
    } catch {
      setCache((prev) => ({ ...prev, [p]: [] }));
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => { fetchRevenue(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = cache[period] ?? [];
  const hasData = data.length > 0 && data.some((d) => d.val > 0);

  const W = 560, H = 200;
  const PAD = { top: 24, right: 16, bottom: 32, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxVal = hasData ? Math.max(...data.map((d) => d.val)) : 1;

  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2),
    y: PAD.top + cH - (d.val / maxVal) * cH,
    val: d.val,
    label: d.label,
  }));

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(1);
    return acc + ` C ${cx},${prev.y.toFixed(1)} ${cx},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, "");

  const areaPath = pts.length
    ? linePath
      + ` L ${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + cH).toFixed(1)}`
      + ` L ${pts[0].x.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`
    : "";

  const gridVals = [0.25, 0.5, 0.75, 1].map((pct) => ({
    y: PAD.top + cH - pct * cH,
    val: maxVal * pct,
  }));

  const fmtTick = (v) =>
    v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : (v / 1_000).toFixed(0) + "K";

  const now = new Date();
  const periodLabel =
    period === "daily"
      ? "Minggu Ini"
      : period === "monthly"
      ? String(now.getFullYear())
      : "Sepanjang Waktu";

  return (
    <div className="adm-card adm-chart-card">
      <div className="adm-card-header">
        <div>
          <h3 className="adm-card-title">Pendapatan</h3>
          <span className="adm-card-tag">{periodLabel}</span>
        </div>
        <div className="adm-chart-period-btns">
          {[["daily", "Harian"], ["monthly", "Bulanan"], ["yearly", "Tahunan"]].map(([key, lbl]) => (
            <button
              key={key}
              className={`adm-period-btn${period === key ? " adm-period-btn--active" : ""}`}
              onClick={() => setPeriod(key)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-chart-svg-wrap" style={{ position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.7)", borderRadius: 8, zIndex: 2 }}>
            <Loader2 size={22} className="adm-spin" style={{ color: "#c97269" }} />
          </div>
        )}
        {!loading && !hasData && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 13 }}>
            Belum ada data pendapatan
          </div>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart-svg">
          <defs>
            <linearGradient id="rcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c97269" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c97269" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e07a73" />
              <stop offset="100%" stopColor="#c97269" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridVals.map((g, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={g.y.toFixed(1)} x2={W - PAD.right} y2={g.y.toFixed(1)} stroke="#f3e8e7" strokeWidth="1" strokeDasharray="5,5" />
              <text x={PAD.left - 6} y={g.y + 4} textAnchor="end" fontSize="9" fill="#bbb">
                {fmtTick(g.val)}
              </text>
            </g>
          ))}

          {/* Baseline */}
          <line x1={PAD.left} y1={PAD.top + cH} x2={W - PAD.right} y2={PAD.top + cH} stroke="#f0e0df" strokeWidth="1" />

          {hasData && (
            <>
              <path d={areaPath} fill="url(#rcGrad)" />
              <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Dots + x labels */}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={16} fill="transparent" style={{ cursor: "pointer" }}
                onMouseEnter={() => setTooltip(p)} onMouseLeave={() => setTooltip(null)} />
              {p.val > 0 && <circle cx={p.x} cy={p.y} r={6} fill="#c97269" opacity="0.15" />}
              {p.val > 0 && <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#c97269" strokeWidth="2" />}
              <text x={p.x} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#aaa" fontWeight="600">
                {p.label}
              </text>
            </g>
          ))}

          {/* Tooltip */}
          {tooltip && tooltip.val > 0 && (() => {
            const tx = Math.min(Math.max(tooltip.x, 44), W - 44);
            const ty = tooltip.y > 50 ? tooltip.y - 40 : tooltip.y + 14;
            return (
              <g>
                <rect x={tx - 46} y={ty} width={92} height={28} rx={8} fill="#1e1e1e" opacity="0.9" />
                <text x={tx} y={ty + 18} textAnchor="middle" fontSize="10.5" fill="white" fontWeight="700">
                  {fmt(tooltip.val)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION: DASHBOARD
   ═══════════════════════════════════════════════════════════ */
export default function Dashboard({ setActive }) {
  const { mockStore, products } = useMockData();
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());
  const totalRevenue = (mockStore.orders ?? []).reduce((sum, order) => sum + order.total, 0);
  const totalOrders = mockStore.orders.length;
  const totalCustomers = mockStore.users.filter((user) => user.role === "customer").length;
  const monitoringSummary = getMonitoringSummary(mockStore);

  const stats = [
    { label: "Total Pendapatan",  value: fmt(totalRevenue), sub: "+18% bulan ini",  icon: <IcRevenue />,   color: "rose"   },
    { label: "Total Pesanan",    value: totalOrders,        sub: "+4 hari ini",     icon: <IcOrders />,    color: "violet" },
    { label: "Total Produk",     value: products.length,    sub: `${products.filter(p => p.isActive !== false).length} aktif`, icon: <IcProducts />,  color: "blue"   },
    { label: "Total Pelanggan",  value: totalCustomers,     sub: "+2 minggu ini",   icon: <IcCustomers />, color: "green"  },
  ];

  const recentOrders = mockStore.orders.slice(0, 5);
  const topProducts  = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
  const pendingCount = mockStore.orders.filter((order) => order.status === "pending").length;

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Dasbor</h2>
          <p className="adm-section-sub">Selamat datang kembali, Admin! Ini ringkasan hari ini.</p>
        </div>
        <div className="adm-date-badge">{todayLabel}</div>
      </div>

      {/* Stat cards */}
      <div className="adm-stat-grid">
        {stats.map((s, i) => (
          <div key={i} className={`adm-stat-card adm-stat-card--${s.color}`}>
            <div className="adm-stat-top">
              <div className={`adm-stat-icon adm-stat-icon--${s.color}`}>{s.icon}</div>
              <span className="adm-stat-trend"><IcArrowUp /> {s.sub}</span>
            </div>
            <div className="adm-stat-val">{s.value}</div>
            <div className="adm-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <MonitoringSummaryCards summary={monitoringSummary} />

      <div className="adm-dash-grid">
        <RevenueChart />

        {/* Pending alert */}
        <div className="adm-card adm-pending-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Perlu Perhatian</h3>
          </div>
          <div className="adm-pending-list">
            <div className="adm-alert-item adm-alert-item--warn">
              <span className="adm-alert-dot" />
              <div>
                <p className="adm-alert-title">{pendingCount} Pesanan Menunggu Persetujuan</p>
                <p className="adm-alert-sub">Konfirmasi pembayaran menunggu</p>
              </div>
              <button className="adm-alert-btn" onClick={() => setActive("orders")}>Lihat</button>
            </div>
            <div className="adm-alert-item adm-alert-item--warn">
              <span className="adm-alert-dot" />
              <div>
                <p className="adm-alert-title">{monitoringSummary.highRiskCases} Kasus Risiko Tinggi</p>
                <p className="adm-alert-sub">Disarankan review manual sebelum persetujuan</p>
              </div>
            </div>
            <div className="adm-alert-item adm-alert-item--green">
              <span className="adm-alert-dot adm-alert-dot--green" />
              <div>
                <p className="adm-alert-title">Stok Produk Normal</p>
                <p className="adm-alert-sub">Semua {products.length} produk tersedia</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-dash-row2">
        {/* Recent orders */}
        <div className="adm-card adm-recent-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Pesanan Terbaru</h3>
            <button className="adm-link-btn" onClick={() => setActive("orders")}>Lihat semua →</button>
          </div>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Pelanggan</th>
                <th>Total</th>
                <th>Risiko</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => {
                const st = STATUS_META[o.status];
                const riskSummary = getCaseRiskSummary(mockStore, "order", o.id);
                return (
                  <tr key={o.id}>
                    <td><span className="adm-order-id">{o.id}</span></td>
                    <td>
                      <div className="adm-customer-cell">
                        {(() => { const u = mockStore.users.find(u => u.id === o.customerId); const n = u?.name ?? o.customer; return <><Avatar name={n} size={28} /><span>{n}</span></>; })()}
                      </div>
                    </td>
                    <td><strong>{fmt(o.total)}</strong></td>
                    <td><CompactRiskIndicator summary={riskSummary} /></td>
                    <td>
                      <span className="adm-status-pill" style={{ color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top products */}
        <div className="adm-card adm-top-products-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Produk Terlaris</h3>
            <button className="adm-link-btn" onClick={() => setActive("products")}>Lihat semua →</button>
          </div>
          <div className="adm-top-products">
            {topProducts.map((p, i) => (
              <div key={p.id} className="adm-top-product-item">
                <span className="adm-rank">#{i + 1}</span>
                <img src={p.image} alt={p.name} className="adm-top-product-img" />
                <div className="adm-top-product-info">
                  <p className="adm-top-product-name">{p.name}</p>
                  <p className="adm-top-product-cat">{p.category}</p>
                </div>
                <div className="adm-top-product-right">
                  <span className="adm-top-product-rating"><IcStar /> {p.rating}</span>
                  <span className="adm-top-product-reviews">{p.reviews} ulasan</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
