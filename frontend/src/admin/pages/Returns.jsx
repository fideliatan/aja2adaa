import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Loader2, CheckCircle, Ban, Package } from "lucide-react";
import jsQR from "jsqr";
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
  createSecurityTimelineEvent,
  IcCheck,
  IcQr,
  Avatar,
} from "../shared.jsx";

/* ═══════════════════════════════════════════════════════════
   SECTION: RETURNS — QR-Based Return Verification
   ═══════════════════════════════════════════════════════════ */
export const RETURN_STATUS_META = {
  pending:       { label: "Menunggu Persetujuan", color: "#e09a3a", bg: "rgba(224,154,58,0.12)"  },
  approved:      { label: "Disetujui",            color: "#4a9fd4", bg: "rgba(74,159,212,0.12)"  },
  item_received: { label: "Barang Diterima",      color: "#8b5cf6", bg: "rgba(139,92,246,0.12)"  },
  completed:     { label: "Return Selesai",       color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
  rejected:      { label: "Ditolak",              color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

export function buildAllReturns(ctxReturns) {
  return ctxReturns.map(r => ({
    ...r,
    monitoringFlag: r.monitoringFlag ?? null,
    conditionNote:  r.conditionNote  ?? r.reason,
    photos:         r.photos ?? (r.productPhotoB64 ? [r.productPhotoB64] : []),
    receiptB64:          r.receiptB64          ?? null,
    receiptFileName:     r.receiptFileName     ?? null,
    receiptVerifyStatus: r.receiptVerifyStatus ?? null,
    receiptVerifyReason: r.receiptVerifyReason ?? null,
    qrStatus:            r.qrStatus            ?? null,
    fromCtx: true,
  }));
}

export function buildReturnUnits(products) {
  const units = [];
  (products ?? []).forEach((p, pi) => {
    for (let u = 1; u <= (p.qty ?? 1); u++) {
      units.push({ key: `${pi}-${u}`, name: p.name, unitIndex: u });
    }
  });
  return units;
}

/* ═══════════════════════════════════════════════════════════
   CAMERA QR SCANNER
   ═══════════════════════════════════════════════════════════ */
function CameraScanner({ onScan, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const streamRef = useRef(null);
  const [camErr,      setCamErr]     = useState(null);
  const [scanning,    setScanning]   = useState(false); // true = jsQR loop active
  const [foundCode,   setFoundCode]  = useState(null);  // detected token waiting for confirm
  const [manualToken, setManualToken] = useState("");

  // Start camera, then wait 1.5 s before activating jsQR
  // so the admin has time to position the QR (and we don't
  // accidentally scan a QR code that's already on screen).
  useEffect(() => {
    let alive = true;
    let timer  = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        timer = setTimeout(() => { if (alive) setScanning(true); }, 1500);
      })
      .catch(err => {
        if (!alive) return;
        setCamErr("Tidak dapat mengakses kamera: " + (err.message || err));
      });
    return () => {
      alive = false;
      clearTimeout(timer);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // jsQR decode loop — runs only while scanning=true and no code found yet
  useEffect(() => {
    if (!scanning || foundCode) return;
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
      const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) {
        cancelAnimationFrame(rafRef.current);
        setFoundCode(code.data); // pause and ask for confirmation
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scanning, foundCode]);

  const confirmScan = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onScan(foundCode);
  };

  const retryScan = () => {
    setFoundCode(null);
    // brief pause so admin can reposition, then resume loop
    setScanning(false);
    setTimeout(() => setScanning(true), 400);
  };

  const submitManual = () => {
    const val = manualToken.trim();
    if (!val) return;
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onScan(val);
  };

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
          ) : foundCode ? (
            <div className="adm-cam-found">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p className="adm-cam-found-title">QR Terdeteksi</p>
              <code className="adm-cam-found-token">{foundCode}</code>
              <div className="adm-cam-found-btns">
                <button className="adm-cam-manual-btn" onClick={confirmScan}>Gunakan Token Ini</button>
                <button className="adm-cam-err-btn" onClick={retryScan}>Scan Ulang</button>
              </div>
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
                {scanning && <div className="adm-cam-scanline" />}
              </div>
              {!scanning && (
                <div className="adm-cam-preparing">
                  <Loader2 size={22} className="adm-spin" />
                  <span>Mempersiapkan kamera…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!foundCode && (
          <>
            <p className="adm-cam-hint">
              {scanning ? "Arahkan kamera ke QR code produk" : "Mempersiapkan kamera…"}
            </p>
            <div className="adm-cam-manual">
              <input
                className="adm-cam-manual-input"
                type="text"
                placeholder="Atau ketik / tempel token QR..."
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") submitManual(); }}
              />
              <button className="adm-cam-manual-btn" onClick={submitManual} disabled={!manualToken.trim()}>
                Konfirmasi
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Returns({ goToReturnDetail }) {
  const { returns: ctxReturns } = useOrders();
  const { mockStore } = useMockData();
  const allReturns = buildAllReturns(ctxReturns);
  const [tab, setTab] = useState("all");
  const tabs = ["all", "pending", "approved", "item_received", "completed", "rejected"];
  const filtered = tab === "all" ? allReturns : allReturns.filter(r => r.status === tab);

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Return Paket</h2>
          <p className="adm-section-sub">
            {allReturns.length} total · {allReturns.filter(r => r.status === "pending").length} menunggu · {allReturns.filter(r => r.status === "approved").length} disetujui · klik baris untuk review
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
              const liveUser = r.email ? (mockStore.users ?? []).find(u => u.email === r.email) : null;
              const displayName = liveUser?.name ?? r.customer;
              return (
                <tr key={r.id} className="adm-table-row--clickable" onClick={() => goToReturnDetail(r.id)}>
                  <td><span className="adm-order-id">{r.id}</span></td>
                  <td>
                    <div className="adm-customer-cell">
                      <Avatar name={displayName} size={28} src={liveUser?.photo ?? null} />
                      <div>
                        <p className="adm-customer-name">{displayName}</p>
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
export function ReturnDetail({ selectedReturnId, setSelectedReturnId, setActive }) {
  const { returns: ctxReturns, updateReturn } = useOrders();
  const { mockStore, session, currentUser, generateOtp, verifyOtp, resolveFlag, addTimelineEvent } = useMockData();
  const allReturns = buildAllReturns(ctxReturns);
  const initialReturnId = selectedReturnId ?? allReturns[0]?.id;

  const [localId,       setLocalId]       = useState(selectedReturnId ?? allReturns[0]?.id);
  const [localStatuses, setLocalStatuses] = useState({});
  const [receiptZoom,   setReceiptZoom]   = useState(false);
  const [photoZoom,     setPhotoZoom]     = useState(null);
  const [receiptVerify, setReceiptVerify] = useState(null);
  const [receiptVerifyData, setReceiptVerifyData] = useState(null);
  const [riskSummary,   setRiskSummary]   = useState(() => getCaseRiskSummary(mockStore, "return", initialReturnId));
  const [stepUpState,   setStepUpState]   = useState({
    open: false,
    actionKey: "",
    actionLabel: "",
    reasons: [],
    helperText: "",
  });
  const stepUpActionRef = useRef(null);
  const [showScanner,     setShowScanner]    = useState(false);
  const [unitScans,       setUnitScans]      = useState({});   // { retId: { unitKey: { status, token, unit_id, message, fraud_flag_id, order_id } } }
  const [pendingScanUnit, setPendingScanUnit] = useState(null); // unitKey waiting for scanner

  const currentId  = localId ?? allReturns[0]?.id;
  const ret        = allReturns.find(r => r.id === currentId) ?? allReturns[0];
  const currentIdx = allReturns.findIndex(r => r.id === currentId);
  const curStatus  = ret ? (localStatuses[ret.id] ?? ret.status) : null;

  const returnUnits  = buildReturnUnits(ret?.products);
  const scansForRet  = unitScans[ret?.id] ?? {};
  const allVerified  = returnUnits.length > 0 && returnUnits.every(u => scansForRet[u.key]?.status === "valid");
  const anyInvalid   = returnUnits.some(u => scansForRet[u.key]?.status === "invalid");
  const anyFraudFlag = returnUnits.some(u => scansForRet[u.key]?.fraud_flag_id);
  const validCount   = returnUnits.filter(u => scansForRet[u.key]?.status === "valid").length;
  const curQr        = allVerified ? "valid" : anyInvalid ? "invalid" : null;

  useEffect(() => {
    if (selectedReturnId) setLocalId(selectedReturnId);
  }, [selectedReturnId]);

  useEffect(() => {
    if (!ret?.id) return;
    setRiskSummary(getCaseRiskSummary(mockStore, "return", ret.id));
    // Restore persisted verification result so it survives page reload
    const savedStatus = ret.receiptVerifyStatus ?? null;
    setReceiptVerify(savedStatus);
    if (savedStatus === "valid") {
      setReceiptVerifyData({
        valid: true,
        order_id:       ret.orderId,
        customer_name:  ret.customer,
        customer_email: ret.email,
        total:          ret.total,
        generated_at:   ret.createdAt ?? null,
        failure_reason: "",
      });
    } else if (savedStatus === "invalid") {
      setReceiptVerifyData({
        valid: false,
        failure_reason: ret.receiptVerifyReason ?? "",
      });
    } else {
      setReceiptVerifyData(null);
    }
    setStepUpState({
      open: false,
      actionKey: "",
      actionLabel: "",
      reasons: [],
      helperText: "",
    });
    stepUpActionRef.current = null;
  }, [ret?.id]);

  // Re-compute risk summary in real-time whenever flags or timeline change in the store
  useEffect(() => {
    if (!ret?.id) return;
    setRiskSummary(getCaseRiskSummary(mockStore, "return", ret.id));
  }, [mockStore.monitoringFlags, mockStore.activityTimeline]);

  // Auto-transition approved → item_received when all units are scanned valid
  useEffect(() => {
    if (!ret?.id || curStatus !== "approved" || returnUnits.length === 0) return;
    const scans = unitScans[ret.id] ?? {};
    if (returnUnits.every(u => scans[u.key]?.status === "valid")) {
      patchReturn(ret.id, { status: "item_received", qrStatus: "valid" });
    }
  }, [unitScans]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchReturn = (id, patch) => {
    if (ret?.fromCtx) updateReturn(id, patch);
    if (patch.status) setLocalStatuses(p => ({ ...p, [id]: patch.status }));
  };

  const handleScanResult = (scannedToken) => {
    setShowScanner(false);
    const unitKey = pendingScanUnit;
    setPendingScanUnit(null);
    if (!ret || !unitKey) return;

    setUnitScans(p => ({
      ...p,
      [ret.id]: { ...(p[ret.id] ?? {}), [unitKey]: { status: "loading", token: scannedToken } },
    }));

    // Derive expected product_id and order_item_id for this slot so the
    // backend can reject QRs from the wrong product or wrong unit of the same product.
    const pi            = parseInt(unitKey.split("-")[0]);
    const u             = parseInt(unitKey.split("-")[1]);
    const expectedName  = ret?.products?.[pi]?.name ?? null;
    const linkedOrder   = (mockStore.orders ?? []).find(o => o.id === ret.orderId);
    const itemIdx       = linkedOrder?.items?.findIndex(i => i.name === expectedName) ?? -1;
    const claimedProductId    = itemIdx >= 0 ? (linkedOrder.items[itemIdx].id ?? `PROD-${itemIdx}`) : null;
    const claimedOrderItemId  = (itemIdx >= 0 && ret.orderId)
      ? `${ret.orderId}-ITEM${String(itemIdx).padStart(2, "0")}-U${u}`
      : null;

    const _apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${_apiBase}/api/qr/verify/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qr_token:              scannedToken,
        scanned_by:            currentUser?.id ?? "admin",
        claimed_order_id:      ret.orderId ?? null,
        claimed_product_id:    claimedProductId,
        claimed_order_item_id: claimedOrderItemId,
      }),
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || `Server error ${r.status}`);
        return data;
      })
      .then(data => {
        const backendValid = data.is_valid === true;

        // Use a functional updater so we read the LATEST scans state —
        // prevents the same physical unit_id from verifying two different slots.
        let finalStatus  = backendValid ? "valid" : "invalid";
        let finalMessage = data.message ?? (backendValid ? "Terverifikasi" : "Verifikasi gagal");
        let finalCode    = data.result_code ?? "invalid";

        setUnitScans(current => {
          const currentScans = current[ret.id] ?? {};

          // If backend said valid, check whether this unit_id was already used
          // for a different slot in this same return.
          if (backendValid && data.unit_id) {
            const alreadyUsed = Object.entries(currentScans).some(
              ([k, s]) => k !== unitKey && s.unit_id === data.unit_id
            );
            if (alreadyUsed) {
              finalStatus  = "invalid";
              finalMessage = "QR ini sudah digunakan untuk produk lain dalam return ini. Gunakan QR yang berbeda.";
              finalCode    = "duplicate_unit";
            }
          }

          return {
            ...current,
            [ret.id]: {
              ...currentScans,
              [unitKey]: {
                status:        finalStatus,
                token:         scannedToken,
                message:       finalMessage,
                unit_id:       data.unit_id,
                fraud_flag_id: data.fraud_flag_id,
                order_id:      data.order_id,
                result_code:   finalCode,
              },
            },
          };
        });

        const matched = finalStatus === "valid";
        const evtLabel = matched
          ? `QR ${unitKey} terverifikasi`
          : `QR ${unitKey} gagal (${finalCode})`;
        addTimelineEvent({
          actorId: currentUser?.id ?? "admin",
          actorRole: "admin",
          eventType: matched ? "qr_verified" : "qr_failed",
          label: evtLabel,
          metadata: { entityType: "return", entityId: ret.id, orderId: ret.orderId ?? null, unitKey, resultCode: finalCode },
        });
        if (!matched) {
          patchReturn(ret.id, { qrStatus: "invalid" });
        }
      })
      .catch(err => {
        console.error("QR verify failed:", err);
        setUnitScans(p => ({
          ...p,
          [ret.id]: {
            ...(p[ret.id] ?? {}),
            [unitKey]: { status: "invalid", token: scannedToken, message: err.message ?? "Gagal terhubung ke server." },
          },
        }));
      });
  };

  const doScanQR = (unitKey) => {
    if (!ret) return;
    setPendingScanUnit(unitKey);
    setShowScanner(true);
  };

  const resetUnitScan = (unitKey) => {
    if (!ret) return;
    setUnitScans(p => {
      const updated = { ...(p[ret.id] ?? {}) };
      delete updated[unitKey];
      return { ...p, [ret.id]: updated };
    });
  };

  const navTo = (r) => { setLocalId(r.id); if (setSelectedReturnId) setSelectedReturnId(r.id); setPendingScanUnit(null); };

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
              {(() => {
                const liveUser = ret.email ? (mockStore.users ?? []).find(u => u.email === ret.email) : null;
                const displayName = liveUser?.name ?? ret.customer;
                return (
                  <div className="adm-pa-customer">
                    <Avatar name={displayName} size={48} src={liveUser?.photo ?? null} />
                    <div>
                      <p className="adm-pa-customer-name">{displayName}</p>
                      {ret.email && <p className="adm-pa-customer-sub">{ret.email}</p>}
                    </div>
                  </div>
                );
              })()}
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
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {receipt.startsWith("data:application/pdf") ? (
                      <a
                        className="adm-proof-file-btn"
                        href={receipt}
                        download={ret.receiptFileName ?? `e-receipt-${ret.orderId}.pdf`}
                        onClick={e => e.stopPropagation()}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {ret.receiptFileName ?? `e-receipt-${ret.orderId}.pdf`}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </a>
                    ) : (
                      <button className="adm-proof-file-btn" onClick={() => setReceiptZoom(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        {ret.receiptFileName ?? `e-receipt-${ret.orderId}.jpg`}
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/></svg>
                      </button>
                    )}
                    {receiptVerify === null && receipt.startsWith("data:application/pdf") && (
                      <button
                        className="adm-qrv-cam-btn"
                        style={{ fontSize: 12 }}
                        onClick={async () => {
                          setReceiptVerify("verifying");
                          try {
                            const base64 = receipt.replace(/^data:application\/pdf;base64,/, "");
                            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                            const blob = new Blob([bytes], { type: "application/pdf" });
                            const form = new FormData();
                            form.append("pdf_file", blob, `e-receipt-${ret.orderId}.pdf`);
                            form.append("order_id", ret.orderId);
                            form.append("verified_by", currentUser?.id ?? "admin");
                            form.append("return_customer_name", ret.customer ?? "");
                            form.append("return_customer_email", ret.email ?? "");
                            const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
                            const res = await fetch(`${apiBase}/api/receipts/verify/`, { method: "POST", body: form });
                            const data = await res.json();
                            const isValid = data.valid === true;
                            setReceiptVerifyData(data);
                            setReceiptVerify(isValid ? "valid" : "invalid");
                            // Persist verification result so it survives page reload
                            updateReturn(ret.id, {
                              receiptVerifyStatus: isValid ? "valid" : "invalid",
                              receiptVerifyReason: data.failure_reason ?? "",
                              ...(isValid ? {} : { monitoringFlag: "E-receipt tidak cocok" }),
                            });
                            addTimelineEvent({
                              actorId: currentUser?.id ?? "admin",
                              actorRole: "admin",
                              eventType: isValid ? "receipt_verified" : "receipt_invalid",
                              label: isValid ? `E-receipt ${ret.orderId} terverifikasi` : `E-receipt ${ret.orderId} tidak valid`,
                              metadata: { entityType: "return", entityId: ret.id, orderId: ret.orderId, valid: isValid },
                            });
                          } catch {
                            setReceiptVerify(null);
                          }
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Verifikasi
                      </button>
                    )}
                    {receiptVerify === "verifying" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#888" }}>
                        <Loader2 size={12} className="adm-spin" /> Memverifikasi...
                      </span>
                    )}
                    {(receiptVerify === "valid" || receiptVerify === "invalid") && (
                      <button
                        style={{ fontSize: 11, background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", color: "#888", cursor: "pointer", fontFamily: "inherit" }}
                        onClick={() => { setReceiptVerify(null); setReceiptVerifyData(null); }}
                      >
                        Periksa Ulang
                      </button>
                    )}
                  </div>

                  {receiptVerify === "valid" && (
                    <div className="adm-rv-result" style={{ marginTop: 14 }}>
                      <div className="adm-rv-banner adm-rv-banner--valid">
                        <div className="adm-rv-banner-icon">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div>
                          <h2 className="adm-rv-result-title">E-Receipt VALID ✓</h2>
                          <p className="adm-rv-result-sub">Tanda tangan digital berhasil diverifikasi</p>
                        </div>
                      </div>
                      <div className="adm-card adm-rv-detail-card">
                        <h3 className="adm-card-title" style={{ marginBottom: 16 }}>Informasi Terverifikasi</h3>
                        {[
                          ["Order ID",           receiptVerifyData?.order_id || "—"],
                          ["Nama Pelanggan",      receiptVerifyData?.customer_name || "—"],
                          ["Total Pembayaran",    receiptVerifyData?.total ? fmt(receiptVerifyData.total) : "—"],
                          ["Email Pelanggan",     receiptVerifyData?.customer_email || "—"],
                          ["Dibuat Pada",         receiptVerifyData?.generated_at ? new Date(receiptVerifyData.generated_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "—"],
                          ["Status Tanda Tangan", "Cocok dengan database ✓"],
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
                    </div>
                  )}

                  {receiptVerify === "invalid" && (
                    <div className="adm-rv-result" style={{ marginTop: 14 }}>
                      <div className="adm-rv-banner adm-rv-banner--invalid">
                        <div className="adm-rv-banner-icon">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                        <div>
                          <h2 className="adm-rv-result-title">E-Receipt INVALID ✗</h2>
                          <p className="adm-rv-result-sub">Tanda tangan digital tidak ditemukan atau tidak cocok</p>
                        </div>
                      </div>
                      <div className="adm-card adm-rv-detail-card">
                        <h3 className="adm-card-title" style={{ marginBottom: 16 }}>Detail Pemeriksaan</h3>
                        <div className="adm-rv-detail-row">
                          <span className="adm-rv-detail-label">Status</span>
                          <span className="adm-rv-detail-val" style={{ color: "#ef4444", fontWeight: 700 }}>
                            {receiptVerifyData?.failure_reason || "Signature tidak ditemukan dalam file"}
                          </span>
                        </div>
                        <div style={{ marginTop: 16 }}>
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
                    </div>
                  )}
                </>
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

            {(curStatus === "approved" || curStatus === "item_received") && (
            <div className="adm-pa-block">
              <p className="adm-pa-block-label">Verifikasi QR Produk</p>
              <p style={{ fontSize: 12.5, color: "#888", marginBottom: 12 }}>
                {curStatus === "approved"
                  ? `Scan QR code tiap produk ketika barang tiba. ${returnUnits.length} unit perlu diverifikasi.`
                  : `Barang telah diterima. ${validCount} / ${returnUnits.length} unit terverifikasi.`}
              </p>

              {returnUnits.length === 0 ? (
                <p style={{ fontSize: 13, color: "#bbb" }}>Tidak ada produk terdaftar pada return ini.</p>
              ) : (
                <div className="adm-unit-qr-list">
                  {returnUnits.map((unit) => {
                    const scan = scansForRet[unit.key];
                    const isLoading = scan?.status === "loading";
                    const isValid   = scan?.status === "valid";
                    const isInvalid = scan?.status === "invalid";
                    const locked    = curStatus === "completed" || curStatus === "rejected" || curStatus === "item_received";
                    return (
                      <div key={unit.key} className={`adm-unit-qr-row${isValid ? " adm-unit-qr-row--generated" : ""}`}>
                        <div className="adm-unit-qr-row-left">
                          <span className="adm-unit-qr-name">{unit.name}</span>
                          <span className="adm-unit-qr-badge">Unit #{unit.unitIndex}</span>
                        </div>

                        <div className="adm-unit-qr-row-mid">
                          {isLoading ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#888" }}>
                              <Loader2 size={13} className="adm-spin" /> Memverifikasi...
                            </span>
                          ) : isValid ? (
                            <span className="adm-unit-qr-status adm-unit-qr-status--active">✓ Terverifikasi</span>
                          ) : isInvalid ? (
                            <span style={{ fontSize: 12.5, color: "#ef4444", wordBreak: "break-word", overflowWrap: "break-word" }}>
                              ✗ {scan.message ?? "QR tidak cocok"}
                              {scan.fraud_flag_id && <span style={{ marginLeft: 6, fontWeight: 600 }}>⚑ Fraud</span>}
                            </span>
                          ) : (
                            <span className="adm-unit-qr-status adm-unit-qr-status--pending">○ Belum discan</span>
                          )}
                        </div>

                        <div className="adm-unit-qr-row-actions">
                          {isLoading ? null : isValid ? (
                            <button className="adm-qr-rescan-btn" onClick={() => resetUnitScan(unit.key)} disabled={locked}>
                              ↺ Scan Ulang
                            </button>
                          ) : (
                            <button
                              className="adm-qrv-cam-btn"
                              style={isInvalid ? { background: "rgba(239,68,68,0.08)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" } : {}}
                              onClick={() => doScanQR(unit.key)}
                              disabled={locked}
                            >
                              <IcQr /> {isInvalid ? "Scan Ulang" : "Scan QR"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {anyFraudFlag && (
                <div style={{ marginTop: 10, padding: "7px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, fontSize: 12.5, color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={13} /> Fraud flag terdeteksi — aktivitas mencurigakan telah dicatat
                </div>
              )}

              {returnUnits.length > 0 && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: allVerified ? "#22c55e" : "#888", fontWeight: allVerified ? 600 : 400 }}>
                  {allVerified
                    ? "✓ Semua produk terverifikasi — siap diputuskan."
                    : `${validCount} / ${returnUnits.length} produk terverifikasi`}
                </p>
              )}
            </div>
            )}

            <div className="adm-pa-block adm-pa-block--last">
              <p className="adm-pa-block-label">Keputusan Admin</p>
              {curStatus === "completed" || curStatus === "rejected" ? (
                <div className="adm-od-resolved-note">
                  <span style={{ fontSize: 20 }}>{curStatus === "completed" ? <CheckCircle size={20} /> : <Ban size={20} />}</span>
                  <p>Return ini sudah {curStatus === "completed" ? "selesai diproses" : "ditolak"}.</p>
                </div>
              ) : curStatus === "item_received" ? (
                <div className="adm-pa-actions">
                  {curQr === "invalid" ? (
                    <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, marginBottom: 10, fontSize: 13, color: "#ef4444", lineHeight: 1.5, border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                      QR tidak cocok — return tidak dapat ditandai selesai sebelum verifikasi produk berhasil.
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: "10px 14px", background: "rgba(74,159,212,0.1)", borderRadius: 10, marginBottom: 10, fontSize: 13, color: "#4a9fd4", lineHeight: 1.5 }}>
                        <Package size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Barang telah diterima. Tandai selesai setelah refund dilakukan.
                      </div>
                      <button className="adm-pa-approve-btn" onClick={async () => {
                        const unitIds = returnUnits
                          .map(u => scansForRet[u.key]?.unit_id)
                          .filter(Boolean);
                        await Promise.allSettled(unitIds.map(unit_id =>
                          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/qr/approve/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ unit_id, approved_by: currentUser?.id ?? "admin" }),
                          }).catch(err => console.error("QR approve failed:", err))
                        ));
                        patchReturn(ret.id, { status: "completed" });
                      }}><IcCheck /> Tandai Return Selesai</button>
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
              ) : curStatus === "approved" ? (
                <div style={{ padding: "10px 14px", background: "rgba(74,159,212,0.08)", borderRadius: 10, fontSize: 13, color: "#4a9fd4", lineHeight: 1.5 }}>
                  <Package size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                  Menunggu barang dari customer. Scan QR di atas ketika barang tiba.
                </div>
              ) : (
                <div className="adm-pa-actions">
                  <p style={{ fontSize: 12.5, color: "#888", marginBottom: 10 }}>
                    Tinjau e-receipt dan monitoring sebelum mengambil keputusan.
                  </p>
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
                        patchReturn(ret.id, { status: "approved" });
                      },
                    })}
                  >
                    <IcCheck /> Setujui Return
                  </button>
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
        verificationHint="Kode OTP telah dikirim ke email admin."
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

export default Returns;
