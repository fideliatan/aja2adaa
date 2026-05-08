// ─────────────────────────────────────────────────────────────
//  CareOfYou — Risk Engine (pure functions, no React)
//  Hitung risk score dari data log. Tidak disimpan di DB.
// ─────────────────────────────────────────────────────────────

const THREE_DAYS_MS  = 3 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS     = 24 * 60 * 60 * 1000;
const HIGH_VALUE_IDR = 500_000;

export function riskLevelFromScore(score) {
  if (score >= 35) return "high";
  if (score >= 15) return "medium";
  return "low";
}

// ── Internal helpers ──────────────────────────────────────────

function recentFailedLogins(userId, loginAttempts) {
  const cutoff = Date.now() - THREE_DAYS_MS;
  return loginAttempts.filter(
    (a) =>
      (a.userId === userId || a.user_id === userId) &&
      !a.success &&
      new Date(a.timestamp).getTime() > cutoff
  );
}

function recentOtpFails(userId, activityTimeline) {
  const cutoff = Date.now() - THREE_DAYS_MS;
  return activityTimeline.filter(
    (e) =>
      e.eventType === "otp_failed" &&
      (e.actorId === userId || e.metadata?.userId === userId) &&
      new Date(e.timestamp).getTime() > cutoff
  );
}

function recentOrdersForCustomer(customerId, orders) {
  const cutoff = Date.now() - THREE_DAYS_MS;
  return orders.filter(
    (o) =>
      o.customerId === customerId &&
      new Date(o.createdAt).getTime() > cutoff
  );
}

function recentReturnsForCustomer(customerId, returns) {
  const cutoff = Date.now() - THREE_DAYS_MS;
  return returns.filter(
    (r) =>
      (r.customerId === customerId || r.customer === customerId) &&
      new Date(r.createdAt).getTime() > cutoff
  );
}

// ── User-level risk signals (reused across all three functions) ─

function addUserSignals(breakdown, score, userId, loginAttempts, deviceStatus, activityTimeline) {
  const failedLogins = recentFailedLogins(userId, loginAttempts);
  if (failedLogins.length > 0) {
    const impact = Math.min(failedLogins.length * 3, 15);
    score += impact;
    breakdown.push({
      label: `${failedLogins.length} failed login attempt${failedLogins.length > 1 ? "s" : ""} (last 3 days)`,
      scoreImpact: impact,
      ruleCode: "RISK-LOGIN-FAIL",
    });
  }

  const otpFails = recentOtpFails(userId, activityTimeline);
  if (otpFails.length > 0) {
    const impact = Math.min(otpFails.length * 5, 20);
    score += impact;
    breakdown.push({
      label: `${otpFails.length} OTP failure${otpFails.length > 1 ? "s" : ""} (last 3 days)`,
      scoreImpact: impact,
      ruleCode: "RISK-OTP-FAIL",
    });
  }

  if (deviceStatus === "new") {
    score += 15;
    breakdown.push({
      label: "New / unrecognized device",
      scoreImpact: 15,
      ruleCode: "RISK-DEVICE-NEW",
    });
  }

  return score;
}

function addNewAccountSignal(breakdown, score, customerId, users, label) {
  const user = users.find((u) => u.id === customerId);
  if (user && Date.now() - new Date(user.createdAt).getTime() < ONE_DAY_MS) {
    score += 10;
    breakdown.push({ label, scoreImpact: 10, ruleCode: "RISK-NEW-ACCOUNT" });
  }
  return score;
}

// ── Per-entity risk computation ───────────────────────────────

export function computeUserRisk(userId, loginAttempts, deviceStatus, activityTimeline = []) {
  const breakdown = [];
  let score = 0;

  score = addUserSignals(breakdown, score, userId, loginAttempts, deviceStatus, activityTimeline);

  const clamped = Math.min(score, 100);
  return { score: clamped, level: riskLevelFromScore(clamped), breakdown };
}

