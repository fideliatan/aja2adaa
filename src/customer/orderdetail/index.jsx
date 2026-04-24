import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, Package, Truck, PartyPopper, XCircle, Ban, Search, FileText, Heart, ClipboardList, ShoppingBag, CheckCircle, AlertTriangle } from "lucide-react";
import { useOrders } from "../context/OrderContext";
import "./index.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../../data/products.js";
import { useMockData } from "../../context/MockDataContext.jsx";

/* ─── Helper ───────────────────────────────────────────────── */
function fmt(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function compressImage(dataUrl, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith("data:image")) { resolve(dataUrl); return; }
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

/* ─── Click-to-view proof file badge ──────────────────────── */
function OdProofFile({ label, src, caption }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button className="od-proof-file-btn" onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        {label}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/></svg>
      </button>
      {caption && <p className="od-proof-file-caption">{caption}</p>}
      {open && (
        <div className="od-proof-zoom-overlay" onClick={() => setOpen(false)}>
          <img src={src} alt={label} className="od-proof-zoom-img" />
          <button className="od-proof-zoom-close" onClick={() => setOpen(false)}>✕</button>
        </div>
      )}
    </>
  );
}

/* ─── Dummy Order Data ─────────────────────────────────────── */
const ORDER = {
  id: "ORD-017",
  status: "Approved",
  date: "14 April 2025",
  items: [
    { name: "Hyaluronic Acid Serum",   qty: 1, price: 189000 },
    { name: "Ceramide Barrier Cream",  qty: 1, price: 146000 },
  ],
  total: 335000,
  recipient: "Dewi Larasati",
  address: "Jl. Diponegoro No. 7, Medan",
  payment: "BNI Transfer",
};

