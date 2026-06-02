import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Loader2, CheckCircle, Ban, Package, Clock, Star, CreditCard } from "lucide-react";
import { useOrders } from "../../customer/context/OrderContext";
import { useMockData } from "../../context/MockDataContext.jsx";
import { getCaseRiskSummary } from "../risk-data.js";
import {
  CaseRiskPanel,
  CompactRiskIndicator,
  RiskScoreCard,
  SessionRiskSummary,
  StepUpVerificationModal,
  TrustedDeviceCard,
} from "../risk-monitoring.jsx";
import {
  fmt,
  STATUS_META,
  createSecurityTimelineEvent,
  compressImage,
  IcSearch,
  IcCheck,
  IcTruck,
  IcReceipt,
  IcShield,
  IcQr,
  IcDownload,
  IcCreditCard,
  Avatar,
  MockQr,
  downloadQrAsPng,
} from "../shared.jsx";
import {
  QR_STATUS,
  activateQr,
  buildOrderQrSlots,
} from "../../lib/unitQrService.js";

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
   SECTION: ORDERS
   ═══════════════════════════════════════════════════════════ */
export function Orders({ setActive, setSelectedOrderId, goToOrderDetail }) {
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
                      {(() => { const u = mockStore.users.find(u => u.id === o.customerId); const n = u?.name ?? o.customer; return <><Avatar name={n} size={28} /><div><p className="adm-customer-name">{n}</p><p className="adm-customer-email">{o.payment}</p></div></>; })()}
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
   SECTION: ORDER DETAIL (was PaymentApproval)
   Shows full detail for any order with all admin actions
   ═══════════════════════════════════════════════════════════ */
export function OrderDetail({ selectedOrderId, setSelectedOrderId, setActive }) {
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
  const [courierInput,    setCourierInput]    = useState("");
  const [courierIsCustom, setCourierIsCustom] = useState(false);
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

  // Unit QR state: { [orderId]: UnitQrSlot[] }
  const [unitQrs, setUnitQrs] = useState({});
  const [viewingQr, setViewingQr] = useState(null);

  const getStatus = (o) => localStatuses[o.id] ?? o.status;
  const curStatus = order ? getStatus(order) : null;

  // Derived QR values for current order
  const orderQrs = unitQrs[order?.id] ?? [];
  const allQrsGenerated = orderQrs.length > 0 && orderQrs.every(q => q.generatedAt !== null);

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

  // Initialise QR slots once the order moves to packing (or is already past packing)
  useEffect(() => {
    if (!order?.id || !order?.items?.length) return;
    const postPending = ["packing", "shipped", "delivered"].includes(curStatus);
    if (!postPending) return;
    setUnitQrs(prev => {
      if (prev[order.id]) return prev; // already initialised
      return { ...prev, [order.id]: buildOrderQrSlots(order) };
    });
  }, [curStatus, order?.id, order?.items]);

  const generateUnitQr = async (unitId) => {
    const slot = (unitQrs[order.id] ?? []).find(s => s.unitId === unitId);
    if (!slot || slot.generatedAt) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/qr/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id:      order.id,
          order_item_id: slot.unitId,
          product_id:    slot.productId,
          product_name:  slot.productName,
          unit_index:    slot.unitIndex,
          generated_by:  currentUser?.id ?? "admin",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setUnitQrs(prev => {
        const slots = [...(prev[order.id] ?? [])];
        const idx = slots.findIndex(s => s.unitId === unitId);
        if (idx < 0) return prev;
        slots[idx] = activateQr(slots[idx], {
          qrToken:      data.qr_token,
          qrImageUrl:   data.qr_image_url,
          generatedAt:  data.generated_at,
          generatedBy:  currentUser?.id ?? null,
        });
        return { ...prev, [order.id]: slots };
      });
    } catch (err) {
      console.error("generateUnitQr failed:", err);
    }
  };

  const generateAllUnitQrs = async () => {
    const pending = (unitQrs[order.id] ?? []).filter(s => !s.generatedAt);
    await Promise.all(pending.map(s => generateUnitQr(s.unitId)));
  };

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
      setLocalStatuses(p => ({ ...p, [order.id]: "packing" }));
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
    setLocalStatuses(p => ({ ...p, [order.id]: "rejected" }));
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

  const COURIER_BY_DELIVERY = {
    instant: ["GoSend", "GrabExpress"],
    sameday: ["Anteraja Same Day", "SiCepat BEST", "GoSend", "GrabExpress"],
    regular: ["JNE Reguler", "JNE YES", "SiCepat HALU", "J&T Express", "Anteraja", "Pos Indonesia", "TIKI", "Lion Parcel", "Ninja Xpress"],
    economy: ["JNE OKE", "J&T Cargo", "Pos Indonesia", "TIKI"],
  };
  const _deliveryId = order?.deliveryId ?? "regular";
  const COURIER_OPTIONS = COURIER_BY_DELIVERY[_deliveryId] ?? COURIER_BY_DELIVERY.regular;

  const handleCourierSelect = (val) => {
    if (val === "__other__") {
      setCourierIsCustom(true);
      setCourierInput("");
    } else {
      setCourierIsCustom(false);
      setCourierInput(val);
    }
  };

  const handleShipConfirm = () => {
    if (!trackingInput.trim()) return;
    const finalCourier = courierInput.trim() || COURIER_OPTIONS[0] || "JNE Reguler";
    if (order.fromCtx) shipOrder(order.id, finalCourier, trackingInput.trim());
    setLocalStatuses(p => ({ ...p, [order.id]: "shipped" }));
    setLocalShip(p => ({ ...p, [order.id]: { courier: finalCourier, trackingNumber: trackingInput.trim() } }));
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
    setLocalStatuses(p => ({ ...p, [order.id]: "delivered" }));
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
                {(() => {
                  const customerUser = mockStore.users.find(u => u.id === order.customerId);
                  const customerName = customerUser?.name ?? order.customer;
                  return (
                    <>
                      <Avatar name={customerName} size={48} />
                      <div>
                        <p className="adm-pa-customer-name">{customerName}</p>
                        {order.email && <p className="adm-pa-customer-sub">{order.email}</p>}
                        {order.phone && <p className="adm-pa-customer-sub">{order.phone}</p>}
                      </div>
                    </>
                  );
                })()}
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

            {/* ── Unit QR Produk — visible once order is approved (packing+) ── */}
            {["packing", "shipped", "delivered"].includes(curStatus) && (
              <div className="adm-pa-block adm-unit-qr-block">
                <div className="adm-unit-qr-hdr">
                  <p className="adm-pa-block-label" style={{ margin: 0 }}>Unit QR Produk</p>
                  {curStatus === "packing" && !allQrsGenerated && orderQrs.length > 0 && (
                    <button className="adm-unit-qr-gen-all-btn" onClick={generateAllUnitQrs}>
                      <IcQr /> Generate Semua
                    </button>
                  )}
                </div>

                <div className="adm-unit-qr-banner">
                  <IcShield />
                  <p>QR unik per unit — digunakan saat customer mengajukan pengembalian untuk memverifikasi keaslian produk dan mencegah penipuan.</p>
                </div>

                {orderQrs.length === 0 ? (
                  <p className="adm-unit-qr-empty">Memuat slot QR…</p>
                ) : (
                  <div className="adm-unit-qr-list">
                    {orderQrs.map((unit) => (
                      <div key={unit.unitId} className={`adm-unit-qr-row${unit.generatedAt ? " adm-unit-qr-row--generated" : ""}`}>
                        <div className="adm-unit-qr-row-left">
                          <span className="adm-unit-qr-name">{unit.productName}</span>
                          <span className="adm-unit-qr-badge">Unit #{unit.unitIndex}</span>
                        </div>

                        <div className="adm-unit-qr-row-mid">
                          {unit.generatedAt ? (
                            <>
                              <span className="adm-unit-qr-status adm-unit-qr-status--active">● Aktif</span>
                              <span className="adm-unit-qr-ts">
                                {new Date(unit.generatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                              </span>
                            </>
                          ) : (
                            <span className="adm-unit-qr-status adm-unit-qr-status--pending">○ Belum digenerate</span>
                          )}
                        </div>

                        <div className="adm-unit-qr-row-actions">
                          {!unit.generatedAt ? (
                            curStatus === "packing" ? (
                              <button
                                className="adm-unit-qr-btn adm-unit-qr-btn--gen"
                                onClick={() => generateUnitQr(unit.unitId)}
                              >
                                <IcQr /> Generate
                              </button>
                            ) : (
                              <span className="adm-unit-qr-status adm-unit-qr-status--pending">— Tidak digenerate</span>
                            )
                          ) : (
                            <>
                              <button
                                className="adm-unit-qr-btn adm-unit-qr-btn--view"
                                onClick={() => setViewingQr(unit)}
                              >
                                <IcQr /> Lihat
                              </button>
                              <button
                                className="adm-unit-qr-btn adm-unit-qr-btn--dl"
                                onClick={() => {
                                  const filename = `qr-${unit.productName.replace(/\s+/g,"-")}-u${unit.unitIndex}-${order.id}.png`;
                                  if (unit.qrImageUrl) {
                                    const a = document.createElement("a");
                                    a.href = unit.qrImageUrl;
                                    a.download = filename;
                                    a.click();
                                  } else {
                                    downloadQrAsPng(unit.qrToken, filename);
                                  }
                                }}
                              >
                                <IcDownload /> Unduh
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {curStatus === "packing" && orderQrs.length > 0 && !allQrsGenerated && (
                  <p className="adm-unit-qr-warn">
                    ⚠ Generate semua QR sebelum bisa melanjutkan ke pengiriman.
                  </p>
                )}
              </div>
            )}

            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Alamat Pengiriman</p>
              {order.recipient && <p className="adm-pa-customer-name" style={{ marginBottom: 2 }}>{order.recipient}</p>}
              {order.phone && <p className="adm-pa-customer-sub" style={{ marginBottom: 4 }}>{order.phone}</p>}
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
                <div className="adm-pa-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  <button
                    className="adm-pa-approve-btn"
                    disabled={!allQrsGenerated}
                    title={!allQrsGenerated ? "Generate semua QR produk terlebih dahulu" : undefined}
                    onClick={() => { setShipModal(true); setCourierInput(""); setCourierIsCustom(false); setTrackingInput(""); }}
                    style={{ opacity: allQrsGenerated ? 1 : 0.5, cursor: allQrsGenerated ? "pointer" : "not-allowed" }}
                  >
                    <IcTruck /> Input Pengiriman
                  </button>
                  {!allQrsGenerated && (
                    <p className="adm-unit-qr-ship-block-hint">
                      Generate semua QR unit produk di atas sebelum melanjutkan pengiriman.
                    </p>
                  )}
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
        verificationHint="Kode OTP telah dikirim ke email admin."
        onVerifyCode={(code) =>
          verifyOtp(session?.userId ?? currentUser?.id, code, {
            purpose: "step_up",
          })
        }
        onClose={closeStepUp}
        onSuccess={handleStepUpSuccess}
      />

      {/* ── Unit QR View Modal ── */}
      {viewingQr && (
        <div className="adm-modal-overlay" onClick={() => setViewingQr(null)}>
          <div className="adm-modal adm-unit-qr-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-header">
              <div className="adm-modal-header-info">
                <h3 className="adm-modal-title">QR Unit Produk</h3>
                <p className="adm-modal-sub">{viewingQr.productName} — Unit #{viewingQr.unitIndex} · {order.id}</p>
              </div>
              <button className="adm-modal-close" onClick={() => setViewingQr(null)}>✕</button>
            </div>

            <div className="adm-unit-qr-modal-body">
              <div className="adm-unit-qr-modal-qr-wrap">
                {viewingQr.qrImageUrl
                  ? <img src={viewingQr.qrImageUrl} alt={`QR ${viewingQr.qrToken}`} width={180} height={180} style={{ imageRendering: "pixelated", display: "block" }} />
                  : <MockQr value={viewingQr.qrToken} size={180} />
                }
                <span className={`adm-unit-qr-status adm-unit-qr-status--${viewingQr.qrStatus ?? QR_STATUS.ACTIVE}`} style={{ marginTop: 10, display: "block", textAlign: "center" }}>
                  ● {viewingQr.qrStatus === QR_STATUS.ACTIVE ? "Aktif" : viewingQr.qrStatus === QR_STATUS.RETURNED ? "Dikembalikan" : "Invalid"}
                </span>
              </div>

              <div className="adm-unit-qr-modal-info">
                <div className="adm-unit-qr-modal-field">
                  <span className="adm-pqr-label">Token QR</span>
                  <code className="adm-qr-code-chip adm-qr-code-chip--neutral">{viewingQr.qrToken}</code>
                </div>
                <div className="adm-unit-qr-modal-field">
                  <span className="adm-pqr-label">Digenerate</span>
                  <span className="adm-unit-qr-modal-val">
                    {new Date(viewingQr.generatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                  </span>
                </div>
                <div className="adm-unit-qr-modal-field">
                  <span className="adm-pqr-label">Pesanan</span>
                  <span className="adm-unit-qr-modal-val">{order.id} · {order.customer}</span>
                </div>

                <div className="adm-unit-qr-modal-desc">
                  <div className="adm-unit-qr-modal-desc-hdr">
                    <IcShield />
                    <strong>Verifikasi Pengembalian &amp; Anti-Penipuan</strong>
                  </div>
                  <p>
                    QR ini dilekatkan secara unik pada unit <strong>{viewingQr.productName}</strong> (Unit #{viewingQr.unitIndex}) dalam pesanan <strong>{order.id}</strong>.
                    Saat customer mengajukan pengembalian, admin scan QR ini untuk memastikan produk yang dikembalikan adalah barang asli dari pesanan yang sama — bukan produk palsu atau unit dari pesanan lain.
                  </p>
                  <p style={{ marginTop: 8, color: "#c97269", fontWeight: 600 }}>
                    Cetak dan tempel QR ini di dalam kemasan sebelum dikirim.
                  </p>
                </div>
              </div>
            </div>

            <div className="adm-modal-footer">
              <button
                className="adm-pa-approve-btn"
                onClick={() => {
                  const filename = `qr-${viewingQr.productName.replace(/\s+/g,"-")}-u${viewingQr.unitIndex}-${order.id}.png`;
                  if (viewingQr.qrImageUrl) {
                    const a = document.createElement("a");
                    a.href = viewingQr.qrImageUrl;
                    a.download = filename;
                    a.click();
                  } else {
                    downloadQrAsPng(viewingQr.qrToken, filename);
                  }
                }}
              >
                <IcDownload /> Unduh PNG
              </button>
              <button className="adm-ghost-btn" onClick={() => setViewingQr(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

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
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 4 }}>KURIR</label>
                  {order?.delivery && (
                    <span style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 6 }}>
                      Opsi disesuaikan dengan metode pengiriman pelanggan:{" "}
                      <strong style={{ color: "#555" }}>{order.delivery}</strong>
                    </span>
                  )}
                  <select
                    className="adm-modal-select"
                    value={courierIsCustom ? "__other__" : (courierInput || "")}
                    onChange={e => handleCourierSelect(e.target.value)}
                  >
                    <option value="">— Pilih kurir —</option>
                    {COURIER_OPTIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="__other__">Lainnya (input manual)…</option>
                  </select>
                  {courierIsCustom && (
                    <input
                      className="adm-modal-textarea"
                      style={{ marginTop: 8, minHeight: "unset", height: 40, resize: "none", borderRadius: 10 }}
                      placeholder="Nama kurir..."
                      autoFocus
                      value={courierInput}
                      onChange={e => setCourierInput(e.target.value)}
                    />
                  )}
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
export const PaymentApproval = OrderDetail;

export default Orders;
