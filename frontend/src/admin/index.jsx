import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, CreditCard, Truck, RotateCcw, Star, CheckCircle, Ban, Package, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { PRODUCTS } from "../data/products.js";
import "./index.css";
import jsQR from "jsqr";
import { useOrders } from "../customer/context/OrderContext";
import { useMockData } from "../context/MockDataContext.jsx";
import {
  getAdminNotifications,
  getCaseRiskSummary,
  getMonitoringSummary,
} from "./risk-data.js";
import {
  CaseRiskPanel,
  CompactRiskIndicator,
  MonitoringSummaryCards,
  RiskScoreCard,
  SessionRiskSummary,
  StepUpVerificationModal,
  TrustedDeviceCard,
} from "./risk-monitoring.jsx";

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */
const DAILY_REVENUE = [
  { label: "Sen", val: 420000 },
  { label: "Sel", val: 860000 },
  { label: "Rab", val: 340000 },
  { label: "Kam", val: 1200000 },
  { label: "Jum", val: 780000 },
  { label: "Sab", val: 1540000 },
  { label: "Min", val: 960000 },
];
const MONTHLY_REVENUE = [
  { label: "Jan", val: 4200000 },
  { label: "Feb", val: 5800000 },
  { label: "Mar", val: 3900000 },
  { label: "Apr", val: 7200000 },
  { label: "Mei", val: 6100000 },
  { label: "Jun", val: 8400000 },
  { label: "Jul", val: 7800000 },
  { label: "Agt", val: 9200000 },
  { label: "Sep", val: 6800000 },
  { label: "Okt", val: 10500000 },
  { label: "Nov", val: 12000000 },
  { label: "Des", val: 15400000 },
];
const YEARLY_REVENUE = [
  { label: "2020", val: 48000000 },
  { label: "2021", val: 72000000 },
  { label: "2022", val: 95000000 },
  { label: "2023", val: 130000000 },
  { label: "2024", val: 168000000 },
  { label: "2025", val: 92000000 },
];

const fmt = (n) => "Rp " + n.toLocaleString("id-ID");
const SECURITY_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSecurityTimestamp(date = new Date()) {
  return SECURITY_TIME_FORMATTER.format(date);
}

function createSecurityTimelineEvent(prefix, type, label, status = "success") {
  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    timestamp: formatSecurityTimestamp(),
    status,
  };
}

