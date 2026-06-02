import { useState, useEffect } from "react";
import { useMockData } from "../../context/MockDataContext.jsx";
import { IcSearch, IcHistory, Avatar } from "../shared.jsx";

/* ═══════════════════════════════════════════════════════════
   SECTION: VERIFY HISTORY
   Riwayat semua verifikasi receipt yang pernah dilakukan admin.
   ═══════════════════════════════════════════════════════════ */
export default function VerifyHistory() {
  const { mockStore } = useMockData();
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [query,          setQuery]          = useState("");
  const [historyData,    setHistoryData]    = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [viewDetail,     setViewDetail]     = useState(null);

  const resolveUser = (email) =>
    (mockStore.users ?? []).find(u => u.email === email) ?? null;

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/receipts/history/`)
      .then(r => r.json())
      .then(data => setHistoryData(data.history ?? []))
      .catch(() => setHistoryData([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const filtered = historyData.filter(v => {
    const matchStatus = statusFilter === "all" || v.result === statusFilter;
    const q = query.toLowerCase();
    const matchQ = !q || (v.orderId ?? "").toLowerCase().includes(q) || (v.customer ?? "").toLowerCase().includes(q);
    return matchStatus && matchQ;
  });

  const validCount   = historyData.filter(v => v.result === "valid").length;
  const invalidCount = historyData.filter(v => v.result === "invalid").length;

  const validRate = historyData.length > 0 ? Math.round((validCount / historyData.length) * 100) : 0;
  const circleLen = 2 * Math.PI * 20; // r=20

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Riwayat Verifikasi Receipt</h2>
          <p className="adm-section-sub">{historyLoading ? "Memuat…" : `${historyData.length} verifikasi tercatat`}</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="adm-vh-stats">
        <div className="adm-vh-stat-card adm-vh-stat-card--total">
          <div className="adm-vh-stat-icon-wrap adm-vh-stat-icon--brand">
            <IcHistory />
          </div>
          <div>
            <span className="adm-vh-stat-num">{historyData.length}</span>
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
        {historyLoading ? (
          <div className="adm-card" style={{padding:"32px", textAlign:"center", color:"var(--adm-text-3)"}}>
            <div className="adm-modal-spinner" style={{margin:"0 auto 12px"}} />
            Memuat riwayat verifikasi…
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-card" style={{padding:"32px", textAlign:"center", color:"var(--adm-text-3)"}}>
            {historyData.length === 0 ? "Belum ada riwayat verifikasi." : "Tidak ada data ditemukan."}
          </div>
        ) : filtered.map((v, i) => {
          const usr = resolveUser(v.email);
          const displayName = usr?.name || v.customer || "—";
          const displayAvatar = usr?.avatar || null;
          return (
          <div key={v.id} className={`adm-vh-item adm-vh-item--${v.result}`}>
            <span className="adm-vh-item-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="adm-vh-item-customer">
              <Avatar name={displayName} size={36} src={displayAvatar} />
              <div>
                <p className="adm-vh-item-name">{displayName}</p>
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
            <button className="adm-act-btn adm-act-btn--edit" title="Lihat Detail" onClick={() => setViewDetail({ ...v, _resolvedName: displayName, _resolvedAvatar: displayAvatar })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          );
        })}
      </div>

      {/* ── Detail Modal ── */}
      {viewDetail && (
        <div className="adm-modal-overlay" onClick={() => setViewDetail(null)}>
          <div className="adm-vd-modal" onClick={e => e.stopPropagation()}>

            {/* Close */}
            <button className="adm-vd-close" onClick={() => setViewDetail(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Hero */}
            <div className={`adm-vd-hero adm-vd-hero--${viewDetail.result}`}>
              <div className="adm-vd-hero-icon">
                {viewDetail.result === "valid"
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <p className="adm-vd-hero-status">{viewDetail.result === "valid" ? "Receipt Valid" : "Receipt Invalid"}</p>
              <p className="adm-vd-hero-id">{viewDetail.orderId || "—"}</p>
            </div>

            {/* Body */}
            <div className="adm-vd-body">

              {/* Customer info */}
              <div className="adm-vd-section">
                <p className="adm-vd-section-label">Informasi Customer</p>
                <div className="adm-vd-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0 10px" }}>
                    <Avatar name={viewDetail._resolvedName || viewDetail.customer || "?"} size={40} src={viewDetail._resolvedAvatar || null} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#2d2d2d", margin: 0 }}>{viewDetail._resolvedName || viewDetail.customer || "Tidak diketahui"}</p>
                      <p style={{ fontSize: 12, color: "#aaa", margin: "2px 0 0" }}>{viewDetail.email || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dokumen & Pesanan */}
              <div className="adm-vd-section">
                <p className="adm-vd-section-label">Dokumen &amp; Pesanan</p>
                <div className="adm-vd-card">
                  <div className="adm-vd-row">
                    <span className="adm-vd-row-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </span>
                    <span className="adm-vd-row-label">PDF diinput</span>
                    <span className="adm-vd-row-val adm-vd-row-val--mono">{viewDetail.file || "—"}</span>
                  </div>
                  {viewDetail.pdfOrderId && (
                    <>
                      <div className="adm-vd-divider" />
                      <div className="adm-vd-row">
                        <span className="adm-vd-row-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                        </span>
                        <span className="adm-vd-row-label">Order di PDF</span>
                        <span className="adm-vd-row-val adm-vd-row-val--mono" style={{ color: "#ef4444", fontWeight: 700 }}>{viewDetail.pdfOrderId}</span>
                      </div>
                    </>
                  )}
                  <div className="adm-vd-divider" />
                  <div className="adm-vd-row">
                    <span className="adm-vd-row-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10H3M21 6H3M21 14H3M21 18H3"/></svg>
                    </span>
                    <span className="adm-vd-row-label">Order diretur</span>
                    <span className="adm-vd-row-val adm-vd-row-val--mono" style={{ color: "#2d2d2d", fontWeight: 700 }}>{viewDetail.orderId || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Verifikasi info */}
              <div className="adm-vd-section">
                <p className="adm-vd-section-label">Detail Verifikasi</p>
                <div className="adm-vd-card">
                  <div className="adm-vd-row">
                    <span className="adm-vd-row-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </span>
                    <span className="adm-vd-row-label">Waktu</span>
                    <span className="adm-vd-row-val">{viewDetail.date || "—"}</span>
                  </div>
                  <div className="adm-vd-divider" />
                  <div className="adm-vd-row">
                    <span className="adm-vd-row-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </span>
                    <span className="adm-vd-row-label">Oleh</span>
                    <span className="adm-vd-row-val">{viewDetail.verifiedBy || "admin"}</span>
                  </div>
                </div>
              </div>

              {/* Failure reason */}
              {viewDetail.result === "invalid" && viewDetail.failureReason && (
                <div className="adm-vd-alert">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div>
                    <p className="adm-vd-alert-title">Alasan Gagal</p>
                    <p className="adm-vd-alert-body">{viewDetail.failureReason}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
