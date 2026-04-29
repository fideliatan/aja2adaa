import { useEffect, useRef, useState } from "react";

const STEP_UP_OTP_CODE = "123456";
const OTP_LENGTH = 6;
const createOtpDigits = () => Array(OTP_LENGTH).fill("");

const RISK_LEVEL_META = {
  low: {
    label: "Risiko Rendah",
    color: "#15803d",
    bg: "rgba(34,197,94,0.1)",
    stroke: "#22c55e",
  },
  medium: {
    label: "Risiko Sedang",
    color: "#b45309",
    bg: "rgba(245,158,11,0.12)",
    stroke: "#f59e0b",
  },
  high: {
    label: "Risiko Tinggi",
    color: "#b91c1c",
    bg: "rgba(239,68,68,0.12)",
    stroke: "#ef4444",
  },
};

const SESSION_ACCESS_META = {
  "Normal Access": "adm-session-chip--low",
  "Semi-Trusted": "adm-session-chip--medium",
  "High Risk": "adm-session-chip--high",
  "OTP Required": "adm-session-chip--high",
};

const DEVICE_TRUST_META = {
  trusted: { label: "Perangkat Terpercaya", className: "adm-device-badge--trusted" },
  "semi-trusted": { label: "Dikenal, Jaringan Tidak Biasa", className: "adm-device-badge--semi" },
  new: { label: "Perangkat Tidak Dikenal", className: "adm-device-badge--new" },
};

const FLAG_SEVERITY_META = {
  low: { label: "Rendah", className: "adm-risk-badge--low" },
  medium: { label: "Sedang", className: "adm-risk-badge--medium" },
  high: { label: "Tinggi", className: "adm-risk-badge--high" },
};

const FLAG_STATUS_META = {
  open: { label: "Terbuka", className: "adm-risk-badge--open" },
  reviewed: { label: "Ditinjau", className: "adm-risk-badge--reviewed" },
  resolved: { label: "Diselesaikan", className: "adm-risk-badge--resolved" },
};

const summaryCardCopy = [
  {
    key: "totalFlaggedCases",
    label: "Total Kasus Ditandai",
    sub: "case dengan signal fraud aktif",
    icon: "flag",
  },
  {
    key: "highRiskCases",
    label: "Kasus Risiko Tinggi",
    sub: "perlu review manual sebelum approve",
    icon: "shield",
  },
  {
    key: "pendingReview",
    label: "Menunggu Tinjauan",
    sub: "masih punya open flags",
    icon: "clock",
  },
  {
    key: "resolvedFlags",
    label: "Flag Diselesaikan",
    sub: "flag yang sudah ditutup admin",
    icon: "check",
  },
];

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
      <path d="M9.5 12.5l1.75 1.75L14.5 11" />
    </svg>
  );
}

function IconFlag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22V4" />
      <path d="M4 4h10l-1.5 3L14 10H4" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.9 4.1L18 9l-4.1 1.9L12 15l-1.9-4.1L6 9l4.1-1.9L12 3Z" />
      <path d="M5 19h.01" />
      <path d="M19 19h.01" />
    </svg>
  );
}

function IconLaptop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="11" rx="2" />
      <path d="M2 19h20" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12a9 9 0 0 1 14 0" />
      <path d="M8.5 15.5a4.5 4.5 0 0 1 7 0" />
      <path d="M12 19h.01" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function iconForSummary(kind) {
  switch (kind) {
    case "flag":
      return <IconFlag />;
    case "shield":
      return <IconShield />;
    case "clock":
      return <IconClock />;
    default:
      return <IconCheck />;
  }
}

function iconForEvent(type) {
  switch (type) {
    case "risk":
      return <IconWarning />;
    case "otp":
    case "auth":
    case "step-up":
      return <IconShield />;
    case "device":
      return <IconLaptop />;
    case "network":
      return <IconNetwork />;
    case "action":
      return <IconCheck />;
    default:
      return <IconSpark />;
  }
}

function meterStyle(score, riskLevel) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dash = (clampedScore / 100) * circumference;
  return {
    dash,
    circumference,
    stroke: RISK_LEVEL_META[riskLevel]?.stroke ?? RISK_LEVEL_META.low.stroke,
  };
}