/* ─── Status Config ────────────────────────────────────────── */
const STATUS_CONFIG = {
  pending:   { label: "Menunggu Konfirmasi", color: "#e09a3a", bg: "rgba(224,154,58,0.12)"  },
  packing:   { label: "Sedang Dikemas",      color: "#4a9fd4", bg: "rgba(74,159,212,0.12)"  },
  shipped:   { label: "Dalam Pengiriman",    color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  delivered: { label: "Terkirim",            color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  rejected:  { label: "Ditolak",             color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  cancelled: { label: "Dibatalkan",          color: "#aaa",    bg: "rgba(170,170,170,0.12)" },
};

const ORDER_STEPS = [
  { key: "pending",   label: "Menunggu",  icon: <Clock size={16} /> },
  { key: "packing",   label: "Dikemas",   icon: <Package size={16} /> },
  { key: "shipped",   label: "Dikirim",   icon: <Truck size={16} /> },
  { key: "delivered", label: "Sampai",    icon: <PartyPopper size={16} /> },
];
const STEP_ORDER = ORDER_STEPS.map(s => s.key);

const isReceiptAvailable = (status) =>
  ["packing", "shipped", "delivered"].includes(status);

/* ─── Download E-Receipt ───────────────────────────────────── */
function buildReceiptHtml(order, logoDataUrl = "") {
  const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const fmtID = (n) => "Rp " + n.toLocaleString("id-ID");
  const logoTag = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="careofyou" class="rc-logo-img" />`
    : `<div class="rc-logo-text">careofyou</div>`;

  const itemRows = order.items
    .map(
      (item) => `
      <div class="rc-item">
        <div class="rc-item-dot"></div>
        <div class="rc-item-left">
          <span class="rc-item-name">${item.name}</span>
          <span class="rc-item-qty">${item.qty} pcs × ${fmtID(item.price)}</span>
        </div>
        <span class="rc-item-total">${fmtID(item.price * item.qty)}</span>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>E-Receipt careofyou — ${order.id}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg, #fdf0ef 0%, #fff5f3 50%, #fdf0ef 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 32px 16px 48px;
    }
    .receipt {
      background: white;
      width: 100%;
      max-width: 480px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 48px rgba(201,114,105,0.2), 0 2px 12px rgba(0,0,0,0.08);
    }
    @media print {
      html, body {
        margin: 0; padding: 0;
        background: white !important;
        display: block;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .receipt {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
        width: 100%;
        page-break-inside: avoid;
      }
    }
    /* ── Header ── */
    .rc-head {
      background: linear-gradient(135deg, #d6867c 0%, #c97269 40%, #b05a52 100%);
      padding: 28px 24px 20px;
      text-align: center;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .rc-head::before {
      content: "";
      position: absolute;
      top: -40px; right: -40px;
      width: 130px; height: 130px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
    }
    .rc-head::after {
      content: "";
      position: absolute;
      bottom: -25px; left: -25px;
      width: 90px; height: 90px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
    }
    .rc-logo-img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
      margin: 0 auto 10px;
      position: relative; z-index: 1;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2), 0 0 0 4px rgba(255,255,255,0.3);
    }
    .rc-logo-text {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-bottom: 6px;
      position: relative; z-index: 1;
    }
    .rc-tagline {
      font-size: 10px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      opacity: 0.85;
      position: relative; z-index: 1;
    }
    .rc-head-id {
      display: inline-block;
      margin-top: 10px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 50px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      position: relative; z-index: 1;
    }
    /* ── Success banner ── */
    .rc-success {
      background: linear-gradient(90deg, #f0fdf4, #ecfdf5);
      border-bottom: 1.5px dashed #86efac;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #15803d;
      font-size: 13.5px;
      font-weight: 700;
    }
    .rc-success-dot {
      width: 24px; height: 24px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white;
      font-size: 13px;
      font-weight: 900;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(34,197,94,0.35);
    }
    /* ── Info grid ── */
    .rc-body { padding: 20px 20px 0; }
    .rc-section-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #c97269;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .rc-section-label::after {
      content: "";
      flex: 1;
      height: 1px;
      background: #f0d5d2;
    }
    .rc-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 18px;
    }
    .rc-info-box {
      background: linear-gradient(135deg, #fffaf9, #fdf5f3);
      border-radius: 10px;
      padding: 11px 13px;
      border: 1.5px solid #f0d5d2;
    }
    .rc-info-box-label { font-size: 10px; color: #b0a8a6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
    .rc-info-box-val   { font-size: 12.5px; font-weight: 800; color: #2d2d2d; line-height: 1.3; }
    /* ── Items ── */
    .rc-items { margin-bottom: 14px; display: flex; flex-direction: column; gap: 7px; }
    .rc-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      background: linear-gradient(135deg, #fffaf9, #fdf5f3);
      border-radius: 10px;
      border: 1.5px solid #f0d5d2;
    }
    .rc-item-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #d6867c, #c97269);
      flex-shrink: 0;
    }
    .rc-item-left { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .rc-item-name  { font-size: 13px; font-weight: 700; color: #2d2d2d; }
    .rc-item-qty   { font-size: 11px; color: #b0a8a6; font-weight: 500; }
    .rc-item-total { font-size: 13.5px; font-weight: 900; color: #c97269; white-space: nowrap; }
    /* ── Summary ── */
    .rc-summary {
      border-top: 1.5px dashed #f0d5d2;
      padding: 12px 0;
      margin: 0 20px;
    }
    .rc-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #7a7a7a;
      margin-bottom: 6px;
    }
    .rc-summary-row:last-child { margin-bottom: 0; }
    /* ── Total ── */
    .rc-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(201,114,105,0.1) 0%, rgba(201,114,105,0.05) 100%);
      border-top: 2px solid #f0d5d2;
      margin-top: 4px;
    }
    .rc-total-label { font-size: 14px; font-weight: 700; color: #2d2d2d; }
    .rc-total-val   { font-size: 24px; font-weight: 900; color: #c97269; letter-spacing: -0.5px; }
    /* ── Barcode ── */
    .rc-barcode-wrap {
      padding: 18px 20px 14px;
      text-align: center;
      border-top: 1px solid #f5eeec;
      background: #fffcfb;
    }
    .rc-barcode {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 1.5px;
      height: 44px;
      margin-bottom: 8px;
    }
    .rc-bar { background: #2d2d2d; border-radius: 1px; }
    .rc-order-ref {
      font-size: 10.5px;
      color: #b0a8a6;
      font-weight: 600;
      letter-spacing: 2px;
      font-variant-numeric: tabular-nums;
    }
    /* ── Footer ── */
    .rc-footer {
      background: linear-gradient(135deg, #fdf0ef, #fff5f3);
      border-top: 1.5px solid #f0d5d2;
      padding: 16px 24px;
      text-align: center;
    }
    .rc-footer-main { font-size: 13.5px; color: #2d2d2d; font-weight: 700; margin-bottom: 4px; }
    .rc-footer-sub  { font-size: 11px; color: #b0a8a6; font-weight: 500; }
    .rc-footer-brand {
      margin-top: 10px;
      font-size: 10px;
      color: #c97269;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="rc-head">
      ${logoTag}
      <div class="rc-tagline">Struk Pembelian Resmi</div>
      <div class="rc-head-id">${order.id}</div>
    </div>

    <!-- Success -->
    <div class="rc-success">
      <div class="rc-success-dot">✓</div>
      Pembayaran Berhasil Dikonfirmasi
    </div>

    <!-- Body -->
    <div class="rc-body">
      <p class="rc-section-label">Info Transaksi</p>
      <div class="rc-info-grid">
        <div class="rc-info-box">
          <div class="rc-info-box-label">No. Pesanan</div>
          <div class="rc-info-box-val">${order.id}</div>
        </div>
        <div class="rc-info-box">
          <div class="rc-info-box-label">Tanggal</div>
          <div class="rc-info-box-val">${order.date}</div>
        </div>
        <div class="rc-info-box">
          <div class="rc-info-box-label">Metode Bayar</div>
          <div class="rc-info-box-val">${order.payment}</div>
        </div>
        <div class="rc-info-box">
          <div class="rc-info-box-label">Penerima</div>
          <div class="rc-info-box-val">${order.recipient}</div>
        </div>
      </div>

      <p class="rc-section-label">Produk Dipesan</p>
      <div class="rc-items">${itemRows}</div>
    </div>

    <!-- Summary -->
    <div class="rc-summary">
      <div class="rc-summary-row"><span>Subtotal</span><span style="font-weight:700;color:#2d2d2d">${fmtID(subtotal)}</span></div>
      <div class="rc-summary-row"><span>Ongkos Kirim</span><span style="color:#22c55e;font-weight:700">Gratis ✓</span></div>
    </div>

    <div class="rc-total-row">
      <span class="rc-total-label">Total Pembayaran</span>
      <span class="rc-total-val">${fmtID(order.total)}</span>
    </div>

    <!-- Barcode -->
    <div class="rc-barcode-wrap">
      <div class="rc-barcode" id="bcBars"></div>
      <div class="rc-order-ref">${order.id.replace(/-/g, "")} 0 1 7 5 8 3</div>
    </div>

    <!-- Footer -->
    <div class="rc-footer">
      <div class="rc-footer-main">Terima kasih sudah belanja di careofyou</div>
      <div class="rc-footer-sub">Simpan struk ini sebagai bukti pembelian resmi kamu</div>
      <div class="rc-footer-brand">careofyou.id</div>
    </div>
  </div>

  <script>
    const wrap = document.getElementById('bcBars');
    const seed = "${order.id}".split('').reduce((h,c)=>((h<<5)-h+c.charCodeAt(0))|0, 0);
    const BARS = 58;
    for (let i = 0; i < BARS; i++) {
      const v = Math.abs(seed ^ (i * 2654435761)) % 100;
      const h = 14 + (v % 30);
      const w = v % 3 === 0 ? 3 : v % 2 === 0 ? 2 : 1;
      const bar = document.createElement('div');
      bar.className = 'rc-bar';
      bar.style.cssText = 'width:' + w + 'px;height:' + h + 'px';
      wrap.appendChild(bar);
    }
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>`;
}

async function handleDownload(order) {
  let logoDataUrl = "";
  try {
    const resp = await fetch("/logo-careofyou.png");
    const blob = await resp.blob();
    logoDataUrl = await new Promise((res) => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(blob);
    });
  } catch (_) {}
  const html = buildReceiptHtml(order, logoDataUrl);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

/* ─── SVG Icons ────────────────────────────────────────────── */
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const PDFIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const BackIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ── Fake barcode SVG (deterministic) ── */
function Barcode({ value, width = 200, height = 44 }) {
  const BARS = 64;
  const seed = value.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const bars = Array.from({ length: BARS }, (_, i) => {
    const v = Math.abs(seed ^ (i * 2654435761)) % 100;
    return { h: 14 + (v % 30), w: v % 3 === 0 ? 3 : v % 2 === 0 ? 2 : 1 };
  });
  const totalW = bars.reduce((s, b) => s + b.w + 1, 0);
  const scale = width / totalW;

  let x = 0;
  const rects = bars.map((b, i) => {
    const el = (
      <rect
        key={i}
        x={x * scale}
        y={height - b.h}
        width={Math.max(1, b.w * scale - 0.5)}
        height={b.h}
        fill="#2d2d2d"
        rx="0.5"
      />
    );
    x += b.w + 1;
    return el;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {rects}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function OrderDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getOrder, cancelOrder, addReturn, returns } = useOrders();
  const { session } = useMockData();
  const { cart, cartOpen, setCartOpen, updateQty, removeItem, cartTotal } = useCart();
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason]   = useState("");
  const [cancelCustom, setCancelCustom]   = useState("");
  const [timeLeft, setTimeLeft]           = useState(null);

  // Return popup state
  const [returnStep, setReturnStep]           = useState(0); // 0=closed, 1=select items, 2=upload receipt+reason, 3=upload photo, 4=submitted
  const [returnQtys, setReturnQtys]           = useState({});
  const [returnReceiptFile, setReturnReceiptFile] = useState(null);
  const [returnReceiptB64, setReturnReceiptB64]   = useState(null);
  const [returnReason, setReturnReason]           = useState("");
  const [returnCustomReason, setReturnCustomReason] = useState("");
  const [returnPhotoFile, setReturnPhotoFile]     = useState(null);
  const [returnPhotoB64, setReturnPhotoB64]       = useState(null);
  const receiptInputRef = useState(() => ({ current: null }))[0];
  const photoInputRef   = useState(() => ({ current: null }))[0];

  const orderId = location.state?.orderId ?? ORDER.id;
  const liveOrder = getOrder(orderId) ?? ORDER;

  // Real-time cancel countdown
  useEffect(() => {
    if (!liveOrder.cancelDeadlineTs) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((liveOrder.cancelDeadlineTs - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [liveOrder.cancelDeadlineTs]);

  const fmtCountdown = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${sec}d`;
    return `${sec}d`;
  };

  const canCancel = liveOrder.status === "pending" &&
    liveOrder.cancelDeadlineTs && liveOrder.cancelDeadlineTs > Date.now();

  const status       = STATUS_CONFIG[liveOrder.status] ?? STATUS_CONFIG.pending;
  const subtotal     = liveOrder.subtotal ?? liveOrder.items?.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
  const receiptReady = isReceiptAvailable(liveOrder.status);

  const handleCancel = () => {
    const reason = cancelReason === "Lainnya" ? cancelCustom.trim() : cancelReason;
    cancelOrder(liveOrder.id, reason);
    setCancelConfirm(false);
    setCancelReason("");
    setCancelCustom("");
  };

  const openReturnPopup = () => {
    const initQtys = {};
    (liveOrder.items ?? []).forEach(item => { initQtys[item.name] = item.qty; });
    setReturnQtys(initQtys);
    setReturnReceiptFile(null); setReturnReceiptB64(null);
    setReturnReason(""); setReturnCustomReason("");
    setReturnPhotoFile(null); setReturnPhotoB64(null);
    setReturnStep(1);
  };

  const handleReturnReceiptFile = (file) => {
    if (!file) return;
    setReturnReceiptFile(file);
    setReturnReceiptB64(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = await compressImage(e.target.result);
      setReturnReceiptB64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleReturnPhotoFile = (file) => {
    if (!file) return;
    setReturnPhotoFile(file);
    setReturnPhotoB64(null);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = await compressImage(e.target.result);
      setReturnPhotoB64(result);
    };
    reader.readAsDataURL(file);
  };

  const submitReturn = () => {
    const selectedItems = (liveOrder.items ?? [])
      .filter(item => (returnQtys[item.name] ?? 0) > 0)
      .map(item => ({ ...item, qty: returnQtys[item.name] }));

    const ret = {
      id: `RET-${Date.now().toString().slice(-6)}`,
      orderId: liveOrder.id,
      customerId: liveOrder.customerId ?? session?.userId ?? null,
      customer: liveOrder.recipient ?? liveOrder.customer ?? "Customer",
      email: liveOrder.email ?? session?.email ?? "",
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      reason: returnReason === "Lainnya" ? returnCustomReason : returnReason,
      status: "pending",
      monitoringFlag: null,
      products: selectedItems,
      conditionNote: returnReason === "Lainnya" ? returnCustomReason : returnReason,
      photos: returnPhotoB64 ? [returnPhotoB64] : [],
      receiptB64: returnReceiptB64,
      productPhotoB64: returnPhotoB64,
      qrCode: "—", scannedQr: "—", qrStatus: null,
      total: selectedItems.reduce((s, i) => s + i.price * i.qty, 0),
      sessionSnapshot: {
        userId: liveOrder.customerId ?? session?.userId ?? null,
        loginAt: session?.loginAt ?? null,
        deviceStatus: session?.deviceStatus ?? liveOrder.sessionSnapshot?.deviceStatus ?? "trusted",
        deviceInfo: session?.deviceInfo ?? liveOrder.sessionSnapshot?.deviceInfo ?? {},
      },
    };
    addReturn(ret);
    setReturnStep(4);
  };

  return (
    <div className="od-root">
      <Navbar
        activePage=""
        allProducts={PRODUCTS}
        onHomeClick={() => navigate("/")}
        onProductsClick={() => navigate("/products")}
      />

      <main className="od-main">

        {/* ── Back button ── */}
        <button className="od-back-btn" onClick={() => navigate("/myprofile", { state: { tab: "orderstatus" } })}>
          <BackIcon /> Kembali ke Status Orderan
        </button>

        {/* ── Page header ── */}
        <div className="od-header">
          <div className="od-header-left">
            <h1 className="od-title">Detail Pesanan</h1>
            <p className="od-order-id">#{liveOrder.id}</p>
          </div>
          <span
            className="od-status-badge"
            style={{ color: status.color, background: status.bg }}
          >
            <CheckIcon /> {status.label}
          </span>
        </div>

        {/* ── REJECTED state ── */}
        {liveOrder.status === "rejected" && (
          <div className="od-rejected-banner">
            <div className="od-rejected-icon"><XCircle size={32} /></div>
            <div>
              <p className="od-rejected-title">Pesanan Ditolak</p>
              <p className="od-rejected-reason">
                {liveOrder.rejectionReason ?? "Pembayaran tidak dapat dikonfirmasi."}
              </p>
            </div>
          </div>
        )}

        {/* ── CANCELLED state ── */}
        {liveOrder.status === "cancelled" && (
          <div className="od-cancelled-banner">
            <div className="od-cancelled-icon"><Ban size={32} /></div>
            <div>
              <p className="od-cancelled-title">Pesanan Dibatalkan</p>
              <p className="od-cancelled-reason">Pesanan ini telah dibatalkan.</p>
            </div>
          </div>
        )}

        {/* ── Status Timeline (only for active orders) ── */}
        {!["rejected","cancelled"].includes(liveOrder.status) && (
          <div className="od-card od-timeline-card">
            <h2 className="od-card-title" style={{ marginBottom: 16 }}>Status Pesanan</h2>
            <div className="od-steps">
              {ORDER_STEPS.map((step, i) => {
                const currentIdx = STEP_ORDER.indexOf(liveOrder.status);
                const stepIdx    = STEP_ORDER.indexOf(step.key);
                const isDone     = stepIdx < currentIdx;
                const isActive   = stepIdx === currentIdx;
                const dotClass   = isDone ? "od-step-dot--done" : isActive ? "od-step-dot--active" : "od-step-dot--pending";
                const lblClass   = isDone ? "od-step-label--done" : isActive ? "od-step-label--active" : "od-step-label--pending";
                const lineClass  = i < ORDER_STEPS.length - 1
                  ? stepIdx < currentIdx ? "od-step-line--done"
                    : stepIdx === currentIdx ? "od-step-line--active"
                    : "od-step-line--pending"
                  : null;
                return (
                  <React.Fragment key={step.key}>
                    <div className="od-step">
                      <div className={`od-step-dot ${dotClass}`}>{step.icon}</div>
                      <span className={`od-step-label ${lblClass}`}>{step.label}</span>
                    </div>
                    {i < ORDER_STEPS.length - 1 && (
                      <div className={`od-step-line ${lineClass}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <div className="od-grid">

          {/* ══ LEFT COLUMN ══ */}
          <div className="od-col-main">

            {/* Produk card */}
            <div className="od-card">
              <h2 className="od-card-title">Produk yang Dipesan</h2>
              <div className="od-items">
                {(liveOrder.items ?? []).map((item, i) => (
                  <div key={i} className="od-item">
                    <div className="od-item-img">
                      {item.image
                        ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                        : <span>{item.name?.[0] ?? "?"}</span>
                      }
                    </div>
                    <div className="od-item-info">
                      <p className="od-item-name">{item.name}</p>
                      <p className="od-item-qty">Qty: {item.qty}</p>
                    </div>
                    <div className="od-item-right">
                      <p className="od-item-unit">{fmt(item.price)} / pcs</p>
                      <p className="od-item-subtotal">{fmt(item.price * item.qty)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ringkasan pembayaran */}
            <div className="od-card">
              <h2 className="od-card-title">Ringkasan Pembayaran</h2>
              <div className="od-summary">
                <div className="od-summary-row">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="od-summary-row">
                  <span>Ongkos Kirim</span>
                  <span>{liveOrder.deliveryFee ? fmt(liveOrder.deliveryFee) : <span className="od-free-ship">Gratis</span>}</span>
                </div>
                <div className="od-summary-divider" />
                <div className="od-summary-row od-summary-total">
                  <span>Total</span>
                  <span>{fmt(liveOrder.total ?? subtotal)}</span>
                </div>
                <div className="od-summary-row od-summary-payment-method">
                  <span>Metode Pembayaran</span>
                  <span>{liveOrder.payment}</span>
                </div>
              </div>
            </div>

            {/* ── Cancel button (only while pending + within window) ── */}
            {canCancel && (
              <div className="od-cancel-card">
                <div className="od-cancel-info">
                  <span className="od-cancel-info-icon"><Clock size={16} /></span>
                  <div>
                    <p className="od-cancel-info-title">Bisa Dibatalkan</p>
                    <p className="od-cancel-info-sub">
                      Sisa waktu: <strong>{timeLeft != null ? fmtCountdown(timeLeft) : "—"}</strong>
                    </p>
                  </div>
                </div>
                <button className="od-cancel-btn" onClick={() => setCancelConfirm(true)}>
                  Batalkan Pesanan
                </button>
              </div>
            )}

          </div>

          {/* ══ RIGHT COLUMN ══ */}
          <div className="od-col-side">

            {/* Info pengiriman */}
            <div className="od-card">
              <h2 className="od-card-title">Informasi Pengiriman</h2>
              <div className="od-shipping">
                {[
                  ["Penerima",      liveOrder.recipient ?? "—"],
                  ["Alamat",        liveOrder.address   ?? "—"],
                  ["Tanggal Pesan", liveOrder.date      ?? "—"],
                ].map(([label, val]) => (
                  <div key={label} className="od-shipping-row">
                    <span className="od-shipping-label">{label}</span>
                    <span className="od-shipping-val">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tracking card (shipped) ── */}
            {liveOrder.status === "shipped" && liveOrder.trackingNumber && (
              <div className="od-card od-tracking-card">
                <div className="od-tracking-header">
                  <span className="od-tracking-icon"><Truck size={20} /></span>
                  <div>
                    <h2 className="od-card-title" style={{ marginBottom: 2 }}>Nomor Resi</h2>
                    <p className="od-receipt-avail">Pesanan sedang dalam pengiriman</p>
                  </div>
                </div>
                <div className="od-tracking-info">
                  <p className="od-tracking-courier">{liveOrder.courier}</p>
                  <p className="od-tracking-number">{liveOrder.trackingNumber}</p>
                </div>
              </div>
            )}

            {/* ── Pending / waiting card ── */}
            {liveOrder.status === "pending" && (
              <div className="od-card od-waiting-card">
                <div className="od-waiting-icon"><Clock size={32} /></div>
                <p className="od-waiting-title">Menunggu Konfirmasi Admin</p>
                <p className="od-waiting-sub">
                  Bukti pembayaran kamu sedang diperiksa. Estimasi konfirmasi 1×24 jam.
                </p>
              </div>
            )}

            {/* ── E-Receipt section ── */}
            {receiptReady && (
              <div className="od-card od-receipt-card">
                <div className="od-receipt-header">
                  <div className="od-receipt-icon-wrap">
                    <PDFIcon />
                  </div>
                  <div>
                    <h2 className="od-card-title" style={{ marginBottom: 2 }}>E-Receipt</h2>
                    <p className="od-receipt-avail">Tersedia untuk pesanan ini</p>
                  </div>
                </div>

                <p className="od-receipt-desc">
                  Struk pembelian resmi pesananmu sudah siap. Simpan sebagai bukti transaksi.
                </p>

                <div className="od-receipt-actions">
                  <button className="od-btn-download" onClick={() => handleDownload(liveOrder)}>
                    <DownloadIcon />
                    Download Struk
                  </button>
                  <button className="od-btn-preview" onClick={() => setPreviewOpen(true)}>
                    <EyeIcon />
                    Preview
                  </button>
                </div>
              </div>
            )}

            {/* ── Delivery proof card (delivered) ── */}
            {liveOrder.status === "delivered" && (
              <div className="od-card od-delivery-proof-card">
                <div className="od-receipt-header">
                  <div className="od-receipt-icon-wrap" style={{ background: "rgba(34,197,94,0.1)" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div>
                    <h2 className="od-card-title" style={{ marginBottom: 2 }}>Paket Diterima</h2>
                    <p className="od-receipt-avail">Pesanan sudah sampai ke tujuan</p>
                  </div>
                </div>
                {liveOrder.deliveryProof && liveOrder.deliveryProof.startsWith("data:") ? (
                  <OdProofFile
                    label="bukti-pengiriman.jpg"
                    src={liveOrder.deliveryProof}
                    caption="Foto bukti pengiriman dari kurir"
                  />
                ) : (
                  <p className="od-delivery-proof-note">Kurir telah mengkonfirmasi pengiriman paket.</p>
                )}
                <button className="od-return-btn" onClick={openReturnPopup}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  Ajukan Return / Pengembalian
                </button>
              </div>
            )}

            {/* ── Rejection detail card ── */}
            {liveOrder.status === "rejected" && (
              <div className="od-card od-rejection-card">
                <div className="od-rejection-header">
                  <span className="od-rejection-icon"><XCircle size={22} /></span>
                  <div>
                    <h2 className="od-card-title" style={{ marginBottom: 2 }}>Alasan Penolakan</h2>
                    <p className="od-receipt-avail">Pesanan tidak dapat diproses</p>
                  </div>
                </div>
                <p className="od-rejection-reason">
                  {liveOrder.rejectionReason ?? "Pembayaran tidak dapat dikonfirmasi oleh admin."}
                </p>
                <p className="od-rejection-note">
                  Silakan hubungi kami melalui WhatsApp jika ada pertanyaan.
                </p>
              </div>
            )}

            {/* ── Return status card (if customer submitted a return) ── */}
            {(() => {
              const myReturn = (returns ?? []).find(r => r.orderId === liveOrder.id);
              if (!myReturn) return null;
              const RETURN_STATUS = {
                pending:    { label: "Menunggu Persetujuan Admin", color: "#e09a3a", bg: "rgba(224,154,58,0.1)",  icon: <Clock size={20} /> },
                flagged:    { label: "Sedang Ditinjau",            color: "#f97316", bg: "rgba(249,115,22,0.1)",  icon: <Search size={20} /> },
                processing: { label: "Return Sedang Diproses",     color: "#4a9fd4", bg: "rgba(74,159,212,0.1)",  icon: <Package size={20} /> },
                completed:  { label: "Return Selesai",             color: "#22c55e", bg: "rgba(34,197,94,0.1)",   icon: <CheckCircle size={20} /> },
                rejected:   { label: "Return Ditolak",             color: "#ef4444", bg: "rgba(239,68,68,0.1)",   icon: <XCircle size={20} /> },
              };
              const rs = RETURN_STATUS[myReturn.status] ?? { label: myReturn.status, color: "#aaa", bg: "rgba(170,170,170,0.1)", icon: <ClipboardList size={20} /> };
              return (
                <div className="od-card od-return-status-card" style={{ borderLeft: `3px solid ${rs.color}` }}>
                  <div className="od-return-status-header">
                    <span style={{ fontSize: 22 }}>{rs.icon}</span>
                    <div>
                      <h2 className="od-card-title" style={{ marginBottom: 2 }}>Status Return</h2>
                      <span className="od-return-status-pill" style={{ color: rs.color, background: rs.bg }}>{rs.label}</span>
                    </div>
                  </div>
                  <div className="od-return-status-body">
                    <div className="od-return-status-row">
                      <span>ID Return</span>
                      <strong>{myReturn.id}</strong>
                    </div>
                    <div className="od-return-status-row">
                      <span>Tanggal Pengajuan</span>
                      <strong>{myReturn.date}</strong>
                    </div>
                    <div className="od-return-status-row">
                      <span>Alasan</span>
                      <strong style={{ maxWidth: 200, textAlign: "right" }}>{myReturn.reason}</strong>
                    </div>
                    <div className="od-return-status-row">
                      <span>Total Refund</span>
                      <strong>{fmt(myReturn.total)}</strong>
                    </div>
                  </div>
                  {myReturn.status === "pending" && (
                    <p className="od-return-status-note">Tim kami sedang meninjau pengajuan returnmu. Proses biasanya 1–3 hari kerja.</p>
                  )}
                  {myReturn.status === "processing" && (
                    <p className="od-return-status-note" style={{ color: "#4a9fd4" }}>Return kamu sudah disetujui dan sedang diproses. Refund akan masuk dalam 3–5 hari kerja.</p>
                  )}
                  {myReturn.status === "completed" && (
                    <p className="od-return-status-note" style={{ color: "#22c55e" }}>Return selesai diproses. Refund sudah dikirimkan. Terima kasih!</p>
                  )}
                  {myReturn.status === "rejected" && (
                    <p className="od-return-status-note" style={{ color: "#ef4444" }}>Pengajuan return ditolak. Hubungi CS kami untuk informasi lebih lanjut.</p>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      </main>

      {/* ── Cancel modal — multi-step with reasons ── */}
      {cancelConfirm && (
        <div className="od-modal-overlay" onClick={() => setCancelConfirm(false)}>
          <div className="od-modal od-cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="od-modal-header">
              <div>
                <h3>Batalkan Pesanan</h3>
                <p className="od-modal-sub">#{liveOrder.id}</p>
              </div>
              <button className="od-modal-close" onClick={() => setCancelConfirm(false)}>✕</button>
            </div>
            <div className="od-modal-body">
              <p className="od-cancel-reason-title">Pilih alasan pembatalan:</p>
              <div className="od-cancel-reasons">
                {[
                  "Tidak jadi beli",
                  "Ingin ganti produk lain",
                  "Harga terlalu mahal",
                  "Alamat pengiriman salah",
                  "Proses pembayaran bermasalah",
                  "Lainnya",
                ].map(reason => (
                  <label key={reason} className={`od-cancel-reason-option${cancelReason === reason ? " od-cancel-reason-option--active" : ""}`}>
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      style={{ display: "none" }}
                    />
                    <span className="od-cancel-reason-radio" />
                    {reason}
                  </label>
                ))}
              </div>
              {cancelReason === "Lainnya" && (
                <textarea
                  className="od-cancel-custom-input"
                  rows={3}
                  placeholder="Ceritakan alasanmu di sini…"
                  value={cancelCustom}
                  onChange={e => setCancelCustom(e.target.value)}
                />
              )}
              <div className="od-cancel-modal-warning">
                <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Tindakan ini tidak dapat dibatalkan setelah dikonfirmasi.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button
                  className="od-cancel-confirm-btn"
                  disabled={!cancelReason || (cancelReason === "Lainnya" && !cancelCustom.trim())}
                  onClick={handleCancel}
                >
                  Konfirmasi Batalkan
                </button>
                <button className="od-cancel-back-btn" onClick={() => setCancelConfirm(false)}>
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          RETURN POPUP — multi-step
          ════════════════════════════════════════════════════ */}
      {returnStep > 0 && (
        <div className="od-modal-overlay" onClick={() => returnStep !== 4 && setReturnStep(0)}>
          <div className={`od-modal od-return-modal${returnStep === 2 && returnReceiptB64 ? " od-return-modal--extended" : ""}`} onClick={e => e.stopPropagation()}>

            {/* Step indicator */}
            {returnStep < 4 && (
              <div className="od-return-steps-bar">
                {["Pilih Produk", "Bukti & Alasan", "Foto Produk"].map((label, i) => (
                  <div key={i} className={`od-return-step-item${returnStep === i + 1 ? " od-return-step-item--active" : returnStep > i + 1 ? " od-return-step-item--done" : ""}`}>
                    <div className="od-return-step-num">{returnStep > i + 1 ? "✓" : i + 1}</div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 1: Select products */}
            {returnStep === 1 && (
              <>
                <div className="od-modal-header">
                  <div>
                    <h3>Ajukan Return</h3>
                    <p className="od-modal-sub">Pilih produk yang ingin dikembalikan</p>
                  </div>
                  <button className="od-modal-close" onClick={() => setReturnStep(0)}>✕</button>
                </div>
                <div className="od-modal-body">
                  <div className="od-return-product-list">
                    {(liveOrder.items ?? []).map((item, i) => (
                      <div key={i} className="od-return-product-row">
                        <div className="od-return-product-img">
                          {item.image
                            ? <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                            : <span>{item.name?.[0]}</span>
                          }
                        </div>
                        <div className="od-return-product-info">
                          <p className="od-return-product-name">{item.name}</p>
                          <p className="od-return-product-price">{fmt(item.price)}</p>
                        </div>
                        <div className="od-return-qty-ctrl">
                          {item.qty > 1 ? (
                            <>
                              <button className="od-rqty-btn" onClick={() => setReturnQtys(p => ({ ...p, [item.name]: Math.max(0, (p[item.name] ?? item.qty) - 1) }))}>−</button>
                              <span className="od-rqty-val">{returnQtys[item.name] ?? item.qty}</span>
                              <button className="od-rqty-btn" onClick={() => setReturnQtys(p => ({ ...p, [item.name]: Math.min(item.qty, (p[item.name] ?? item.qty) + 1) }))}>+</button>
                            </>
                          ) : (
                            <label className="od-return-check-label">
                              <input
                                type="checkbox"
                                checked={(returnQtys[item.name] ?? 1) > 0}
                                onChange={e => setReturnQtys(p => ({ ...p, [item.name]: e.target.checked ? 1 : 0 }))}
                                style={{ display: "none" }}
                              />
                              <span className={`od-return-checkbox${(returnQtys[item.name] ?? 1) > 0 ? " od-return-checkbox--checked" : ""}`}>
                                {(returnQtys[item.name] ?? 1) > 0 ? "✓" : ""}
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="od-modal-footer">
                  <button
                    className="od-return-next-btn"
                    disabled={(liveOrder.items ?? []).every(item => (returnQtys[item.name] ?? 0) === 0)}
                    onClick={() => setReturnStep(2)}
                  >
                    Lanjut →
                  </button>
                  <button className="od-cancel-back-btn" onClick={() => setReturnStep(0)}>Batal</button>
                </div>
              </>
            )}

            {/* STEP 2: Upload receipt + reason */}
            {returnStep === 2 && (
              <>
                <div className="od-modal-header">
                  <div>
                    <h3>Bukti Pembelian & Alasan</h3>
                    <p className="od-modal-sub">Upload e-receipt dan pilih alasan return</p>
                  </div>
                  <button className="od-modal-close" onClick={() => setReturnStep(0)}>✕</button>
                </div>
                <div className="od-modal-body">
                  {/* Receipt upload */}
                  <p className="od-return-section-label">Upload E-Receipt / Bukti Pembelian</p>
                  <input ref={r => receiptInputRef.current = r} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                    onChange={e => handleReturnReceiptFile(e.target.files?.[0])} />
                  <div
                    className={`od-return-dropzone${returnReceiptB64 ? " od-return-dropzone--filled" : ""}`}
                    onClick={() => receiptInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleReturnReceiptFile(e.dataTransfer.files?.[0]); }}
                  >
                    {returnReceiptB64 ? (
                      <div className="od-return-file-preview">
                        {returnReceiptB64.startsWith("data:image") ? (
                          <img src={returnReceiptB64} alt="receipt" style={{ maxHeight: 120, borderRadius: 8, objectFit: "contain" }} />
                        ) : (
                          <div className="od-return-pdf-chip"><FileText size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {returnReceiptFile?.name}</div>
                        )}
                        <p className="od-return-file-ok">✓ File berhasil diupload</p>
                        <p style={{ fontSize: 11, color: "#aaa" }}>Klik untuk ganti file</p>
                      </div>
                    ) : (
                      <div className="od-return-dropzone-empty">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c97269" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <p>Drag & drop atau <span style={{ color: "#c97269", fontWeight: 700 }}>pilih file</span></p>
                        <p style={{ fontSize: 11, color: "#bbb" }}>JPG, PNG, PDF — maks 5 MB</p>
                      </div>
                    )}
                  </div>

                  {/* Reason section — only shown after receipt uploaded */}
                  {returnReceiptB64 && (
                    <div className="od-return-reason-section">
                      <p className="od-return-section-label">Alasan Return</p>
                      <div className="od-cancel-reasons">
                        {[
                          "Produk rusak / cacat",
                          "Produk tidak sesuai deskripsi",
                          "Barang salah dikirim",
                          "Reaksi alergi terhadap produk",
                          "Produk kedaluwarsa",
                          "Lainnya",
                        ].map(r => (
                          <label key={r} className={`od-cancel-reason-option${returnReason === r ? " od-cancel-reason-option--active" : ""}`}>
                            <input type="radio" name="return-reason" value={r} checked={returnReason === r}
                              onChange={() => setReturnReason(r)} style={{ display: "none" }} />
                            <span className="od-cancel-reason-radio" />
                            {r}
                          </label>
                        ))}
                      </div>
                      {returnReason === "Lainnya" && (
                        <textarea
                          className="od-cancel-custom-input"
                          rows={2}
                          placeholder="Jelaskan alasan return kamu…"
                          value={returnCustomReason}
                          onChange={e => setReturnCustomReason(e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="od-modal-footer">
                  <button className="od-return-next-btn"
                    disabled={!returnReceiptB64 || !returnReason || (returnReason === "Lainnya" && !returnCustomReason.trim())}
                    onClick={() => setReturnStep(3)}>
                    Lanjut →
                  </button>
                  <button className="od-cancel-back-btn" onClick={() => setReturnStep(1)}>← Kembali</button>
                </div>
              </>
            )}

            {/* STEP 3: Upload product photo */}
            {returnStep === 3 && (
              <>
                <div className="od-modal-header">
                  <div>
                    <h3>Foto Kondisi Produk</h3>
                    <p className="od-modal-sub">Upload foto produk yang ingin dikembalikan</p>
                  </div>
                  <button className="od-modal-close" onClick={() => setReturnStep(0)}>✕</button>
                </div>
                <div className="od-modal-body">
                  {/* WARNING banner */}
                  <div className="od-return-photo-warning">
                    <div className="od-return-warning-icon"><AlertTriangle size={22} /></div>
                    <div>
                      <p className="od-return-warning-title">PERHATIAN — FOTO HARUS JELAS!</p>
                      <p className="od-return-warning-desc">
                        Pastikan foto menunjukkan kondisi produk secara lengkap dan jelas. Foto buram, terlalu gelap, atau tidak menampilkan produk secara keseluruhan dapat menyebabkan pengajuan return ditolak.
                      </p>
                    </div>
                  </div>

                  <p className="od-return-section-label" style={{ marginTop: 16 }}>Upload Foto Produk</p>
                  <input ref={r => photoInputRef.current = r} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => handleReturnPhotoFile(e.target.files?.[0])} />
                  <div
                    className={`od-return-dropzone od-return-dropzone--photo${returnPhotoB64 ? " od-return-dropzone--filled" : ""}`}
                    onClick={() => photoInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleReturnPhotoFile(e.dataTransfer.files?.[0]); }}
                  >
                    {returnPhotoB64 ? (
                      <div className="od-return-file-preview">
                        <img src={returnPhotoB64} alt="product" style={{ maxHeight: 160, borderRadius: 10, objectFit: "contain" }} />
                        <p className="od-return-file-ok">✓ {returnPhotoFile?.name}</p>
                        <p style={{ fontSize: 11, color: "#aaa" }}>Klik untuk ganti foto</p>
                      </div>
                    ) : (
                      <div className="od-return-dropzone-empty">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c97269" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <p style={{ fontWeight: 600 }}>Upload foto produk yang akan dikembalikan</p>
                        <p style={{ fontSize: 11, color: "#bbb" }}>JPG, PNG — pastikan foto jelas dan terang</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="od-modal-footer">
                  <button
                    className="od-return-next-btn od-return-submit-btn"
                    disabled={!returnPhotoB64}
                    onClick={submitReturn}
                  >
                    Submit Pengajuan Return
                  </button>
                  <button className="od-cancel-back-btn" onClick={() => setReturnStep(2)}>← Kembali</button>
                </div>
              </>
            )}

            {/* STEP 4: Success / waiting state */}
            {returnStep === 4 && (
              <>
                <div className="od-modal-header" style={{ border: "none" }}>
                  <div />
                  <button className="od-modal-close" onClick={() => setReturnStep(0)}>✕</button>
                </div>
                <div className="od-return-success-body">
                  <div className="od-return-success-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h3 className="od-return-success-title">Pengajuan Return Terkirim!</h3>
                  <p className="od-return-success-desc">
                    Pengajuan return kamu untuk pesanan <strong>{liveOrder.id}</strong> sedang dalam proses review oleh tim kami.
                  </p>
                  <div className="od-return-waiting-card">
                    <div className="od-return-waiting-row">
                      <span><Clock size={16} /></span>
                      <div>
                        <p className="od-return-waiting-title">Menunggu Persetujuan Admin</p>
                        <p className="od-return-waiting-sub">Estimasi review 1–3 hari kerja. Kamu akan dihubungi via email atau WhatsApp.</p>
                      </div>
                    </div>
                  </div>
                  <div className="od-return-success-tips">
                    <p className="od-return-tips-title">Yang perlu kamu lakukan:</p>
                    <ul className="od-return-tips-list">
                      <li>Simpan produk yang akan dikembalikan dengan aman</li>
                      <li>Jangan buang kemasan asli produk</li>
                      <li>Tunggu konfirmasi dari tim careofyou</li>
                    </ul>
                  </div>
                  <button className="od-return-next-btn" style={{ marginTop: 20, width: "100%" }} onClick={() => setReturnStep(0)}>
                    Tutup
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          PREVIEW MODAL
          ════════════════════════════════════════════════════ */}
      {previewOpen && (
        <div className="od-modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="od-modal" onClick={e => e.stopPropagation()}>
            <div className="od-modal-header">
              <h3>Preview Struk Belanja</h3>
              <button className="od-modal-close" onClick={() => setPreviewOpen(false)}>✕</button>
            </div>
            <div className="od-modal-body">
              <div className="od-receipt-preview">

                {/* Header */}
                <div className="od-rp-head">
                  <img src="/logo-careofyou.png" alt="careofyou" className="od-rp-logo-img" />
                  <p className="od-rp-tagline">Struk Pembelian Resmi</p>
                  <div className="od-rp-head-id">{liveOrder.id}</div>
                </div>

                {/* Success badge */}
                <div className="od-rp-success">
                  <span className="od-rp-success-dot">✓</span>
                  Pembayaran Berhasil Dikonfirmasi
                </div>

                {/* Info grid */}
                <div className="od-rp-info-grid">
                  {[
                    ["No. Pesanan", `#${liveOrder.id}`],
                    ["Tanggal",     liveOrder.date],
                    ["Metode",      liveOrder.payment],
                    ["Penerima",    liveOrder.recipient],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="od-rp-info-box">
                      <p className="od-rp-info-label">{lbl}</p>
                      <p className="od-rp-info-val">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="od-rp-divider" />

                {/* Items */}
                <p className="od-rp-items-label">Produk</p>
                {(liveOrder.items ?? []).map((item, i) => (
                  <div key={i} className="od-rp-item">
                    <div className="od-rp-item-dot" />
                    <div className="od-rp-item-left">
                      <p className="od-rp-item-name">{item.name}</p>
                      <p className="od-rp-item-qty">{item.qty} pcs × {fmt(item.price)}</p>
                    </div>
                    <span className="od-rp-item-total">{fmt(item.price * item.qty)}</span>
                  </div>
                ))}

                <div className="od-rp-divider" />

                {/* Summary */}
                <div className="od-rp-row">
                  <span>Subtotal</span><span>{fmt(subtotal)}</span>
                </div>
                <div className="od-rp-row">
                  <span>Ongkos Kirim</span>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>Gratis</span>
                </div>

                {/* Total */}
                <div className="od-rp-total-row">
                  <span>Total Pembayaran</span>
                  <span className="od-rp-total-val">{fmt(liveOrder.total ?? subtotal)}</span>
                </div>

                {/* Barcode */}
                <div className="od-rp-barcode-wrap">
                  <Barcode value={liveOrder.id} width={200} height={40} />
                  <p className="od-rp-barcode-num">{liveOrder.id.replace(/-/g, "")} 0 1 7 5</p>
                </div>

                {/* Footer */}
                <div className="od-rp-footer">
                  <p className="od-rp-footer-text">Terima kasih sudah belanja di careofyou <Heart size={14} style={{ display: "inline", verticalAlign: "middle" }} /></p>
                  <p className="od-rp-footer-sub">Simpan struk ini sebagai bukti pembelian resmi</p>
                  <p className="od-rp-footer-brand">careofyou.id</p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart sidebar */}
      {cartOpen && <div className="cart-overlay" onClick={() => setCartOpen(false)} />}
      <div className={`cart-sidebar ${cartOpen ? "cart-sidebar-open" : ""}`}>
        <div className="cart-header">
          <h2 className="cart-title">Shopping Cart</h2>
          <button className="cart-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>
        {cart.length === 0 ? (
          <div className="cart-empty">
            <span className="cart-empty-icon"><ShoppingBag size={40} /></span>
            <p>Keranjangmu kosong</p>
            <button className="cart-shop-btn" onClick={() => { setCartOpen(false); navigate("/"); }}>
              Mulai Belanja
            </button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="cart-item-price">{fmt(item.price)}</p>
                    <div className="qty-control">
                      <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                      <span className="qty-val">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                  <button className="item-remove" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Total</span>
                <span className="cart-total-val">{fmt(cartTotal)}</span>
              </div>
              <button
                className="checkout-btn"
                onClick={() => { setCartOpen(false); navigate("/checkout", { state: { cartItems: cart } }); }}
              >
                Checkout
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
