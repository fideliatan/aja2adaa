import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, PackagePlus } from "lucide-react";

export const fmt = (n) => "Rp " + n.toLocaleString("id-ID");
export const SECURITY_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatSecurityTimestamp(date = new Date()) {
  return SECURITY_TIME_FORMATTER.format(date);
}

export function createSecurityTimelineEvent(prefix, type, label, status = "success") {
  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    timestamp: formatSecurityTimestamp(),
    status,
  };
}

export function compressImage(dataUrl, maxDim = 1200, quality = 0.75) {
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

export const STATUS_META = {
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
export const IcGrid       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
export const IcOrders     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>;
export const IcProducts   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
export const IcCustomers  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
export const IcSettings   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
export const IcLogOut     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
export const IcSearch     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
export const IcBell       = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
export const IcArrowUp    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
export const IcEdit       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
export const IcTrash      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
export const IcCheck      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
export const IcTruck      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
export const IcRevenue    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
export const IcPlus       = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
export const IcMail       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
export const IcStore      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
export const IcStar       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
export const IcPackage    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
export const IcNotif      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
export const IcReturn     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
export const IcReceipt    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
export const IcShield     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
export const IcHistory    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/><polyline points="12 7 12 12 15 14"/></svg>;
export const IcCreditCard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
export const IcQr         = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none"/><rect x="16" y="16" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none"/></svg>;
export const IcDownload   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

/* ═══════════════════════════════════════════════════════════
   HELPER: Avatar initials
   ═══════════════════════════════════════════════════════════ */
export function Avatar({ name, size = 32, src = null }) {
  const parts = (name || "?").trim().split(" ");
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  const colors = ["#e07a73","#8b5cf6","#4a9fd4","#22c55e","#f59e0b","#ec4899"];
  const idx = (name || "?").charCodeAt(0) % colors.length;
  if (src) {
    return (
      <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div className="adm-avatar" style={{ width: size, height: size, background: colors[idx], fontSize: size * 0.36 }}>
      {initials.toUpperCase()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPER: Mock QR visual (deterministic SVG)
   ═══════════════════════════════════════════════════════════ */
export function MockQr({ value, size = 120 }) {
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
   HELPERS: Unit QR generation
   ═══════════════════════════════════════════════════════════ */
export function genUnitQrToken(orderId, productName, unitIndex) {
  const orderCode = orderId.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(-6);
  const prodCode  = productName.replace(/\s+/g, "").toUpperCase().slice(0, 4);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let hash = 0;
  const seed = `${orderId}||${productName}||${unitIndex}||${Date.now()}`;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  let suffix = "";
  let h = Math.abs(hash) || 7919;
  for (let i = 0; i < 7; i++) { suffix += chars[h % chars.length]; h = Math.floor(h / chars.length) || 7919; }
  return `UNIT-${orderCode}-${prodCode}-U${unitIndex}-${suffix}`;
}

export function generateQrSvgString(value, size = 200) {
  const GRID = 21;
  const cell = size / GRID;
  const finderCells = [];
  [[0,0],[14,0],[0,14]].forEach(([dr,dc]) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      if (r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4)) finderCells.push([dr+r, dc+c]);
    }
  });
  const reserved = new Set();
  [[0,0],[14,0],[0,14]].forEach(([dr,dc]) => {
    for (let r=dr-1;r<=dr+7;r++) for (let c=dc-1;c<=dc+7;c++)
      if (r>=0&&r<GRID&&c>=0&&c<GRID) reserved.add(`${r},${c}`);
  });
  for (let i=8;i<13;i++) { reserved.add(`6,${i}`); reserved.add(`${i},6`); }
  const timingCells = [];
  for (let i=8;i<13;i+=2) { timingCells.push([6,i]); timingCells.push([i,6]); }
  let hash = 0;
  for (let i=0;i<value.length;i++) hash = ((hash<<5)-hash+value.charCodeAt(i))|0;
  const dataCells = [];
  for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++) {
    if (reserved.has(`${r},${c}`)) continue;
    const s = (hash^(r*31+c*17))|0;
    if ((s^(s>>>7))&1) dataCells.push([r,c]);
  }
  const rects = [...finderCells,...timingCells,...dataCells]
    .map(([r,c]) => `<rect x="${(c*cell).toFixed(2)}" y="${(r*cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#1a1a1a"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

export function downloadQrAsPng(token, filename) {
  const svgStr = generateQrSvgString(token, 240);
  const canvas = document.createElement("canvas");
  canvas.width = 280; canvas.height = 280;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 280, 280);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 20, 20, 240, 240);
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

/* ── Image drop/upload input ─────────────────────────────── */
export function resizeToBase64(file, maxPx = 500, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageDropInput({ value, onChange, editMode = false }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file || !file.type.match(/^image\/(png|jpe?g|webp)$/)) return;
    try {
      const b64 = await resizeToBase64(file);
      onChange(b64);
    } catch (_) {}
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (editMode) {
    return (
      <div
        className={`adm-ep-drop${dragging ? " adm-ep-drop--over" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
        <div className="adm-ep-drop-inner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>{value ? "Ganti Foto" : "Upload Foto"}</span>
        </div>
        {value && <button type="button" className="adm-ep-drop-remove" onClick={e => { e.stopPropagation(); onChange(""); }}>✕ Hapus</button>}
      </div>
    );
  }

  if (value) {
    return (
      <div className="adm-img-preview-wrap">
        <img src={value} alt="preview" className="adm-img-preview" />
        <button type="button" className="adm-img-remove" onClick={() => onChange("")}>✕ Hapus</button>
      </div>
    );
  }

  return (
    <div
      className={`adm-img-drop${dragging ? " adm-img-drop--over" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className="adm-img-drop-icon">🖼</span>
      <span className="adm-img-drop-label">Drop gambar di sini atau <u>klik untuk pilih</u></span>
      <span className="adm-img-drop-hint">PNG · JPG · WebP — maks 500×500px (otomatis resize)</span>
    </div>
  );
}