function compressImage(dataUrl, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const STATUS_META = {
  pending:   { label: "Menunggu Persetujuan", color: "#e09a3a", bg: "rgba(224,154,58,0.1)"  },
  packing:   { label: "Sedang Dikemas",       color: "#4a9fd4", bg: "rgba(74,159,212,0.1)"  },
  shipped:   { label: "Dikirim",              color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  delivered: { label: "Terkirim",             color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  cancelled: { label: "Dibatalkan",           color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  rejected:  { label: "Ditolak",              color: "#dc2626", bg: "rgba(220,38,38,0.1)"   },
};

/* ═══════════════════════════════════════════════════════════
   SVG ICONS
   ═══════════════════════════════════════════════════════════ */
const IcGrid       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IcOrders     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;
const IcProducts   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IcCustomers  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcSettings   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcLogOut     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcSearch     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcBell       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IcArrowUp    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
const IcEdit       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcCheck      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcTruck      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IcRevenue    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
const IcPlus       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcMail       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IcStore      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IcStar       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcPackage    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IcNotif      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const IcReturn     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
const IcReceipt    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const IcShield     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcHistory    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/><polyline points="12 7 12 12 15 14"/></svg>;
const IcCreditCard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IcQr         = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="16" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/></svg>;

/* ═══════════════════════════════════════════════════════════
   COMPONENT: Revenue Chart (modern SVG area chart)
   ═══════════════════════════════════════════════════════════ */
function RevenueChart() {
  const [period, setPeriod] = useState("daily");
  const [tooltip, setTooltip] = useState(null);

  const data = period === "daily" ? DAILY_REVENUE
    : period === "monthly" ? MONTHLY_REVENUE
    : YEARLY_REVENUE;

  const W = 560, H = 200;
  const PAD = { top: 24, right: 16, bottom: 32, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.val));

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * cW,
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

  const areaPath = linePath
    + ` L ${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + cH).toFixed(1)}`
    + ` L ${pts[0].x.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;

  const gridVals = [0.25, 0.5, 0.75, 1].map(pct => ({
    y: PAD.top + cH - pct * cH,
    val: maxVal * pct,
  }));

  const fmtTick = v =>
    v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : (v / 1_000).toFixed(0) + "K";

  const periodLabel = period === "daily" ? "Minggu Ini" : period === "monthly" ? "2025" : "Sepanjang Waktu";

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

      <div className="adm-chart-svg-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart-svg">
          <defs>
            <linearGradient id="rcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c97269" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c97269" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridVals.map((g, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={g.y.toFixed(1)}
                x2={W - PAD.right} y2={g.y.toFixed(1)}
                stroke="#f3e8e7" strokeWidth="1" strokeDasharray="5,5"
              />
              <text x={PAD.left - 6} y={g.y + 4} textAnchor="end" fontSize="9" fill="#bbb">
                {fmtTick(g.val)}
              </text>
            </g>
          ))}

          {/* Baseline */}
          <line
            x1={PAD.left} y1={PAD.top + cH}
            x2={W - PAD.right} y2={PAD.top + cH}
            stroke="#f0e0df" strokeWidth="1"
          />

          {/* Area fill */}
          <path d={areaPath} fill="url(#rcGrad)" />

          {/* Line */}
          <path
            d={linePath} fill="none"
            stroke="url(#lineGrad)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e07a73" />
              <stop offset="100%" stopColor="#c97269" />
            </linearGradient>
          </defs>

          {/* Dots + x labels */}
          {pts.map((p, i) => (
            <g key={i}>
              {/* hover hit area */}
              <circle
                cx={p.x} cy={p.y} r={16}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setTooltip(p)}
                onMouseLeave={() => setTooltip(null)}
              />
              {/* outer glow */}
              <circle cx={p.x} cy={p.y} r={6} fill="#c97269" opacity="0.15" />
              {/* dot */}
              <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#c97269" strokeWidth="2" />
              {/* x label */}
              <text
                x={p.x} y={H - 6}
                textAnchor="middle" fontSize="9.5" fill="#aaa" fontWeight="600"
              >
                {p.label}
              </text>
            </g>
          ))}

          {/* Tooltip */}
          {tooltip && (() => {
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
   HELPER: Avatar initials
   ═══════════════════════════════════════════════════════════ */
function Avatar({ name, size = 32 }) {
  const parts = name.trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const colors = ["#e07a73","#8b5cf6","#4a9fd4","#22c55e","#f59e0b","#ec4899"];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className="adm-avatar" style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.36 }}>
      {initials.toUpperCase()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION: DASHBOARD
   ═══════════════════════════════════════════════════════════ */
function Dashboard({ setActive }) {
  const { mockStore } = useMockData();
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
    { label: "Total Produk",     value: PRODUCTS.length,    sub: "20 aktif",        icon: <IcProducts />,  color: "blue"   },
    { label: "Total Pelanggan",  value: totalCustomers,     sub: "+2 minggu ini",   icon: <IcCustomers />, color: "green"  },
  ];

  const recentOrders = mockStore.orders.slice(0, 5);
  const topProducts  = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
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
                <p className="adm-alert-sub">Semua {PRODUCTS.length} produk tersedia</p>
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
                        <Avatar name={o.customer} size={28} />
                        <span>{o.customer}</span>
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

/* ═══════════════════════════════════════════════════════════
   SECTION: ORDERS
   ═══════════════════════════════════════════════════════════ */
function Orders({ setActive, setSelectedOrderId, goToOrderDetail }) {
  const { orders: allOrders } = useOrders();
  const { mockStore } = useMockData();
  const [tab, setTab]     = useState("all");
  const [query, setQuery] = useState("");

  const tabs = ["all", "pending", "packing", "shipped", "delivered", "rejected", "cancelled"];

  const filtered = allOrders.filter(o => {
    const matchTab = tab === "all" || o.status === tab;
    const q = query.toLowerCase();
    const matchQ = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q);
    return matchTab && matchQ;
  });

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Manajemen Pesanan</h2>
          <p className="adm-section-sub">{allOrders.length} total pesanan · klik baris untuk lihat detail</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="adm-tabs">
        {tabs.map(t => (
          <button key={t} className={`adm-tab${tab === t ? " adm-tab--active" : ""}`} onClick={() => setTab(t)}>
            {t === "all" ? "Semua" : STATUS_META[t]?.label}
            <span className="adm-tab-count">{t === "all" ? allOrders.length : allOrders.filter(o => o.status === t).length}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="adm-search-bar">
        <IcSearch />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari order ID atau nama customer…" className="adm-search-input" />
        {query && <button className="adm-search-clear" onClick={() => setQuery("")}>✕</button>}
      </div>

      {/* Table — clickable rows, no Aksi column */}
      <div className="adm-card adm-table-card">
        <table className="adm-table adm-table--orders">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Pelanggan</th>
              <th>Total</th>
              <th>Tanggal</th>
              <th>Risiko</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="adm-empty-row">Tidak ada pesanan ditemukan.</td></tr>
            ) : filtered.map(o => {
              const st = STATUS_META[o.status] ?? { label: o.status, color: "#aaa", bg: "rgba(170,170,170,0.1)" };
              const riskSummary = getCaseRiskSummary(mockStore, "order", o.id);
              return (
                <tr
                  key={o.id}
                  className="adm-table-row--clickable"
                  onClick={() => goToOrderDetail(o.id)}
                >
                  <td>
                    <span className="adm-order-id">{o.id}</span>
                  </td>
                  <td>
                    <div className="adm-customer-cell">
                      <Avatar name={o.customer} size={28} />
                      <div>
                        <p className="adm-customer-name">{o.customer}</p>
                        <p className="adm-customer-email">{o.payment}</p>
                      </div>
                    </div>
                  </td>
                  <td><strong>{fmt(o.total)}</strong></td>
                  <td className="adm-date-cell">{o.date}</td>
                  <td><CompactRiskIndicator summary={riskSummary} /></td>
                  <td>
                    <span className="adm-status-pill" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPER: Mock QR visual (deterministic SVG)
   ═══════════════════════════════════════════════════════════ */
function MockQr({ value, size = 120 }) {
  const GRID = 21;
  const cell = size / GRID;

  // Finder patterns at three corners
  const finderCells = [];
  [[0,0],[14,0],[0,14]].forEach(([dr,dc]) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      if (r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4))
        finderCells.push([dr+r, dc+c]);
    }
  });

  // Reserve finder + separator + timing zones
  const reserved = new Set();
  [[0,0],[14,0],[0,14]].forEach(([dr,dc]) => {
    for (let r=dr-1;r<=dr+7;r++) for (let c=dc-1;c<=dc+7;c++)
      if (r>=0&&r<GRID&&c>=0&&c<GRID) reserved.add(`${r},${c}`);
  });
  for (let i=8;i<13;i++) { reserved.add(`6,${i}`); reserved.add(`${i},6`); }

  // Timing dots
  const timingCells = [];
  for (let i=8;i<13;i+=2) { timingCells.push([6,i]); timingCells.push([i,6]); }

  // Deterministic data cells seeded from value
  let hash = 0;
  for (let i=0;i<value.length;i++) hash = ((hash<<5)-hash+value.charCodeAt(i))|0;
  const dataCells = [];
  for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++) {
    if (reserved.has(`${r},${c}`)) continue;
    const seed = (hash^(r*31+c*17))|0;
    if ((seed^(seed>>>7))&1) dataCells.push([r,c]);
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect width={size} height={size} fill="white" />
      {[...finderCells, ...timingCells, ...dataCells].map(([r,c],i) => (
        <rect key={i} x={c*cell} y={r*cell} width={cell} height={cell} fill="#1a1a1a" />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION: PRODUCTS
   ═══════════════════════════════════════════════════════════ */
function Products() {
  const [products, setProducts] = useState(PRODUCTS);
  const [query, setQuery]       = useState("");
  const [catFilter, setCat]     = useState("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [newProd, setNewProd]   = useState({ name: "", category: "", price: "", image: "" });
  const [qrView,  setQrView]    = useState(null);

  const cats = ["all", ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  const filtered = products.filter(p => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const q = query.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const remove = (id) => setProducts(prev => prev.filter(p => p.id !== id));

  const genQrCode = (id, category, name) => {
    const catCode = category.replace(/\s+/g, "").toUpperCase().slice(0, 3);
    let hash = 0;
    const str = `${id}-${name}`;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    let h = Math.abs(hash) || 7919;
    for (let i = 0; i < 8; i++) { suffix += chars[h % chars.length]; h = Math.floor(h / chars.length) || 7919; }
    return `PROD-NEW-${catCode}-QR-${suffix}`;
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newProd.name || !newProd.category || !newProd.price) return;
    const id = Date.now();
    const qrCode = genQrCode(id, newProd.category, newProd.name);
    setProducts(prev => [...prev, {
      id,
      name: newProd.name,
      category: newProd.category,
      price: Number(newProd.price),
      image: newProd.image || `https://placehold.co/300x300/f9f0ef/c87a74?text=${encodeURIComponent(newProd.name)}`,
      rating: 0,
      reviews: 0,
      qrCode,
    }]);
    setNewProd({ name: "", category: "", price: "", image: "" });
    setShowAdd(false);
  };

  return (
    <>
      <div className="adm-section">
        <div className="adm-section-header">
          <div>
            <h2 className="adm-section-title">Manajemen Produk</h2>
            <p className="adm-section-sub">{products.length} produk terdaftar</p>
          </div>
          <button className="adm-primary-btn" onClick={() => setShowAdd(v => !v)}>
            <IcPlus /> Tambah Produk
          </button>
        </div>

        {/* Add Product Form */}
        {showAdd && (
          <div className="adm-card adm-add-form-card">
            <h3 className="adm-card-title" style={{ marginBottom: 20 }}>Produk Baru</h3>
            <form className="adm-add-form" onSubmit={handleAdd}>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Nama Produk *</label>
                  <input placeholder="e.g. Vitamin C Serum" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} className="adm-input" />
                </div>
                <div className="adm-form-group">
                  <label>Kategori *</label>
                  <input placeholder="e.g. Serum" value={newProd.category} onChange={e => setNewProd(p => ({ ...p, category: e.target.value }))} className="adm-input" />
                </div>
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Harga (Rp) *</label>
                  <input type="number" placeholder="e.g. 150000" value={newProd.price} onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} className="adm-input" />
                </div>
                <div className="adm-form-group">
                  <label>URL Gambar</label>
                  <input placeholder="https://..." value={newProd.image} onChange={e => setNewProd(p => ({ ...p, image: e.target.value }))} className="adm-input" />
                </div>
              </div>
              <div className="adm-form-actions">
                <button type="submit" className="adm-primary-btn">Simpan Produk</button>
                <button type="button" className="adm-ghost-btn" onClick={() => setShowAdd(false)}>Batal</button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="adm-filter-row">
          <div className="adm-search-bar">
            <IcSearch />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari produk…" className="adm-search-input" />
            {query && <button className="adm-search-clear" onClick={() => setQuery("")}>✕</button>}
          </div>
          <div className="adm-cat-pills">
            {cats.map(c => (
              <button key={c} className={`adm-cat-pill${catFilter === c ? " adm-cat-pill--active" : ""}`} onClick={() => setCat(c)}>
                {c === "all" ? "Semua" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Product table */}
        <div className="adm-card adm-table-card">
          <table className="adm-table adm-table--products">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Rating</th>
                <th>Ulasan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="adm-product-cell">
                      <img src={p.image} alt={p.name} className="adm-product-thumb" />
                      <span className="adm-product-name">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="adm-cat-badge">{p.category}</span></td>
                  <td><strong>{fmt(p.price)}</strong></td>
                  <td>
                    <span className="adm-rating-cell"><IcStar /> {p.rating}</span>
                  </td>
                  <td className="adm-date-cell">{p.reviews}</td>
                  <td>
                    <div className="adm-action-btns">
                      <button className="adm-act-btn adm-act-btn--qr" title="Lihat QR" onClick={() => setQrView(p)}><IcQr /></button>
                      <button className="adm-act-btn adm-act-btn--edit" title="Edit"><IcEdit /></button>
                      <button className="adm-act-btn adm-act-btn--danger" title="Hapus" onClick={() => remove(p.id)}><IcTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR View Modal */}
      {qrView && (
        <div className="adm-modal-overlay" onClick={() => setQrView(null)}>
          <div className="adm-modal adm-pqr-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-header-info">
                <div className="adm-modal-header-row">
                  <h3 className="adm-modal-title">Kode QR Produk</h3>
                  <span className="adm-cat-badge">{qrView.category}</span>
                </div>
                <p className="adm-modal-sub">{qrView.name}</p>
              </div>
              <button className="adm-modal-close" onClick={() => setQrView(null)}>✕</button>
            </div>
            <div className="adm-pqr-body">
              <div className="adm-pqr-visual">
                <MockQr value={qrView.qrCode || qrView.name} size={160} />
              </div>
              <div className="adm-pqr-info">
                <p className="adm-pqr-label">QR Code</p>
                <code className="adm-qr-code-chip adm-qr-code-chip--neutral">{qrView.qrCode || "–"}</code>
                <p className="adm-pqr-desc">
                  Dibuat otomatis saat produk ini ditambahkan. Cetak dan tempel di kemasan produk untuk mengaktifkan verifikasi pengembalian.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION: CUSTOMERS
   ═══════════════════════════════════════════════════════════ */
function Customers() {
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


/* ═══════════════════════════════════════════════════════════
   SECTION: SETTINGS
   ═══════════════════════════════════════════════════════════ */
function Settings() {
  const { resetAllMockData } = useMockData();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    storeName: "Careofyou",
    storeEmail: "hello@careofyou.id",
    storePhone: "+62 812-3456-7890",
    storeAddress: "Manado, Sulawesi Utara",
    storeIG: "@careofyou.id",
    storeShopee: "careofyou.id",
    payBCA: "1234-5678-90",
    payBNI: "0987-6543-21",
    payDANA: "0812-3456-7890",
  });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSave = e => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const handleResetMockData = () => {
    resetAllMockData();
    setSaved(false);
  };

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Pengaturan Toko</h2>
          <p className="adm-section-sub">Kelola informasi dan konfigurasi toko.</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="adm-settings-grid">
          {/* Store Info */}
          <div className="adm-card adm-settings-card">
            <div className="adm-card-header">
              <h3 className="adm-card-title"><IcStore /> Info Toko</h3>
            </div>
            <div className="adm-settings-fields">
              {[
                { label: "Nama Toko", name: "storeName" },
                { label: "Email", name: "storeEmail" },
                { label: "No. WhatsApp", name: "storePhone" },
                { label: "Alamat", name: "storeAddress" },
              ].map(f => (
                <div key={f.name} className="adm-form-group">
                  <label>{f.label}</label>
                  <input name={f.name} value={form[f.name]} onChange={handleChange} className="adm-input" />
                </div>
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div className="adm-card adm-settings-card">
            <div className="adm-card-header">
              <h3 className="adm-card-title">Sosial Media & Toko Online</h3>
            </div>
            <div className="adm-settings-fields">
              {[
                { label: "Instagram", name: "storeIG" },
                { label: "Shopee", name: "storeShopee" },
              ].map(f => (
                <div key={f.name} className="adm-form-group">
                  <label>{f.label}</label>
                  <input name={f.name} value={form[f.name]} onChange={handleChange} className="adm-input" />
                </div>
              ))}
            </div>
            <div className="adm-card-header" style={{ marginTop: 24 }}>
              <h3 className="adm-card-title">Rekening Pembayaran</h3>
            </div>
            <div className="adm-settings-fields">
              {[
                { label: "BCA", name: "payBCA" },
                { label: "BNI", name: "payBNI" },
                { label: "DANA", name: "payDANA" },
              ].map(f => (
                <div key={f.name} className="adm-form-group">
                  <label>{f.label}</label>
                  <input name={f.name} value={form[f.name]} onChange={handleChange} className="adm-input" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="adm-settings-save">
          <button type="submit" className={`adm-primary-btn${saved ? " adm-primary-btn--saved" : ""}`}>
            {saved ? "✓ Tersimpan!" : "Simpan Perubahan"}
          </button>
          <button type="button" className="adm-ghost-btn" onClick={handleResetMockData}>
            Reset Data Mock
          </button>
        </div>
      </form>
    </div>
  );
}

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

function Notifications() {
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

/* ═══════════════════════════════════════════════════════════
   SECTION: RETURNS — QR-Based Return Verification
   ═══════════════════════════════════════════════════════════ */
const RETURN_STATUS_META = {
  pending:    { label: "Menunggu Persetujuan", color: "#e09a3a", bg: "rgba(224,154,58,0.12)"  },
  flagged:    { label: "Perlu Ditinjau",       color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  processing: { label: "Sedang Diproses",      color: "#4a9fd4", bg: "rgba(74,159,212,0.12)"  },
  completed:  { label: "Return Selesai",       color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  rejected:   { label: "Ditolak",              color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

function buildAllReturns(ctxReturns) {
  return ctxReturns.map(r => ({
    ...r,
    monitoringFlag: r.monitoringFlag ?? null,
    conditionNote:  r.conditionNote  ?? r.reason,
    photos:         r.photos ?? (r.productPhotoB64 ? [r.productPhotoB64] : []),
    receiptB64:     r.receiptB64     ?? null,
    qrCode:         r.qrCode         ?? "—",
    scannedQr:      r.scannedQr      ?? "—",
    qrStatus:       r.qrStatus       ?? null,
    fromCtx: true,
  }));
}

/* ═══════════════════════════════════════════════════════════
   CAMERA QR SCANNER
   ═══════════════════════════════════════════════════════════ */
function CameraScanner({ onScan, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const streamRef = useRef(null);
  const [camErr,   setCamErr]   = useState(null);
  const [active,   setActive_]  = useState(false);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setActive_(true);
        }
      })
      .catch(err => {
        if (!alive) return;
        setCamErr("Tidak dapat mengakses kamera: " + (err.message || err));
      });
    return () => {
      alive = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext("2d");
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
      if (code) {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(rafRef.current);
        setActive_(false);
        onScan(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, onScan]);

  return (
    <div className="adm-cam-overlay" onClick={onClose}>
      <div className="adm-cam-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-cam-header">
          <span className="adm-cam-title">Scan QR Produk</span>
          <button className="adm-cam-close" onClick={onClose}>✕</button>
        </div>
        <div className="adm-cam-body">
          {camErr ? (
            <div className="adm-cam-error">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="adm-cam-error-msg">{camErr}</p>
              <button className="adm-cam-err-btn" onClick={onClose}>Tutup</button>
            </div>
          ) : (
            <div className="adm-cam-viewfinder">
              <video ref={videoRef} className="adm-cam-video" muted playsInline />
              <canvas ref={canvasRef} className="adm-cam-canvas" />
              <div className="adm-cam-frame">
                <span className="adm-cam-corner adm-cam-corner--tl" />
                <span className="adm-cam-corner adm-cam-corner--tr" />
                <span className="adm-cam-corner adm-cam-corner--bl" />
                <span className="adm-cam-corner adm-cam-corner--br" />
                <div className="adm-cam-scanline" />
              </div>
            </div>
          )}
        </div>
        <p className="adm-cam-hint">Arahkan kamera ke QR code produk untuk scan otomatis</p>
      </div>
    </div>
  );
}

function Returns({ goToReturnDetail }) {
  const { returns: ctxReturns } = useOrders();
  const { mockStore } = useMockData();
  const allReturns = buildAllReturns(ctxReturns);
  const [tab, setTab] = useState("all");
  const tabs = ["all", "pending", "flagged", "processing", "completed", "rejected"];
  const filtered = tab === "all" ? allReturns : allReturns.filter(r => r.status === tab);

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Return Paket</h2>
          <p className="adm-section-sub">
            {allReturns.length} total · {allReturns.filter(r => r.status === "pending").length} menunggu · {allReturns.filter(r => r.status === "flagged").length} perlu ditinjau · klik baris untuk review
          </p>
        </div>
      </div>

      <div className="adm-tabs">
        {tabs.map(t => (
          <button key={t} className={`adm-tab${tab === t ? " adm-tab--active" : ""}`} onClick={() => setTab(t)}>
            {t === "all" ? "Semua" : RETURN_STATUS_META[t]?.label}
            <span className="adm-tab-count">{t === "all" ? allReturns.length : allReturns.filter(r => r.status === t).length}</span>
          </button>
        ))}
      </div>

      <div className="adm-card adm-table-card">
        <table className="adm-table adm-table--orders">
          <thead>
            <tr>
              <th>Return ID</th>
              <th>Pelanggan</th>
              <th>Order</th>
              <th>Produk</th>
              <th>Total Refund</th>
              <th>Tanggal</th>
              <th>Risiko</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="adm-empty-row">Tidak ada permintaan return di kategori ini.</td></tr>
            ) : filtered.map(r => {
              const st = RETURN_STATUS_META[r.status] ?? { label: r.status, color: "#aaa", bg: "rgba(170,170,170,0.1)" };
              const riskSummary = getCaseRiskSummary(mockStore, "return", r.id);
              return (
                <tr key={r.id} className="adm-table-row--clickable" onClick={() => goToReturnDetail(r.id)}>
                  <td><span className="adm-order-id">{r.id}</span></td>
                  <td>
                    <div className="adm-customer-cell">
                      <Avatar name={r.customer} size={28} />
                      <div>
                        <p className="adm-customer-name">{r.customer}</p>
                        <p className="adm-customer-email">{r.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="adm-order-id" style={{ background: "rgba(74,159,212,0.1)", color: "#4a9fd4" }}>{r.orderId}</span></td>
                  <td style={{ maxWidth: 180 }}>
                    <p style={{ fontSize: 12.5, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.products?.map(p => p.name).join(", ") ?? "—"}
                    </p>
                  </td>
                  <td><strong>{fmt(r.total)}</strong></td>
                  <td className="adm-date-cell">{r.date}</td>
                  <td><CompactRiskIndicator summary={riskSummary} /></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="adm-status-pill" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                      {r.monitoringFlag && <span title={r.monitoringFlag}><AlertTriangle size={14} /></span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION: RETURN DETAIL (full page, same layout as OrderDetail)
   ═══════════════════════════════════════════════════════════ */
function ReturnDetail({ selectedReturnId, setSelectedReturnId, setActive }) {
  const { returns: ctxReturns, updateReturn } = useOrders();
  const { mockStore, session, currentUser, generateOtp, verifyOtp, resolveFlag } = useMockData();
  const allReturns = buildAllReturns(ctxReturns);
  const initialReturnId = selectedReturnId ?? allReturns[0]?.id;

  const [localId,       setLocalId]       = useState(selectedReturnId ?? allReturns[0]?.id);
  const [localStatuses, setLocalStatuses] = useState({});
  const [localQr,       setLocalQr]       = useState({});
  const [scanning,      setScanning]      = useState(false);
  const [verifyResult,  setVerifyResult]  = useState(null);
  const [receiptZoom,   setReceiptZoom]   = useState(false);
  const [photoZoom,     setPhotoZoom]     = useState(null);
  const [riskSummary,   setRiskSummary]   = useState(() => getCaseRiskSummary(mockStore, "return", initialReturnId));
  const [stepUpState,   setStepUpState]   = useState({
    open: false,
    actionKey: "",
    actionLabel: "",
    reasons: [],
    helperText: "",
  });
  const stepUpActionRef = useRef(null);
  const [showScanner,      setShowScanner]     = useState(false);
  const [localScannedVal,  setLocalScannedVal] = useState({});

  const currentId  = localId ?? allReturns[0]?.id;
  const ret        = allReturns.find(r => r.id === currentId) ?? allReturns[0];
  const currentIdx = allReturns.findIndex(r => r.id === currentId);
  const curStatus  = ret ? (localStatuses[ret.id] ?? ret.status) : null;
  const curQr      = ret ? (localQr[ret.id] ?? ret.qrStatus)     : null;

  useEffect(() => {
    if (selectedReturnId) setLocalId(selectedReturnId);
  }, [selectedReturnId]);

  useEffect(() => {
    if (!ret?.id) return;
    setRiskSummary(getCaseRiskSummary(mockStore, "return", ret.id));
    setStepUpState({
      open: false,
      actionKey: "",
      actionLabel: "",
      reasons: [],
      helperText: "",
    });
    stepUpActionRef.current = null;
  }, [ret?.id]);

  const patchReturn = (id, patch) => {
    if (ret?.fromCtx) updateReturn(id, patch);
    if (patch.status) setLocalStatuses(p => ({ ...p, [id]: patch.status }));
    if (patch.qrStatus) setLocalQr(p => ({ ...p, [id]: patch.qrStatus }));
  };

  const handleScanResult = (scannedValue) => {
    setShowScanner(false);
    if (!ret) return;
    const matched = scannedValue === ret.qrCode;
    const result  = matched ? "valid" : "invalid";
    setVerifyResult(result);
    setLocalQr(p => ({ ...p, [ret.id]: result }));
    setLocalScannedVal(p => ({ ...p, [ret.id]: scannedValue }));
    setRiskSummary((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        createSecurityTimelineEvent(
          ret.id.toLowerCase(),
          "qr",
          matched ? "Verifikasi QR berhasil" : "Verifikasi QR gagal",
          matched ? "success" : "danger"
        ),
      ],
    }));
    if (!matched && curStatus === "pending") patchReturn(ret.id, { status: "flagged", qrStatus: "invalid" });
    else patchReturn(ret.id, { qrStatus: result });
  };

  const doScanQR = () => {
    if (!ret || scanning) return;
    setVerifyResult(null);
    setShowScanner(true);
  };

  const navTo = (r) => { setLocalId(r.id); if (setSelectedReturnId) setSelectedReturnId(r.id); setVerifyResult(null); setScanning(false); };

  const requestStepUp = ({ actionKey, actionLabel, onVerified, reasons }) => {
    const config = riskSummary.stepUpConfig?.[actionKey];
    const finalReasons = reasons ?? config?.reasons ?? ["Aksi sensitif memerlukan konfirmasi."];

    if (currentUser?.id) {
      generateOtp(currentUser.id, {
        purpose: "step_up",
        metadata: {
          entityType: "return",
          entityId: ret.id,
          actionKey,
        },
      });
    }

    setRiskSummary((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        createSecurityTimelineEvent(
          ret.id.toLowerCase(),
          "step-up",
          `Verifikasi step-up dipicu untuk ${actionLabel}`,
          "warning"
        ),
      ],
    }));

    stepUpActionRef.current = onVerified;
    setStepUpState({
      open: true,
      actionKey,
      actionLabel,
      reasons: finalReasons,
      helperText: config?.helperText ?? "Masukkan OTP admin untuk melanjutkan aksi sensitif ini.",
    });
  };

  const closeStepUp = () => {
    setStepUpState({
      open: false,
      actionKey: "",
      actionLabel: "",
      reasons: [],
      helperText: "",
    });
    stepUpActionRef.current = null;
  };

  const handleStepUpSuccess = () => {
    const pendingAction = stepUpActionRef.current;

    setRiskSummary((prev) => ({
      ...prev,
      sessionRiskState: {
        ...prev.sessionRiskState,
        otpRequired: false,
        accessState:
          prev.sessionRiskState.accessState === "OTP Required"
            ? "High Risk"
            : prev.sessionRiskState.accessState,
      },
      trustedDeviceStatus: {
        ...prev.trustedDeviceStatus,
        verificationRequired: false,
        verificationStatus: "Step-up terverifikasi untuk sesi ini",
      },
      timeline: [
        ...prev.timeline,
        createSecurityTimelineEvent(
          ret.id.toLowerCase(),
          "otp",
          `OTP terverifikasi untuk ${stepUpState.actionLabel}`,
          "success"
        ),
      ],
    }));

    closeStepUp();
    pendingAction?.();
  };

  const handleResolveFlag = (flag) => {
    requestStepUp({
      actionKey: "resolveHighRiskFlag",
      actionLabel: `Resolve ${flag.title}`,
      reasons: [
        `Flag ${flag.ruleCode} masih aktif pada case ini.`,
        "Resolving high risk flag memerlukan verifikasi tambahan.",
      ],
      onVerified: () => {
        resolveFlag(flag.id);
        setRiskSummary((prev) => ({
          ...prev,
          flags: prev.flags.map((item) =>
            item.id === flag.id ? { ...item, status: "resolved" } : item
          ),
          timeline: [
            ...prev.timeline,
            createSecurityTimelineEvent(
              ret.id.toLowerCase(),
              "risk",
              `High-risk flag resolved: ${flag.title}`,
              "success"
            ),
          ],
        }));
      },
    });
  };

  if (!ret) return (
    <div className="adm-section">
      <button className="adm-od-back-btn" onClick={() => setActive("returns")}>← Kembali ke Return</button>
      <div className="adm-pa-empty"><p>Tidak ada data return.</p></div>
    </div>
  );

  const st      = RETURN_STATUS_META[curStatus] ?? { label: curStatus, color: "#aaa", bg: "rgba(170,170,170,0.1)" };
  const photos  = ret.photos ?? [];
  const receipt = ret.receiptB64 ?? null;
  return (
    <div className="adm-section">

      {/* Breadcrumb */}
      <div className="adm-od-breadcrumb">
        <button className="adm-od-back-btn" onClick={() => setActive("returns")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke Return
        </button>
        <span className="adm-od-breadcrumb-sep">›</span>
        <span className="adm-od-breadcrumb-id">{ret.id}</span>
        <span className="adm-status-pill" style={{ color: st.color, background: st.bg, fontSize: 12, padding: "3px 10px" }}>{st.label}</span>
        {ret.monitoringFlag && <span className="adm-return-flag" style={{ marginLeft: 4, fontSize: 12 }}><AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {ret.monitoringFlag}</span>}
        <CompactRiskIndicator summary={riskSummary} />
        <div className="adm-od-nav-btns">
          <button className="adm-od-nav-btn" disabled={currentIdx <= 0} onClick={() => navTo(allReturns[currentIdx - 1])}>‹</button>
          <span className="adm-od-nav-label">{currentIdx + 1} / {allReturns.length}</span>
          <button className="adm-od-nav-btn" disabled={currentIdx >= allReturns.length - 1} onClick={() => navTo(allReturns[currentIdx + 1])}>›</button>
        </div>
      </div>

      {/* Ticket */}
      <div className="adm-pa-ticket">
        <div className="adm-pa-ticket-bar">
          <div className="adm-pa-ticket-bar-left">
            <span className="adm-pa-ticket-id">#{ret.id}</span>
            <span className="adm-pa-ticket-date">{ret.date}</span>
            <span style={{ fontSize: 13, color: "#888" }}>→ Pesanan {ret.orderId}</span>
          </div>
          <span className="adm-status-pill" style={{ color: st.color, background: st.bg, fontSize: 12.5, fontWeight: 700 }}>● {st.label}</span>
        </div>

        <div className="adm-pa-ticket-body">

          {/* ── LEFT ── */}
          <div className="adm-pa-body-left">

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Informasi Pelanggan</p>
              <div className="adm-pa-customer">
                <Avatar name={ret.customer} size={48} />
                <div>
                  <p className="adm-pa-customer-name">{ret.customer}</p>
                  {ret.email && <p className="adm-pa-customer-sub">{ret.email}</p>}
                </div>
              </div>
              {ret.monitoringFlag && (
                <div className="adm-return-flag-block" style={{ marginTop: 10 }}>
                  <span className="adm-return-flag adm-return-flag--lg"><AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {ret.monitoringFlag}</span>
                  <p className="adm-return-flag-note">Aktivitas return customer ini ditandai. Tinjau dengan cermat sebelum menyetujui.</p>
                </div>
              )}
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Produk yang Di-return</p>
              <div className="adm-pa-items">
                {(ret.products ?? []).map((p, i) => (
                  <div key={i} className="adm-pa-item">
                    <div className="adm-pa-item-info">
                      <span className="adm-pa-item-name">{p.name}</span>
                      <span className="adm-pa-item-qty">×{p.qty}</span>
                    </div>
                    <span className="adm-pa-item-price">{fmt(p.price * p.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="adm-pa-total-row">
                <span>Total Refund</span>
                <span className="adm-pa-total-val">{fmt(ret.total)}</span>
              </div>
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Alasan Return</p>
              <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>"{ret.reason}"</p>
              {ret.conditionNote && ret.conditionNote !== ret.reason && (
                <p style={{ fontSize: 13, color: "#888", marginTop: 6, lineHeight: 1.5 }}>{ret.conditionNote}</p>
              )}
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Bukti Pembelian (E-Receipt)</p>
              {receipt ? (
                receipt.startsWith("data:application/pdf") ? (
                  <a
                    className="adm-proof-file-btn"
                    href={receipt}
                    download={`e-receipt-${ret.orderId}.pdf`}
                    onClick={e => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    e-receipt-{ret.orderId}.pdf
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </a>
                ) : (
                  <button className="adm-proof-file-btn" onClick={() => setReceiptZoom(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    e-receipt-{ret.orderId}.jpg
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/></svg>
                  </button>
                )
              ) : (
                <p style={{ fontSize: 13, color: "#bbb" }}>Tidak ada e-receipt dilampirkan.</p>
              )}
            </div>

            <div className="adm-pa-block adm-pa-block--last">
              <p className="adm-pa-block-label">Foto Produk ({photos.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {photos.length > 0 ? photos.map((ph, i) => (
                  <button key={i} className="adm-proof-file-btn" onClick={() => setPhotoZoom(i)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    foto-produk-{i + 1}.jpg
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/></svg>
                  </button>
                )) : <p style={{ fontSize: 13, color: "#bbb" }}>Tidak ada foto dilampirkan.</p>}
              </div>
            </div>

          </div>

          <div className="adm-pa-vdivider" />

          {/* ── RIGHT ── */}
          <div className="adm-pa-body-right">

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Risiko Sesi</p>
              <SessionRiskSummary state={riskSummary.sessionRiskState} compact />
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Perangkat Terpercaya</p>
              <TrustedDeviceCard device={riskSummary.trustedDeviceStatus} compact />
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Pemantauan Risiko</p>
              <RiskScoreCard summary={riskSummary} compact />
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Verifikasi QR Produk</p>
              <div className="adm-qrv-wrap">
                <div className="adm-qr-steps">

                  {/* Step 1 — scan */}
                  <div className="adm-qr-step">
                    <div className={`adm-qr-step-num${curQr === "valid" ? " adm-qr-step-num--match" : curQr === "invalid" ? " adm-qr-step-num--mismatch" : " adm-qr-step-num--done"}`}>
                      {curQr === "valid" ? "✓" : curQr === "invalid" ? "✗" : "1"}
                    </div>
                    <div className="adm-qr-step-body">
                      <p className="adm-qr-step-lbl">Scan Produk Dikembalikan</p>
                      {!curQr ? (
                        <button className="adm-qrv-cam-btn" onClick={doScanQR}
                          disabled={curStatus === "completed" || curStatus === "rejected"}>
                          <IcQr />
                          Scan QR Code
                        </button>
                      ) : (
                        <div className="adm-qr-scanned-row">
                          <code className={`adm-qr-code-chip adm-qr-code-chip--${curQr === "valid" ? "valid" : "invalid"}`}>
                            {localScannedVal[ret.id] ?? ret.scannedQr ?? "—"}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3 — result */}
                  {curQr && (() => {
                    const scanned = localScannedVal[ret.id] ?? ret.scannedQr ?? "—";
                    const isMatch = curQr === "valid";
                    return (
                      <div className="adm-qr-step adm-qr-step--last">
                        <div className={`adm-qr-step-num ${isMatch ? "adm-qr-step-num--match" : "adm-qr-step-num--mismatch"}`}>
                          {isMatch ? "✓" : "✗"}
                        </div>
                        <div className="adm-qr-step-body">
                          <p className="adm-qr-step-lbl">Hasil Verifikasi</p>
                          <div className={`adm-qrv-result ${isMatch ? "adm-qrv-result--match" : "adm-qrv-result--mismatch"}`}>

                            {/* Header */}
                            <div className="adm-qrv-result-head">
                              {isMatch ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              )}
                              <span className={`adm-qrv-result-title ${isMatch ? "adm-qrv-result-title--match" : "adm-qrv-result-title--mismatch"}`}>
                                {isMatch ? "Produk Terverifikasi" : "QR Tidak Cocok"}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="adm-qrv-result-desc">
                              {isMatch
                                ? "Kode QR cocok. Produk yang dikembalikan adalah produk asli yang terdaftar."
                                : "Produk yang dikembalikan tidak sesuai dengan sistem. Kemungkinan produk berbeda atau tidak asli."}
                            </p>

                            {/* Code comparison */}
                            <div className="adm-qrv-compare">
                              <div className="adm-qrv-compare-col">
                                <span className="adm-qrv-compare-lbl">Terdaftar</span>
                                <code className="adm-qrv-compare-code">{ret.qrCode}</code>
                              </div>
                              <div className={`adm-qrv-compare-op ${isMatch ? "adm-qrv-compare-op--eq" : "adm-qrv-compare-op--neq"}`}>
                                {isMatch ? "=" : "≠"}
                              </div>
                              <div className="adm-qrv-compare-col">
                                <span className="adm-qrv-compare-lbl">Hasil Scan</span>
                                <code className={`adm-qrv-compare-code ${isMatch ? "adm-qrv-compare-code--match" : "adm-qrv-compare-code--mismatch"}`}>{scanned}</code>
                              </div>
                            </div>

                            {/* Footer hint / action */}
                            {isMatch ? (
                              <div className="adm-qrv-hint adm-qrv-hint--ok">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Proses refund dapat dilanjutkan
                              </div>
                            ) : (
                              <div className="adm-qrv-mismatch-footer">
                                <div className="adm-qrv-hint adm-qrv-hint--warn">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                  Return ini otomatis ditandai mencurigakan
                                </div>
                                <button className="adm-qr-rescan-btn"
                                  onClick={() => { setVerifyResult(null); setLocalQr(p => ({ ...p, [ret.id]: null })); setLocalScannedVal(p => ({ ...p, [ret.id]: null })); }}>
                                  ↺ Scan Ulang
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>
            </div>

            <div className="adm-pa-block adm-pa-block--last">
              <p className="adm-pa-block-label">Keputusan Admin</p>
              {curStatus === "completed" || curStatus === "rejected" ? (
                <div className="adm-od-resolved-note">
                  <span style={{ fontSize: 20 }}>{curStatus === "completed" ? <CheckCircle size={20} /> : <Ban size={20} />}</span>
                  <p>Return ini sudah {curStatus === "completed" ? "selesai diproses" : "ditolak"}.</p>
                </div>
              ) : curStatus === "processing" ? (
                <div className="adm-pa-actions">
                  {curQr === "invalid" ? (
                    <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, marginBottom: 10, fontSize: 13, color: "#ef4444", lineHeight: 1.5, border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                      QR tidak cocok — return tidak dapat ditandai selesai sebelum verifikasi produk berhasil.
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: "10px 14px", background: "rgba(74,159,212,0.1)", borderRadius: 10, marginBottom: 10, fontSize: 13, color: "#4a9fd4", lineHeight: 1.5 }}>
                        <Package size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Return sedang diproses. Tandai selesai setelah refund dilakukan.
                      </div>
                      <button className="adm-pa-approve-btn" onClick={() => patchReturn(ret.id, { status: "completed" })}><IcCheck /> Tandai Return Selesai</button>
                    </>
                  )}
                  <button
                    className="adm-pa-reject-btn"
                    onClick={() => requestStepUp({
                      actionKey: "rejectReturn",
                      actionLabel: "Tolak Pengembalian",
                      onVerified: () => {
                        setRiskSummary((prev) => ({
                          ...prev,
                          timeline: [
                            ...prev.timeline,
                            createSecurityTimelineEvent(
                              ret.id.toLowerCase(),
                              "action",
                              "Aksi sensitif dikonfirmasi: Tolak Pengembalian",
                              "success"
                            ),
                          ],
                        }));
                        patchReturn(ret.id, { status: "rejected" });
                      },
                    })}
                  >
                    ✕ Tolak Return
                  </button>
                </div>
              ) : (
                <div className="adm-pa-actions">
                  <p style={{ fontSize: 12.5, color: "#888", marginBottom: 10 }}>
                    {curQr === "valid" ? "✓ QR terverifikasi — siap diputuskan." : curQr === "invalid" ? "" : "Scan QR dulu untuk verifikasi, atau putuskan langsung."}
                  </p>
                  {curQr === "invalid" ? (
                    <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, marginBottom: 10, fontSize: 13, color: "#ef4444", lineHeight: 1.5, border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                      QR tidak cocok — return tidak dapat disetujui sebelum verifikasi produk berhasil.
                    </div>
                  ) : (
                    <button
                      className="adm-pa-approve-btn"
                      onClick={() => requestStepUp({
                        actionKey: "approveReturn",
                        actionLabel: "Setujui Pengembalian",
                        onVerified: () => {
                          setRiskSummary((prev) => ({
                            ...prev,
                            timeline: [
                              ...prev.timeline,
                              createSecurityTimelineEvent(
                                ret.id.toLowerCase(),
                                "action",
                                "Aksi sensitif dikonfirmasi: Setujui Pengembalian",
                                "success"
                              ),
                            ],
                          }));
                          patchReturn(ret.id, { status: "processing" });
                        },
                      })}
                    >
                      <IcCheck /> Setujui Return
                    </button>
                  )}
                  <button
                    className="adm-pa-reject-btn"
                    onClick={() => requestStepUp({
                      actionKey: "rejectReturn",
                      actionLabel: "Tolak Pengembalian",
                      onVerified: () => {
                        setRiskSummary((prev) => ({
                          ...prev,
                          timeline: [
                            ...prev.timeline,
                            createSecurityTimelineEvent(
                              ret.id.toLowerCase(),
                              "action",
                              "Aksi sensitif dikonfirmasi: Tolak Pengembalian",
                              "success"
                            ),
                          ],
                        }));
                        patchReturn(ret.id, { status: "rejected" });
                      },
                    })}
                  >
                    ✕ Tolak Return
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <CaseRiskPanel summary={riskSummary} entityLabel={`return ${ret.id}`} onResolveFlag={handleResolveFlag} />

      <StepUpVerificationModal
        open={stepUpState.open}
        actionLabel={stepUpState.actionLabel}
        caseId={ret.id}
        reasons={stepUpState.reasons}
        helperText={stepUpState.helperText}
        verificationHint="Use test OTP 123456."
        onVerifyCode={(code) =>
          verifyOtp(session?.userId ?? currentUser?.id, code, {
            purpose: "step_up",
          })
        }
        onClose={closeStepUp}
        onSuccess={handleStepUpSuccess}
      />

      {/* Zoom overlays */}
      {receiptZoom && receipt && !receipt.startsWith("data:application/pdf") && (
        <div className="adm-proof-zoom-overlay" onClick={() => setReceiptZoom(false)}>
          <img src={receipt} alt="E-Receipt" className="adm-proof-zoom-img" />
          <button className="adm-proof-zoom-close" onClick={() => setReceiptZoom(false)}>✕</button>
        </div>
      )}
      {photoZoom !== null && photos[photoZoom]?.startsWith?.("data:") && (
        <div className="adm-proof-zoom-overlay" onClick={() => setPhotoZoom(null)}>
          <img src={photos[photoZoom]} alt={`Foto ${photoZoom + 1}`} className="adm-proof-zoom-img" />
          <button className="adm-proof-zoom-close" onClick={() => setPhotoZoom(null)}>✕</button>
        </div>
      )}

      {showScanner && (
        <CameraScanner
          onScan={handleScanResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA: Payment Approval & Receipt Verification
   ═══════════════════════════════════════════════════════════ */
const PENDING_PAYMENT_ORDER = {
  id: "ORD-015",
  customer: "Tiara Putri",
  email: "tiara@gmail.com",
  phone: "082198765432",
  date: "14 Apr 2025",
  items: [
    { name: "Gentle Foaming Cleanser", qty: 1, price: 89000 },
    { name: "Rose Water Mist",         qty: 1, price: 85000 },
  ],
  total: 174000,
  payment: "BCA Transfer",
  address: "Jl. Pemuda No. 21, Semarang",
  fraud: { status: "safe" },
};

const VALID_RECEIPT_DATA = {
  orderId:         "ORD-017",
  customer:        "Dewi Larasati",
  total:           335000,
  date:            "14 April 2025",
  verifiedAt:      "16 April 2025, 16:08",
  signatureStatus: "Cocok dengan database ✓",
};

const VERIFY_HISTORY_DATA = [
  { id: "VRF-001", orderId: "ORD-017", customer: "Dewi Larasati",   date: "16 Apr 2025 16:08", result: "valid",   admin: "Admin", file: "receipt-ORD-017.pdf"           },
  { id: "VRF-002", orderId: "ORD-012", customer: "Maya Sari",       date: "15 Apr 2025 09:30", result: "invalid", admin: "Admin", file: "bukti-transfer-edited.pdf"      },
  { id: "VRF-003", orderId: "ORD-018", customer: "Fitri Handayani", date: "14 Apr 2025 14:22", result: "valid",   admin: "Admin", file: "receipt-ORD-018.pdf"           },
  { id: "VRF-004", orderId: "ORD-011", customer: "Sara Tancredi",   date: "13 Apr 2025 11:15", result: "invalid", admin: "Admin", file: "receipt-modified.pdf"          },
  { id: "VRF-005", orderId: "ORD-001", customer: "Bunga Citra",     date: "12 Apr 2025 08:45", result: "valid",   admin: "Admin", file: "receipt-ORD-001.pdf"           },
  { id: "VRF-006", orderId: "ORD-016", customer: "Ayu Rahayu",      date: "11 Apr 2025 16:50", result: "valid",   admin: "Admin", file: "receipt-ORD-016.pdf"           },
];

/* ═══════════════════════════════════════════════════════════
   SECTION: ORDER DETAIL (was PaymentApproval)
   Shows full detail for any order with all admin actions
   ═══════════════════════════════════════════════════════════ */
function OrderDetail({ selectedOrderId, setSelectedOrderId, setActive }) {
  const { orders: ctxOrders, approveOrder, rejectOrder, shipOrder, deliverOrder } = useOrders();
  const { mockStore, session, currentUser, generateOtp, verifyOtp, resolveFlag } = useMockData();

  const allOrders = ctxOrders.map(o => ({
    ...o,
    items: o.items ?? [],
    products: o.items?.map(i => i.name) ?? [],
    subtotal: o.subtotal ?? o.total,
    deliveryFee: o.deliveryFee ?? 0,
    fromCtx: true,
  }));

  const initialOrderId = selectedOrderId ?? allOrders[0]?.id;
  const [localId, setLocalId] = useState(initialOrderId);
  const currentId = localId ?? allOrders[0]?.id;
  const order = allOrders.find(o => o.id === currentId) ?? allOrders[0];

  // Sync when prop changes (coming from Orders table click)
  useEffect(() => {
    if (selectedOrderId) setLocalId(selectedOrderId);
  }, [selectedOrderId]);

  // Action state
  const [approveModal, setApproveModal] = useState(false);
  const [approveStep,  setApproveStep]  = useState("confirm");
  const [rejectModal,  setRejectModal]  = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [shipModal,    setShipModal]    = useState(false);
  const [courierInput, setCourierInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [deliverModal,  setDeliverModal] = useState(false);
  const [deliverFile,   setDeliverFile]  = useState(null);
  const [deliverPreview, setDeliverPreview] = useState(null);
  const deliverInputRef = useState(() => ({ current: null }))[0];
  const [proofZoom,    setProofZoom]    = useState(false);
  const [deliverProofZoom, setDeliverProofZoom] = useState(false);
  const [riskSummary, setRiskSummary] = useState(() => getCaseRiskSummary(mockStore, "order", initialOrderId));
  const [stepUpState, setStepUpState] = useState({
    open: false,
    actionKey: "",
    actionLabel: "",
    reasons: [],
    helperText: "",
  });
  const stepUpActionRef = useRef(null);

  const [localStatuses, setLocalStatuses] = useState({});
  const [localShip, setLocalShip] = useState({});

  const getStatus = (o) => localStatuses[o.id] ?? o.status;
  const curStatus = order ? getStatus(order) : null;

  useEffect(() => {
    if (!order?.id) return;
    setRiskSummary(getCaseRiskSummary(mockStore, "order", order.id));
    setStepUpState({
      open: false,
      actionKey: "",
      actionLabel: "",
      reasons: [],
      helperText: "",
    });
    stepUpActionRef.current = null;
    setApproveModal(false);
    setApproveStep("confirm");
    setRejectModal(false);
    setRejectReason("");
    setShipModal(false);
    setDeliverModal(false);
    setDeliverFile(null);
    setDeliverPreview(null);
  }, [order?.id]);

  const requestStepUp = ({ actionKey, actionLabel, onVerified, reasons }) => {
    const config = riskSummary.stepUpConfig?.[actionKey];
    const finalReasons = reasons ?? config?.reasons ?? ["Aksi sensitif memerlukan konfirmasi."];

    if (currentUser?.id) {
      generateOtp(currentUser.id, {
        purpose: "step_up",
        metadata: {
          entityType: "order",
          entityId: order.id,
          actionKey,
        },
      });
    }

    setRiskSummary((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        createSecurityTimelineEvent(
          order.id.toLowerCase(),
          "step-up",
          `Verifikasi step-up dipicu untuk ${actionLabel}`,
          "warning"
        ),
      ],
    }));

    stepUpActionRef.current = onVerified;
    setStepUpState({
      open: true,
      actionKey,
      actionLabel,
      reasons: finalReasons,
      helperText: config?.helperText ?? "Masukkan OTP admin untuk melanjutkan aksi sensitif ini.",
    });
  };

  const closeStepUp = () => {
    setStepUpState({
      open: false,
      actionKey: "",
      actionLabel: "",
      reasons: [],
      helperText: "",
    });
    stepUpActionRef.current = null;
  };

  const handleStepUpSuccess = () => {
    const pendingAction = stepUpActionRef.current;

    setRiskSummary((prev) => ({
      ...prev,
      sessionRiskState: {
        ...prev.sessionRiskState,
        otpRequired: false,
        accessState:
          prev.sessionRiskState.accessState === "OTP Required"
            ? "High Risk"
            : prev.sessionRiskState.accessState,
      },
      trustedDeviceStatus: {
        ...prev.trustedDeviceStatus,
        verificationRequired: false,
        verificationStatus: "Step-up terverifikasi untuk sesi ini",
      },
      timeline: [
        ...prev.timeline,
        createSecurityTimelineEvent(
          order.id.toLowerCase(),
          "otp",
          `OTP terverifikasi untuk ${stepUpState.actionLabel}`,
          "success"
        ),
      ],
    }));

    closeStepUp();
    pendingAction?.();
  };

  const handleResolveFlag = (flag) => {
    requestStepUp({
      actionKey: "resolveHighRiskFlag",
      actionLabel: `Resolve ${flag.title}`,
      reasons: [
        `Flag ${flag.ruleCode} masih aktif pada case ini.`,
        "Resolving high risk flag memerlukan verifikasi tambahan.",
      ],
      onVerified: () => {
        resolveFlag(flag.id);
        setRiskSummary((prev) => ({
          ...prev,
          flags: prev.flags.map((item) =>
            item.id === flag.id ? { ...item, status: "resolved" } : item
          ),
          timeline: [
            ...prev.timeline,
            createSecurityTimelineEvent(
              order.id.toLowerCase(),
              "risk",
              `High-risk flag resolved: ${flag.title}`,
              "success"
            ),
          ],
        }));
      },
    });
  };

  const handleApprove = () => {
    setApproveStep("loading");
    setTimeout(() => {
      if (order.fromCtx) approveOrder(order.id);
      else setLocalStatuses(p => ({ ...p, [order.id]: "packing" }));
      setRiskSummary((prev) => ({
        ...prev,
        timeline: [
          ...prev.timeline,
          createSecurityTimelineEvent(
            order.id.toLowerCase(),
            "action",
            "Aksi sensitif dikonfirmasi: Setujui Pembayaran",
            "success"
          ),
        ],
      }));
      setApproveStep("success");
    }, 1600);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    if (order.fromCtx) rejectOrder(order.id, rejectReason.trim());
    else setLocalStatuses(p => ({ ...p, [order.id]: "rejected" }));
    setRiskSummary((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        createSecurityTimelineEvent(
          order.id.toLowerCase(),
          "action",
          "Aksi sensitif dikonfirmasi: Tolak Pembayaran",
          "success"
        ),
      ],
    }));
    setRejectModal(false);
    setRejectReason("");
  };

  const handleShipConfirm = () => {
    if (!trackingInput.trim()) return;
    if (order.fromCtx) shipOrder(order.id, courierInput.trim() || "JNE Regular", trackingInput.trim());
    else {
      setLocalStatuses(p => ({ ...p, [order.id]: "shipped" }));
      setLocalShip(p => ({ ...p, [order.id]: { courier: courierInput.trim() || "JNE Regular", trackingNumber: trackingInput.trim() } }));
    }
    setShipModal(false);
  };

  const handleDeliverFile = (file) => {
    if (!file) return;
    setDeliverFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result);
      setDeliverPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleDeliverConfirm = () => {
    if (order.fromCtx) deliverOrder(order.id, deliverPreview ?? null);
    else setLocalStatuses(p => ({ ...p, [order.id]: "delivered" }));
    setDeliverModal(false);
    setDeliverFile(null); setDeliverPreview(null);
  };

  if (!order) return (
    <div className="adm-section">
      <button className="adm-od-back-btn" onClick={() => setActive("orders")}>
        ← Kembali ke Pesanan
      </button>
      <div className="adm-pa-empty"><p>Tidak ada pesanan tersedia.</p></div>
    </div>
  );

  const st = STATUS_META[curStatus] ?? { label: curStatus, color: "#aaa", bg: "rgba(170,170,170,0.1)" };
  const shipInfo = localShip[order.id] ?? { courier: order.courier, trackingNumber: order.trackingNumber };
  const pendingCount = allOrders.filter(o => getStatus(o) === "pending").length;
  const currentIdx = allOrders.findIndex(o => o.id === currentId);
  return (
    <div className="adm-section">

      {/* ── Breadcrumb + back ── */}
      <div className="adm-od-breadcrumb">
        <button className="adm-od-back-btn" onClick={() => setActive("orders")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Kembali ke Pesanan
        </button>
        <span className="adm-od-breadcrumb-sep">›</span>
        <span className="adm-od-breadcrumb-id">{order.id}</span>
        <span className="adm-status-pill" style={{ color: st.color, background: st.bg, fontSize: 12, padding: "3px 10px" }}>{st.label}</span>
        <CompactRiskIndicator summary={riskSummary} />
        {pendingCount > 0 && (
          <span className="adm-pa-pending-badge" style={{ marginLeft: "auto" }}>
            <IcCreditCard /> {pendingCount} pending
          </span>
        )}
        {/* Compact prev/next navigator */}
        <div className="adm-od-nav-btns">
          <button
            className="adm-od-nav-btn"
            disabled={currentIdx <= 0}
            onClick={() => { const o = allOrders[currentIdx - 1]; if (o) { setLocalId(o.id); setSelectedOrderId(o.id); setApproveStep("confirm"); } }}
          >‹</button>
          <span className="adm-od-nav-label">{currentIdx + 1} / {allOrders.length}</span>
          <button
            className="adm-od-nav-btn"
            disabled={currentIdx >= allOrders.length - 1}
            onClick={() => { const o = allOrders[currentIdx + 1]; if (o) { setLocalId(o.id); setSelectedOrderId(o.id); setApproveStep("confirm"); } }}
          >›</button>
        </div>
      </div>

      {/* ── Ticket ── */}
      <div className="adm-pa-ticket">
        <div className="adm-pa-ticket-bar">
          <div className="adm-pa-ticket-bar-left">
            <span className="adm-pa-ticket-id">#{order.id}</span>
            <span className="adm-pa-ticket-date">{order.date}</span>
          </div>
          <span className="adm-status-pill" style={{ color: st.color, background: st.bg, fontSize: 12.5, fontWeight: 700 }}>
            ● {st.label}
          </span>
        </div>

        <div className="adm-pa-ticket-body">

          {/* ── LEFT ── */}
          <div className="adm-pa-body-left">

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Informasi Pelanggan</p>
              <div className="adm-pa-customer">
                <Avatar name={order.customer} size={48} />
                <div>
                  <p className="adm-pa-customer-name">{order.customer}</p>
                  {order.email && <p className="adm-pa-customer-sub">{order.email}</p>}
                  {order.phone && <p className="adm-pa-customer-sub">{order.phone}</p>}
                </div>
              </div>
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Produk Dipesan</p>
              <div className="adm-pa-items">
                {(order.items ?? []).map((item, i) => (
                  <div key={i} className="adm-pa-item">
                    <div className="adm-pa-item-info">
                      <span className="adm-pa-item-name">{item.name}</span>
                      <span className="adm-pa-item-qty">×{item.qty}</span>
                    </div>
                    <span className="adm-pa-item-price">{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="adm-pa-total-row">
                <span>Total Pembayaran</span>
                <span className="adm-pa-total-val">{fmt(order.total)}</span>
              </div>
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Alamat Pengiriman</p>
              <p className="adm-pa-shipping-val">{order.address || "—"}</p>
            </div>

            {order.delivery && (
              <div className="adm-pa-block">
                <p className="adm-pa-block-label">Metode Pengiriman</p>
                <p className="adm-pa-shipping-val">{order.delivery}{order.deliveryFee > 0 ? ` — ${fmt(order.deliveryFee)}` : " — Gratis"}</p>
              </div>
            )}

            {curStatus === "cancelled" && order.cancelReason && (
              <div className="adm-pa-block adm-pa-block--last">
                <p className="adm-pa-block-label">Alasan Pembatalan</p>
                <div className="adm-pa-reject-note">{order.cancelReason}</div>
              </div>
            )}

            {/* Tracking info if shipped */}
            {(curStatus === "shipped" || curStatus === "delivered") && shipInfo?.trackingNumber && (
              <div className="adm-pa-block adm-pa-block--last">
                <p className="adm-pa-block-label">Info Pengiriman</p>
                <div className="adm-pa-tracking-box">
                  <div className="adm-pa-tracking-row">
                    <span>Kurir</span>
                    <strong>{shipInfo.courier}</strong>
                  </div>
                  <div className="adm-pa-tracking-row">
                    <span>No. Resi</span>
                    <code className="adm-od-resi">{shipInfo.trackingNumber}</code>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {curStatus === "rejected" && order.rejectionReason && (
              <div className="adm-pa-block adm-pa-block--last">
                <p className="adm-pa-block-label">Alasan Penolakan</p>
                <div className="adm-pa-reject-note">{order.rejectionReason}</div>
              </div>
            )}

          </div>

          <div className="adm-pa-vdivider" />

          {/* ── RIGHT ── */}
          <div className="adm-pa-body-right">

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Risiko Sesi</p>
              <SessionRiskSummary state={riskSummary.sessionRiskState} compact />
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Perangkat Terpercaya</p>
              <TrustedDeviceCard device={riskSummary.trustedDeviceStatus} compact />
            </div>

            {/* Payment proof — click to view */}
            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Pemantauan Risiko</p>
              <RiskScoreCard summary={riskSummary} compact />
            </div>

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Bukti Transfer</p>
              {order.paymentProof && order.paymentProof.startsWith("data:") ? (
                <button className="adm-proof-file-btn" onClick={() => setProofZoom(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  bukti-transfer-{order.id}.jpg
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/></svg>
                </button>
              ) : order.paymentProof ? (
                <div className="adm-proof-file-btn adm-proof-file-btn--static">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ color: "#2e7d32" }}>{order.paymentProof}</span>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#bbb" }}>Belum ada bukti transfer.</p>
              )}
            </div>

            {/* Delivery proof — if delivered */}
            {curStatus === "delivered" && (
              <div className="adm-pa-block">
                <p className="adm-pa-block-label">Bukti Pengiriman</p>
                {order.deliveryProof && order.deliveryProof.startsWith("data:") ? (
                  <button className="adm-proof-file-btn" onClick={() => setDeliverProofZoom(true)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    bukti-pengiriman-{order.id}.jpg
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/></svg>
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: "#bbb" }}>Belum ada foto bukti pengiriman.</p>
                )}
              </div>
            )}

            {/* Actions based on status */}
            <div className="adm-pa-block adm-pa-block--last">
              <p className="adm-pa-block-label">Aksi</p>
              {curStatus === "pending" && (
                <div className="adm-pa-actions">
                  <button
                    className="adm-pa-approve-btn"
                    onClick={() => requestStepUp({
                      actionKey: "approvePayment",
                      actionLabel: "Setujui Pembayaran",
                      onVerified: () => {
                        setApproveModal(true);
                        setApproveStep("confirm");
                      },
                    })}
                  >
                    <IcCheck /> Setujui Pembayaran
                  </button>
                  <button
                    className="adm-pa-reject-btn"
                    onClick={() => requestStepUp({
                      actionKey: "rejectPayment",
                      actionLabel: "Tolak Pembayaran",
                      onVerified: () => {
                        setRejectModal(true);
                        setRejectReason("");
                      },
                    })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Tolak Pembayaran
                  </button>
                </div>
              )}
              {curStatus === "packing" && (
                <div className="adm-pa-actions">
                  <button className="adm-pa-approve-btn" onClick={() => { setShipModal(true); setCourierInput(""); setTrackingInput(""); }}>
                    <IcTruck /> Input Pengiriman
                  </button>
                </div>
              )}
              {curStatus === "shipped" && (
                <div className="adm-pa-actions">
                  <button className="adm-pa-approve-btn" onClick={() => { setDeliverModal(true); setDeliverFile(null); setDeliverPreview(null); }}>
                    <IcCheck /> Tandai Selesai Dikirim
                  </button>
                </div>
              )}
              {(curStatus === "delivered" || curStatus === "cancelled" || curStatus === "rejected") && (
                <div className="adm-od-resolved-note">
                  <span style={{ fontSize: curStatus === "delivered" ? 20 : 18 }}>
                    {curStatus === "delivered" ? <CheckCircle size={20} /> : <Ban size={18} />}
                  </span>
                  <p>Pesanan ini sudah {curStatus === "delivered" ? "selesai" : curStatus === "cancelled" ? "dibatalkan" : "ditolak"}.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Proof zoom overlays ── */}
      <CaseRiskPanel summary={riskSummary} entityLabel={`order ${order.id}`} onResolveFlag={handleResolveFlag} />

      <StepUpVerificationModal
        open={stepUpState.open}
        actionLabel={stepUpState.actionLabel}
        caseId={order.id}
        reasons={stepUpState.reasons}
        helperText={stepUpState.helperText}
        verificationHint="Use test OTP 123456."
        onVerifyCode={(code) =>
          verifyOtp(session?.userId ?? currentUser?.id, code, {
            purpose: "step_up",
          })
        }
        onClose={closeStepUp}
        onSuccess={handleStepUpSuccess}
      />

      {proofZoom && order.paymentProof?.startsWith("data:") && (
        <div className="adm-proof-zoom-overlay" onClick={() => setProofZoom(false)}>
          <img src={order.paymentProof} alt="Bukti TF Full" className="adm-proof-zoom-img" />
          <button className="adm-proof-zoom-close" onClick={() => setProofZoom(false)}>✕</button>
        </div>
      )}
      {deliverProofZoom && order.deliveryProof?.startsWith("data:") && (
        <div className="adm-proof-zoom-overlay" onClick={() => setDeliverProofZoom(false)}>
          <img src={order.deliveryProof} alt="Bukti Kirim Full" className="adm-proof-zoom-img" />
          <button className="adm-proof-zoom-close" onClick={() => setDeliverProofZoom(false)}>✕</button>
        </div>
      )}

      {/* ── Approve modal ── */}
      {approveModal && (
        <div className="adm-modal-overlay" onClick={() => approveStep !== "loading" && setApproveModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            {approveStep === "confirm" && <>
              <div className="adm-modal-header">
                <h3>Konfirmasi Persetujuan</h3>
                <button className="adm-modal-close" onClick={() => setApproveModal(false)}>✕</button>
              </div>
              <div className="adm-modal-body">
                <p>Yakin ingin menyetujui pembayaran <strong>{fmt(order.total)}</strong> dari <strong>{order.customer}</strong>?</p>
                <p className="adm-modal-hint">E-Receipt akan otomatis tersedia untuk customer setelah approval.</p>
              </div>
              <div className="adm-modal-footer">
                <button className="adm-pa-approve-btn" onClick={handleApprove}><IcCheck /> Ya, Setujui</button>
                <button className="adm-ghost-btn" onClick={() => setApproveModal(false)}>Batal</button>
              </div>
            </>}
            {approveStep === "loading" && (
              <div className="adm-modal-center">
                <div className="adm-modal-spinner" />
                <p className="adm-modal-loading-title">Memproses pembayaran…</p>
                <p className="adm-modal-loading-sub">Sedang generate E-Receipt untuk customer</p>
              </div>
            )}
            {approveStep === "success" && (
              <div className="adm-modal-center">
                <div className="adm-modal-success-icon"><IcCheck /></div>
                <h3 className="adm-modal-success-title">Pembayaran Disetujui!</h3>
                <p className="adm-modal-success-sub">E-Receipt berhasil digenerate dan tersedia untuk customer.</p>
                <div className="adm-modal-receipt-badge"><IcReceipt /> E-Receipt #{order.id} siap</div>
                <div className="adm-modal-footer" style={{ marginTop: 20 }}>
                  <button className="adm-pa-approve-btn" onClick={() => setApproveModal(false)}><IcReceipt /> Tutup</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reject modal ── */}
      {rejectModal && (
        <div className="adm-modal-overlay" onClick={() => setRejectModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3>Tolak Pembayaran</h3>
              <button className="adm-modal-close" onClick={() => setRejectModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <p style={{ marginBottom: 12 }}>Masukkan alasan penolakan (ditampilkan ke customer):</p>
              <textarea className="adm-modal-textarea" rows={4}
                placeholder="Contoh: Bukti transfer tidak sesuai, nominal tidak cocok, dll."
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="adm-modal-footer">
              <button className="adm-pa-reject-btn" onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>
                Konfirmasi Tolak
              </button>
              <button className="adm-ghost-btn" onClick={() => setRejectModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ship modal ── */}
      {shipModal && (
        <div className="adm-modal-overlay" onClick={() => setShipModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3>Input Info Pengiriman</h3>
              <button className="adm-modal-close" onClick={() => setShipModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <p style={{ marginBottom: 14, fontSize: 13.5, color: "#666" }}>
                Isi kurir dan nomor resi untuk order <strong>{order.id}</strong>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>KURIR</label>
                  <input className="adm-modal-textarea" style={{ minHeight: "unset", height: 40, resize: "none", borderRadius: 10 }}
                    placeholder="JNE Regular, SiCepat HALU, J&T Express…"
                    value={courierInput} onChange={e => setCourierInput(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>NOMOR RESI *</label>
                  <input className="adm-modal-textarea" style={{ minHeight: "unset", height: 40, resize: "none", borderRadius: 10 }}
                    placeholder="JNE20250415001234"
                    value={trackingInput} onChange={e => setTrackingInput(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-pa-approve-btn" onClick={handleShipConfirm} disabled={!trackingInput.trim()}>
                <IcTruck /> Konfirmasi Kirim
              </button>
              <button className="adm-ghost-btn" onClick={() => setShipModal(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deliver modal ── */}
      {deliverModal && (
        <div className="adm-modal-overlay" onClick={() => setDeliverModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <h3>Konfirmasi Selesai Dikirim</h3>
              <button className="adm-modal-close" onClick={() => setDeliverModal(false)}>✕</button>
            </div>
            <div className="adm-modal-body">
              <p style={{ marginBottom: 14, fontSize: 13.5, color: "#666" }}>
                Upload foto bukti paket sudah sampai untuk order <strong>{order.id}</strong>.
              </p>
              <input ref={r => deliverInputRef.current = r} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => handleDeliverFile(e.target.files?.[0])} />
              <div
                className={`adm-deliver-dropzone${deliverPreview ? " adm-deliver-dropzone--filled" : ""}`}
                onClick={() => deliverInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleDeliverFile(e.dataTransfer.files?.[0]); }}
              >
                {deliverPreview ? (
                  <div className="adm-deliver-preview">
                    <img src={deliverPreview} alt="Bukti kirim" />
                    <p className="adm-deliver-preview-name">✓ {deliverFile?.name}</p>
                    <p style={{ fontSize: 11, color: "#aaa" }}>Klik untuk ganti foto</p>
                  </div>
                ) : (
                  <div className="adm-deliver-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c97269" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <p>Drag & drop atau <span style={{ color: "#c97269", fontWeight: 700 }}>pilih foto</span></p>
                    <p style={{ fontSize: 11, color: "#bbb" }}>JPG, PNG — maks 5 MB</p>
                  </div>
                )}
              </div>
            </div>
            <div className="adm-modal-footer">
              <button className="adm-pa-approve-btn"
                disabled={deliverFile && !deliverPreview}
                onClick={handleDeliverConfirm}>
                {deliverFile && !deliverPreview
                  ? <><Loader2 size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Memproses foto...</>
                  : <><IcCheck /> Tandai Selesai</>}
              </button>
              <button className="adm-ghost-btn" onClick={() => { setDeliverPreview(null); setDeliverFile(null); handleDeliverConfirm(); }}>
                Selesai tanpa foto
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* Keep legacy alias in case anything references PaymentApproval */
const PaymentApproval = OrderDetail;

/* ═══════════════════════════════════════════════════════════
   SECTION: RECEIPT VERIFY  ← HALAMAN PALING PENTING
   Admin upload PDF receipt → sistem ekstrak hidden signature
   → tampilkan hasil VALID atau INVALID
   ═══════════════════════════════════════════════════════════ */
function ReceiptVerify() {
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result,    setResult]    = useState(null); // null | "valid" | "invalid"

  /* Simulasi proses verifikasi */
  const runVerify = (simulatedResult) => {
    setVerifying(true);
    setResult(null);
    setTimeout(() => {
      setVerifying(false);
      setResult(simulatedResult);
    }, 2200);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleFileInput = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleVerify = () => runVerify("valid"); // default: anggap valid bila upload manual

  const simulateValid   = () => { setFile({ name: "receipt-ORD-2024-001.pdf" }); runVerify("valid"); };
  const simulateInvalid = () => { setFile({ name: "receipt-tampered.pdf" });     runVerify("invalid"); };

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Verifikasi Keaslian E-Receipt</h2>
          <p className="adm-section-sub">Upload e-receipt untuk memverifikasi keaslian tanda tangan digital</p>
        </div>
      </div>

      <div className="adm-rv-layout">

        {/* ── Upload area ── */}
        <div className="adm-card adm-rv-upload-card">
          <h3 className="adm-card-title" style={{marginBottom:20}}>Upload E-Receipt</h3>

          {/* Drag & drop zone */}
          <div
            className={`adm-rv-dropzone${dragOver ? " adm-rv-dropzone--over" : ""}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("rv-file-input").click()}
          >
            <div className="adm-rv-drop-icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p className="adm-rv-drop-text">Drag &amp; drop file PDF di sini</p>
            <p className="adm-rv-drop-sub">atau klik untuk pilih file</p>
            <button className="adm-rv-browse-btn" type="button" onClick={e => { e.stopPropagation(); document.getElementById("rv-file-input").click(); }}>
              Pilih File
            </button>
            <p className="adm-rv-drop-hint">Hanya file PDF yang diterima</p>
          </div>
          <input
            id="rv-file-input"
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />

          {/* File terpilih */}
          {file && !verifying && (
            <div className="adm-rv-file-preview">
              <IcReceipt />
              <span className="adm-rv-file-name">{file.name}</span>
              <button className="adm-rv-file-remove" onClick={() => { setFile(null); setResult(null); }}>✕</button>
            </div>
          )}

          {/* Tombol verifikasi */}
          {file && !verifying && !result && (
            <button className="adm-rv-verify-btn" onClick={handleVerify}>
              Verifikasi Sekarang
            </button>
          )}

          {/* Loading state */}
          {verifying && (
            <div className="adm-rv-verifying">
              <div className="adm-modal-spinner" />
              <span>Mengekstrak digital signature…</span>
            </div>
          )}

          {/* ── Demo/Testing toggle buttons ── */}
          <div className="adm-rv-demo">
            <p className="adm-rv-demo-label">Demo / Testing:</p>
            <div className="adm-rv-demo-row">
              <button className="adm-rv-sim-btn adm-rv-sim--valid"   onClick={simulateValid}>Simulasi Valid</button>
              <button className="adm-rv-sim-btn adm-rv-sim--invalid" onClick={simulateInvalid}>Simulasi Invalid</button>
            </div>
          </div>
        </div>

        {/* ── Hasil Verifikasi ── */}
        {result && (
          <div className="adm-rv-result">

            {result === "valid" ? (
              <>
                {/* Banner VALID */}
                <div className="adm-rv-banner adm-rv-banner--valid">
                  <div className="adm-rv-banner-icon">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h2 className="adm-rv-result-title">E-Receipt VALID ✓</h2>
                    <p className="adm-rv-result-sub">Tanda tangan digital berhasil diverifikasi</p>
                  </div>
                </div>

                {/* Detail terverifikasi */}
                <div className="adm-card adm-rv-detail-card">
                  <h3 className="adm-card-title" style={{marginBottom:16}}>Informasi Terverifikasi</h3>
                  {[
                    ["Order ID",              VALID_RECEIPT_DATA.orderId],
                    ["Nama Pelanggan",         VALID_RECEIPT_DATA.customer],
                    ["Total Pembayaran",       fmt(VALID_RECEIPT_DATA.total)],
                    ["Tanggal Transaksi",      VALID_RECEIPT_DATA.date],
                    ["Diverifikasi pada",      VALID_RECEIPT_DATA.verifiedAt],
                    ["Status Tanda Tangan",    VALID_RECEIPT_DATA.signatureStatus],
                  ].map(([label, val]) => (
                    <div key={label} className="adm-rv-detail-row">
                      <span className="adm-rv-detail-label">{label}</span>
                      <span className="adm-rv-detail-val">{val}</span>
                    </div>
                  ))}
                </div>

                <p className="adm-rv-footer-text adm-rv-footer--valid">
                  ✓ Receipt ini asli dan dikeluarkan oleh sistem careofyou
                </p>
              </>
            ) : (
              <>
                {/* Banner INVALID */}
                <div className="adm-rv-banner adm-rv-banner--invalid">
                  <div className="adm-rv-banner-icon">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </div>
                  <div>
                    <h2 className="adm-rv-result-title">E-Receipt INVALID ✗</h2>
                    <p className="adm-rv-result-sub">Tanda tangan digital tidak ditemukan atau tidak cocok</p>
                  </div>
                </div>

                {/* Detail pemeriksaan */}
                <div className="adm-card adm-rv-detail-card">
                  <h3 className="adm-card-title" style={{marginBottom:16}}>Detail Pemeriksaan</h3>
                  <div className="adm-rv-detail-row">
                    <span className="adm-rv-detail-label">Status</span>
                    <span className="adm-rv-detail-val" style={{color:"#ef4444",fontWeight:700}}>Signature tidak ditemukan dalam file</span>
                  </div>
                  <div style={{marginTop:16}}>
                    <p className="adm-rv-causes-title">Kemungkinan penyebab:</p>
                    <ul className="adm-rv-causes-list">
                      <li>Receipt telah dimodifikasi atau diedit</li>
                      <li>Receipt bukan berasal dari sistem careofyou</li>
                      <li>File PDF telah dikompresi atau dikonversi ulang</li>
                    </ul>
                  </div>
                </div>

                <p className="adm-rv-footer-text adm-rv-footer--invalid">
                  ✗ Receipt ini tidak dapat dipercaya — lakukan investigasi manual
                </p>

                <button className="adm-rv-report-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Laporkan ke Log
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION: VERIFY HISTORY
   Riwayat semua verifikasi receipt yang pernah dilakukan admin.
   ═══════════════════════════════════════════════════════════ */
function VerifyHistory() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [query,        setQuery]        = useState("");

  const filtered = VERIFY_HISTORY_DATA.filter(v => {
    const matchStatus = statusFilter === "all" || v.result === statusFilter;
    const q = query.toLowerCase();
    const matchQ = !q || v.orderId.toLowerCase().includes(q) || v.customer.toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  const validCount   = VERIFY_HISTORY_DATA.filter(v => v.result === "valid").length;
  const invalidCount = VERIFY_HISTORY_DATA.filter(v => v.result === "invalid").length;

  const validRate = Math.round((validCount / VERIFY_HISTORY_DATA.length) * 100);
  const circleLen = 2 * Math.PI * 20; // r=20

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Riwayat Verifikasi Receipt</h2>
          <p className="adm-section-sub">{VERIFY_HISTORY_DATA.length} verifikasi tercatat</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="adm-vh-stats">
        <div className="adm-vh-stat-card adm-vh-stat-card--total">
          <div className="adm-vh-stat-icon-wrap adm-vh-stat-icon--brand">
            <IcHistory />
          </div>
          <div>
            <span className="adm-vh-stat-num">{VERIFY_HISTORY_DATA.length}</span>
            <span className="adm-vh-stat-lbl">Total Verifikasi</span>
          </div>
        </div>
        <div className="adm-vh-stat-card adm-vh-stat-card--valid">
          <div className="adm-vh-stat-icon-wrap adm-vh-stat-icon--green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <span className="adm-vh-stat-num">{validCount}</span>
            <span className="adm-vh-stat-lbl">Receipt Valid</span>
          </div>
        </div>
        <div className="adm-vh-stat-card adm-vh-stat-card--invalid">
          <div className="adm-vh-stat-icon-wrap adm-vh-stat-icon--red">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <span className="adm-vh-stat-num">{invalidCount}</span>
            <span className="adm-vh-stat-lbl">Receipt Invalid</span>
          </div>
        </div>
        <div className="adm-vh-stat-card adm-vh-stat-card--rate">
          <div className="adm-vh-rate-circle">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="20" fill="none" stroke="#f0e0de" strokeWidth="5"/>
              <circle
                cx="26" cy="26" r="20" fill="none"
                stroke="#22c55e" strokeWidth="5"
                strokeDasharray={`${circleLen * validRate / 100} ${circleLen}`}
                strokeLinecap="round"
                transform="rotate(-90 26 26)"
              />
              <text x="26" y="30" textAnchor="middle" fontSize="12" fontWeight="800" fill="#2d2d2d">{validRate}%</text>
            </svg>
          </div>
          <div>
            <span className="adm-vh-stat-num" style={{color:"#15803d"}}>{validRate}%</span>
            <span className="adm-vh-stat-lbl">Tingkat Valid</span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="adm-vh-filter-row">
        <div className="adm-search-bar" style={{flex:1}}>
          <IcSearch />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari Order ID atau nama customer…"
            className="adm-search-input"
          />
          {query && <button className="adm-search-clear" onClick={() => setQuery("")}>✕</button>}
        </div>
        <div className="adm-vh-filter-pills">
          {[["all","Semua"],["valid","Valid"],["invalid","Invalid"]].map(([val, lbl]) => (
            <button
              key={val}
              className={`adm-vh-pill${statusFilter === val ? " adm-vh-pill--active" : ""}${val !== "all" ? ` adm-vh-pill--${val}` : ""}`}
              onClick={() => setStatusFilter(val)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Card list ── */}
      <div className="adm-vh-list">
        {filtered.length === 0 ? (
          <div className="adm-card" style={{padding:"32px", textAlign:"center", color:"var(--adm-text-3)"}}>
            Tidak ada data ditemukan.
          </div>
        ) : filtered.map((v, i) => (
          <div key={v.id} className={`adm-vh-item adm-vh-item--${v.result}`}>
            <span className="adm-vh-item-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="adm-vh-item-customer">
              <Avatar name={v.customer} size={36} />
              <div>
                <p className="adm-vh-item-name">{v.customer}</p>
                <p className="adm-vh-item-sub">{v.orderId} · {v.file}</p>
              </div>
            </div>
            <div className="adm-vh-item-date">
              <p className="adm-vh-item-date-val">{v.date.split(" ").slice(0, 3).join(" ")}</p>
              <p className="adm-vh-item-date-time">{v.date.split(" ").slice(3).join(" ")}</p>
            </div>
            <div className={`adm-vh-result-badge adm-vh-result-badge--${v.result}`}>
              {v.result === "valid"
                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Valid</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Invalid</>
              }
            </div>
            <button className="adm-act-btn adm-act-btn--edit" title="Lihat Detail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR NAV CONFIG
   ═══════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  { id: "dashboard",       label: "Dasbor",           icon: <IcGrid />       },
  { id: "orders",          label: "Pesanan",           icon: <IcOrders />     },
  { id: "products",        label: "Produk",            icon: <IcProducts />   },
  { id: "customers",       label: "Pelanggan",         icon: <IcCustomers />  },
  { id: "returns",         label: "Return Paket",      icon: <IcReturn />     },
  { id: "receipt-verify",  label: "Verifikasi Receipt",icon: <IcShield />     },
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
    (ret) => ret.status === "pending" || ret.status === "flagged"
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
      case "receipt-verify":   return <ReceiptVerify />;
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