export function computeOrderRisk(
  orderId,
  customerId,
  orders,
  loginAttempts,
  _otpRecords,
  deviceStatus,
  activityTimeline = [],
  users = [],
  orderRecord = null
) {
  const breakdown = [];
  let score = 0;

  score = addUserSignals(breakdown, score, customerId, loginAttempts, deviceStatus, activityTimeline);

  const recentOrders = recentOrdersForCustomer(customerId, orders);
  if (recentOrders.length >= 3) {
    score += 12;
    breakdown.push({
      label: `${recentOrders.length} orders placed in last 3 days`,
      scoreImpact: 12,
      ruleCode: "RISK-ORDER-BURST",
    });
  }

  // New account (< 24h) placing an order
  score = addNewAccountSignal(
    breakdown, score, customerId, users,
    "Akun baru (< 24 jam) langsung melakukan order"
  );

  // High-value order from unrecognized device
  if (deviceStatus === "new" && orderRecord && (orderRecord.total ?? 0) > HIGH_VALUE_IDR) {
    score += 10;
    breakdown.push({
      label: `Order nilai tinggi (Rp${Number(orderRecord.total).toLocaleString("id-ID")}) dari perangkat baru`,
      scoreImpact: 10,
      ruleCode: "RISK-HIGH-VALUE-NEW-DEVICE",
    });
  }

  const clamped = Math.min(score, 100);
  return { score: clamped, level: riskLevelFromScore(clamped), breakdown };
}

export function computeReturnRisk(
  returnId,
  customerId,
  returns,
  loginAttempts,
  _otpRecords,
  deviceStatus,
  activityTimeline = [],
  users = [],
  returnRecord = null
) {
  const breakdown = [];
  let score = 0;

  score = addUserSignals(breakdown, score, customerId, loginAttempts, deviceStatus, activityTimeline);

  const recentReturns = recentReturnsForCustomer(customerId, returns);
  if (recentReturns.length >= 2) {
    score += 20;
    breakdown.push({
      label: `${recentReturns.length} return requests in last 3 days`,
      scoreImpact: 20,
      ruleCode: "RISK-RETURN-BURST",
    });
  }

  // New account (< 24h) submitting a return
  score = addNewAccountSignal(
    breakdown, score, customerId, users,
    "Akun baru (< 24 jam) mengajukan return"
  );

  // Return after QR scan failed
  if (returnRecord && returnRecord.qrStatus === "invalid") {
    score += 25;
    breakdown.push({
      label: "Return diajukan setelah QR scan gagal (QR tidak cocok)",
      scoreImpact: 25,
      ruleCode: "RISK-QR-MISMATCH",
    });
  }

  // E-receipt mismatch
  if (returnRecord && returnRecord.monitoringFlag === "E-receipt tidak cocok") {
    score += 25;
    breakdown.push({
      label: "E-receipt yang dilampirkan tidak cocok dengan data order",
      scoreImpact: 25,
      ruleCode: "RISK-RECEIPT-MISMATCH",
    });
  }

  const clamped = Math.min(score, 100);
  return { score: clamped, level: riskLevelFromScore(clamped), breakdown };
}

// ── Flag & Timeline builders ──────────────────────────────────

export function generateFlagsFromBreakdown(entityType, entityId, breakdown) {
  const now = new Date().toISOString();
  return breakdown.map((item) => ({
    id: `FLAG-DYN-${entityId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    entityType,
    entityId,
    ruleCode: item.ruleCode ?? "RISK-GENERIC",
    title: item.label,
    severity: item.scoreImpact >= 20 ? "high"
            : item.scoreImpact >= 12 ? "medium"
            : "low",
    status: "open",
    reason: `Terdeteksi dari analisis realtime: ${item.label}`,
    createdAt: now,
  }));
}

export function buildTimelineEvent(actorId, actorRole, eventType, label, metadata = {}) {
  return {
    id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actorId ?? null,
    actorRole: actorRole ?? null,
    eventType,
    label,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

export function recommendedAction(level) {
  switch (level) {
    case "high":
      return "Tahan approval. Minta step-up verification dan review manual sebelum diproses.";
    case "medium":
      return "Verifikasi identitas dan bukti transfer sebelum approval dilakukan.";
    default:
      return "Lanjutkan approval standar setelah bukti transfer diverifikasi.";
  }
}