function handleOtpPaste(event, setDigits, focusInput) {
  event.preventDefault();
  const pastedDigits = event.clipboardData
    .getData("text")
    .replace(/\D/g, "")
    .slice(0, OTP_LENGTH)
    .split("");

  if (pastedDigits.length === 0) return;

  const nextDigits = createOtpDigits();
  pastedDigits.forEach((digit, index) => {
    nextDigits[index] = digit;
  });

  setDigits(nextDigits);
  focusInput(Math.min(pastedDigits.length, OTP_LENGTH) - 1);
}

export function CompactRiskIndicator({ summary }) {
  const level = RISK_LEVEL_META[summary.riskLevel] ?? RISK_LEVEL_META.low;
  const openFlags = summary.flags.filter((flag) => flag.status === "open").length;

  return (
    <div className="adm-risk-inline">
      <span className={`adm-risk-inline-pill adm-risk-inline-pill--${summary.riskLevel}`}>
        {summary.riskScore}
        <small>{level.label}</small>
      </span>
      {openFlags > 0 && (
        <span className="adm-risk-inline-note">
          {openFlags} flag open
        </span>
      )}
    </div>
  );
}

export function SessionRiskSummary({ state, compact = false }) {
  return (
    <div className={`adm-session-card${compact ? " adm-session-card--compact" : ""}`}>
      <div className="adm-session-card-head">
        <div className="adm-session-card-icon">
          <IconLock />
        </div>
        <div className="adm-session-card-copy">
          <div className="adm-session-card-top">
            <span className={`adm-session-chip ${SESSION_ACCESS_META[state.accessState] ?? "adm-session-chip--low"}`}>
              {state.accessState}
            </span>
            {state.otpRequired && (
              <span className="adm-session-mini-chip">OTP Required</span>
            )}
          </div>
          <p className="adm-session-card-title">Risk-Based Authentication</p>
          <p className="adm-session-card-sub">
            {state.deviceStatus === "trusted"
              ? "Sesi saat ini cocok dengan trusted device baseline."
              : state.deviceStatus === "known-unusual-network"
                ? "Perangkat dikenal, tetapi ada pergeseran jaringan."
                : "Perangkat belum dikenali. Verifikasi tambahan disarankan."}
          </p>
        </div>
      </div>

      <div className="adm-session-reasons">
        {state.reasons.slice(0, compact ? 2 : state.reasons.length).map((reason) => (
          <div key={reason} className="adm-session-reason-item">
            <span className="adm-session-reason-dot" />
            <span>{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrustedDeviceCard({ device, compact = false }) {
  const trustMeta = DEVICE_TRUST_META[device.trustLevel] ?? DEVICE_TRUST_META.trusted;

  return (
    <div className={`adm-device-card${compact ? " adm-device-card--compact" : ""}`}>
      <div className="adm-device-top">
        <div>
          <div className="adm-device-head-row">
            <span className={`adm-device-badge ${trustMeta.className}`}>{trustMeta.label}</span>
            {device.verificationRequired && (
              <span className="adm-session-mini-chip">Extra verification</span>
            )}
          </div>
          <p className="adm-device-title">{device.deviceLabel}</p>
          <p className="adm-device-meta">{device.browser} · {device.os}</p>
        </div>
        <div className="adm-device-icon">
          <IconLaptop />
        </div>
      </div>

      <div className="adm-device-detail-row">
        <span>Terakhir aktif</span>
        <strong>{device.lastSeen}</strong>
      </div>
      <div className="adm-device-detail-row">
        <span>Verifikasi</span>
        <strong>{device.verificationStatus}</strong>
      </div>

      {!compact && (
        <div className="adm-device-metrics">
          <div className="adm-device-metric">
            <span>Token match</span>
            <strong>{device.trustedDeviceTokenMatch ? "Ya" : "Tidak"}</strong>
          </div>
          <div className="adm-device-metric">
            <span>Fingerprint</span>
            <strong>{device.fingerprintSimilarity}%</strong>
          </div>
          <div className="adm-device-metric">
            <span>User agent</span>
            <strong>{device.userAgentMatch ? "Cocok" : "Tidak Cocok"}</strong>
          </div>
          <div className="adm-device-metric">
            <span>Subnet</span>
            <strong>{device.subnetSimilarity}%</strong>
          </div>
        </div>
      )}

      <div className="adm-device-reasons">
        {device.reasons.slice(0, compact ? 1 : device.reasons.length).map((reason) => (
          <div key={reason} className="adm-device-reason-item">
            <span className="adm-device-reason-dot" />
            <span>{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RiskScoreCard({ summary, compact = false }) {
  const level = RISK_LEVEL_META[summary.riskLevel] ?? RISK_LEVEL_META.low;
  const topReasons = [...summary.breakdown]
    .sort((left, right) => right.scoreImpact - left.scoreImpact)
    .slice(0, compact ? 2 : 4);
  const meter = meterStyle(summary.riskScore, summary.riskLevel);

  return (
    <div className={`adm-risk-score-card${compact ? " adm-risk-score-card--compact" : ""}`}>
      <div className="adm-risk-score-meter">
        <svg width="86" height="86" viewBox="0 0 86 86" className="adm-risk-meter-svg">
          <circle cx="43" cy="43" r="30" className="adm-risk-meter-track" />
          <circle
            cx="43"
            cy="43"
            r="30"
            className="adm-risk-meter-value"
            style={{
              stroke: meter.stroke,
              strokeDasharray: `${meter.dash} ${meter.circumference}`,
            }}
          />
        </svg>
        <div className="adm-risk-score-text">
          <strong>{summary.riskScore}</strong>
          <span>/100</span>
        </div>
      </div>

      <div className="adm-risk-score-copy">
        <div className="adm-risk-score-head">
          <span className={`adm-risk-level-badge adm-risk-level-badge--${summary.riskLevel}`}>
            {level.label}
          </span>
          <p className="adm-risk-score-title">Skor Risiko / Fraud</p>
        </div>
        <p className="adm-risk-score-sub">
          {summary.recommendedAction}
        </p>
        <div className="adm-risk-reason-list">
          {topReasons.map((item) => (
            <div key={item.label} className="adm-risk-reason-item">
              <span className="adm-risk-reason-impact">+{item.scoreImpact}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RiskFlagList({ flags, onResolveFlag }) {
  return (
    <div className="adm-card adm-risk-card">
      <div className="adm-card-header">
        <h3 className="adm-card-title">Flag Peringatan</h3>
        <span className="adm-card-tag">{flags.length} item</span>
      </div>

      {flags.length === 0 ? (
        <div className="adm-risk-empty-state">
          <IconCheck />
          <p>Tidak ada warning flag aktif untuk case ini.</p>
        </div>
      ) : (
        <div className="adm-risk-flag-list">
          {flags.map((flag) => {
            const severityMeta = FLAG_SEVERITY_META[flag.severity];
            const statusMeta = FLAG_STATUS_META[flag.status];

            return (
              <div key={flag.id} className={`adm-risk-flag-item adm-risk-flag-item--${flag.severity}`}>
                <div className="adm-risk-flag-top">
                  <div>
                    <p className="adm-risk-flag-title">{flag.title}</p>
                    <p className="adm-risk-flag-code">{flag.ruleCode}</p>
                  </div>
                  <div className="adm-risk-flag-badges">
                    <span className={`adm-risk-badge ${severityMeta.className}`}>{severityMeta.label}</span>
                    <span className={`adm-risk-badge ${statusMeta.className}`}>{statusMeta.label}</span>
                  </div>
                </div>
                <p className="adm-risk-flag-reason">{flag.reason}</p>
                <div className="adm-risk-flag-bottom">
                  <p className="adm-risk-flag-time">{flag.createdAt}</p>
                  {onResolveFlag && flag.severity === "high" && flag.status !== "resolved" && (
                    <button
                      type="button"
                      className="adm-risk-flag-action"
                      onClick={() => onResolveFlag(flag)}
                    >
                      Selesaikan Flag
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RiskBreakdownCard({ summary }) {
  return (
    <div className="adm-card adm-risk-card">
      <div className="adm-card-header">
        <h3 className="adm-card-title">Mengapa Case Ini Ditandai</h3>
        <span className="adm-card-tag">{summary.breakdown.length} faktor</span>
      </div>

      <div className="adm-risk-breakdown-list">
        {summary.breakdown.map((item) => (
          <div key={item.label} className="adm-risk-breakdown-item">
            <span className="adm-risk-breakdown-impact">+{item.scoreImpact}</span>
            <span className="adm-risk-breakdown-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SecurityTimeline({ timeline }) {
  return (
    <div className="adm-card adm-risk-card">
      <div className="adm-card-header">
        <h3 className="adm-card-title">Riwayat Aktivitas Keamanan</h3>
        <span className="adm-card-tag">{timeline.length} event</span>
      </div>

      <div className="adm-risk-timeline">
        {timeline.map((event, index) => (
          <div key={event.id} className="adm-risk-timeline-item">
            <div className={`adm-risk-timeline-icon adm-risk-timeline-icon--${event.status ?? "neutral"}`}>
              {iconForEvent(event.type)}
            </div>
            {index < timeline.length - 1 && <span className="adm-risk-timeline-line" />}
            <div className="adm-risk-timeline-copy">
              <p className="adm-risk-timeline-label">{event.label}</p>
              <p className="adm-risk-timeline-time">{event.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonitoringSummaryCards({ summary }) {
  return (
    <div className="adm-monitor-grid">
      {summaryCardCopy.map((item) => (
        <div key={item.key} className="adm-monitor-card">
          <div className="adm-monitor-card-top">
            <span className="adm-monitor-card-icon">{iconForSummary(item.icon)}</span>
            <span className="adm-monitor-card-value">{summary[item.key]}</span>
          </div>
          <p className="adm-monitor-card-label">{item.label}</p>
          <p className="adm-monitor-card-sub">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}

export function CaseRiskPanel({ summary, entityLabel, onResolveFlag }) {
  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Pemantauan Risiko</h2>
          <p className="adm-section-sub">
            Decision support untuk {entityLabel}. Gunakan insight ini sebelum approve atau reject case.
          </p>
        </div>
      </div>

      <div className="adm-risk-panel-grid">
        <div className="adm-card adm-risk-card adm-risk-card--hero">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Ringkasan Keputusan</h3>
            <span className="adm-card-tag">{summary.entityType}</span>
          </div>
          <RiskScoreCard summary={summary} />
        </div>

        <div className="adm-card adm-risk-card adm-risk-card--recommend">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Aksi yang Direkomendasikan</h3>
          </div>
          <div className="adm-risk-recommend-box">
            <span className={`adm-risk-level-badge adm-risk-level-badge--${summary.riskLevel}`}>
              {RISK_LEVEL_META[summary.riskLevel]?.label ?? "Risiko"}
            </span>
            <p className="adm-risk-recommend-copy">{summary.recommendedAction}</p>
          </div>
        </div>
      </div>

      <div className="adm-security-grid">
        <div className="adm-card adm-risk-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Ringkasan Risiko Sesi</h3>
          </div>
          <SessionRiskSummary state={summary.sessionRiskState} />
        </div>

        <div className="adm-card adm-risk-card">
          <div className="adm-card-header">
            <h3 className="adm-card-title">Status Perangkat Terpercaya</h3>
          </div>
          <TrustedDeviceCard device={summary.trustedDeviceStatus} />
        </div>
      </div>

      <div className="adm-risk-detail-grid">
        <RiskFlagList flags={summary.flags} onResolveFlag={onResolveFlag} />
        <RiskBreakdownCard summary={summary} />
      </div>

      <SecurityTimeline timeline={summary.timeline} />
    </div>
  );
}

export function StepUpVerificationModal({
  open,
  actionLabel,
  caseId,
  reasons,
  helperText,
  verificationHint,
  onVerifyCode,
  onClose,
  onSuccess,
}) {
  const inputsRef = useRef([]);
  const [digits, setDigits] = useState(createOtpDigits);
  const [status, setStatus] = useState("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setDigits(createOtpDigits());
      setStatus("form");
      setError("");
      return;
    }

    window.requestAnimationFrame(() => inputsRef.current[0]?.focus());
  }, [open]);

  const focusInput = (index) => {
    inputsRef.current[index]?.focus();
    inputsRef.current[index]?.select?.();
  };

  const handleDigitChange = (value, index) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);
    setError("");

    if (digit && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const nextDigits = [...digits];

      if (nextDigits[index]) {
        nextDigits[index] = "";
        setDigits(nextDigits);
        return;
      }

      if (index > 0) {
        nextDigits[index - 1] = "";
        setDigits(nextDigits);
        focusInput(index - 1);
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const code = digits.join("");

    if (code.length !== OTP_LENGTH) {
      setError("Masukkan 6 digit kode verifikasi terlebih dahulu.");
      return;
    }

    setStatus("loading");
    setError("");

    window.setTimeout(() => {
      const result = onVerifyCode
        ? onVerifyCode(code)
        : {
            success: code === STEP_UP_OTP_CODE,
          };

      if (result?.success) {
        setStatus("success");
        window.setTimeout(() => {
          onSuccess?.();
        }, 650);
        return;
      }

      setStatus("form");
      setDigits(createOtpDigits());
      setError(
        result?.reason === "otp_expired"
          ? "OTP sudah kedaluwarsa. Minta kode baru lalu coba lagi."
          : "Kode verifikasi tidak valid. Silakan coba lagi."
      );
      window.requestAnimationFrame(() => inputsRef.current[0]?.focus());
    }, 850);
  };

  if (!open) return null;

  return (
    <div className="adm-modal-overlay" onClick={status !== "loading" ? onClose : undefined}>
      <div className="adm-modal adm-stepup-modal" onClick={(event) => event.stopPropagation()}>
        {status === "form" && (
          <>
            <div className="adm-modal-header">
              <h3>Verifikasi Step-Up</h3>
              <button className="adm-modal-close" onClick={onClose}>✕</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-stepup-banner">
                <div className="adm-stepup-banner-icon">
                  <IconShield />
                </div>
                <div>
                  <p className="adm-stepup-banner-title">{actionLabel}</p>
                  <p className="adm-stepup-banner-sub">
                    {caseId ? `Case ${caseId}` : "Aksi sensitif"} memerlukan verifikasi tambahan sebelum diproses.
                  </p>
                </div>
              </div>

              <div className="adm-stepup-reason-box">
                {reasons.map((reason) => (
                  <div key={reason} className="adm-stepup-reason-item">
                    <span className="adm-stepup-reason-dot" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              <p className="adm-stepup-helper">{helperText}</p>
              {verificationHint && (
                <p className="adm-stepup-helper" style={{ marginTop: 8 }}>
                  {verificationHint}
                </p>
              )}

              <form className="adm-stepup-form" onSubmit={handleSubmit}>
                <div className="adm-stepup-otp-row">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputsRef.current[index] = element;
                      }}
                      className="adm-stepup-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => handleDigitChange(event.target.value, index)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onPaste={(event) => handleOtpPaste(event, setDigits, focusInput)}
                      aria-label={`Digit verifikasi ${index + 1}`}
                    />
                  ))}
                </div>

                {error && <p className="adm-stepup-error">{error}</p>}

                <div className="adm-modal-footer">
                  <button type="submit" className="adm-pa-approve-btn">
                    <IconShield /> Verifikasi Aksi
                  </button>
                  <button type="button" className="adm-ghost-btn" onClick={onClose}>
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {status === "loading" && (
          <div className="adm-modal-center">
            <div className="adm-modal-spinner" />
            <p className="adm-modal-loading-title">Memverifikasi step-up challenge…</p>
            <p className="adm-modal-loading-sub">Menyocokkan OTP dengan session keamanan saat ini</p>
          </div>
        )}

        {status === "success" && (
          <div className="adm-modal-center">
            <div className="adm-modal-success-icon"><IconCheck /></div>
            <h3 className="adm-modal-success-title">Verifikasi Berhasil</h3>
            <p className="adm-modal-success-sub">Aksi sensitif sudah diverifikasi dan siap dijalankan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
