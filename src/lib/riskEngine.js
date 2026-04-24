// ─────────────────────────────────────────────────────────────
//  CareOfYou — Risk Engine (pure functions, no React)
//  Hitung risk score, generate flags, buat timeline events.
//  Semua fungsi murni — terima data, return hasil.
// ─────────────────────────────────────────────────────────────

// ── Score weights per rule ─────────────────────────────────────
export const RISK_WEIGHTS = {
  REPEATED_FAILED_LOGIN:       20,
  MULTIPLE_FAILED_LOGIN_HIST:  12,
  NEW_DEVICE_DETECTED:         15,
  KNOWN_DEVICE_UNUSUAL_NETWORK: 10,
  MULTIPLE_ORDERS_SHORT_TIME:  25,
  REPEATED_RETURN_REQUEST:     30,
  OTP_RETRY_ABUSE:             15,
  SHARED_IP_ANOMALY:           20,
};

// ── Risk level thresholds ──────────────────────────────────────
export function riskLevelFromScore(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ── Helpers ───────────────────────────────────────────────────

function failedLoginsForUser(userId, loginAttempts) {
  return loginAttempts.filter((a) => a.userId === userId && !a.success);
}

function recentFailedLogins(userId, loginAttempts, windowMs = 30 * 60000) {
  const cutoff = Date.now() - windowMs;
  return loginAttempts.filter(
    (a) =>
      a.userId === userId &&
      !a.success &&
      new Date(a.timestamp).getTime() > cutoff
  );
}

function otpResendAbuse(userId, otpRecords, threshold = 2) {
  const maxResend = otpRecords
    .filter((r) => r.userId === userId)
    .reduce((max, r) => Math.max(max, r.resendCount ?? 0), 0);
  return maxResend >= threshold;
}

// ── Per-entity risk computation ───────────────────────────────

/**
 * Hitung risk score untuk sebuah akun (bukan per-order/return).
 */
export function computeUserRisk(userId, loginAttempts, deviceStatus) {
  const breakdown = [];
  let score = 0;

  const recentFails = recentFailedLogins(userId, loginAttempts);
  const totalFails  = failedLoginsForUser(userId, loginAttempts);

  if (recentFails.length >= 3) {
    score += RISK_WEIGHTS.REPEATED_FAILED_LOGIN;
    breakdown.push({
      label: "Repeated failed login",
      scoreImpact: RISK_WEIGHTS.REPEATED_FAILED_LOGIN,
      ruleCode: "RISK-LOGIN-FAIL",
    });
  } else if (totalFails.length >= 3) {
    score += RISK_WEIGHTS.MULTIPLE_FAILED_LOGIN_HIST;
    breakdown.push({
      label: "Multiple failed logins (historical)",
      scoreImpact: RISK_WEIGHTS.MULTIPLE_FAILED_LOGIN_HIST,
      ruleCode: "RISK-LOGIN-FAIL",
    });
  }

  if (deviceStatus === "new") {
    score += RISK_WEIGHTS.NEW_DEVICE_DETECTED;
    breakdown.push({
      label: "New device detected",
      scoreImpact: RISK_WEIGHTS.NEW_DEVICE_DETECTED,
      ruleCode: "RISK-DEVICE-NEW",
    });
  } else if (deviceStatus === "known-unusual-network") {
    score += RISK_WEIGHTS.KNOWN_DEVICE_UNUSUAL_NETWORK;
    breakdown.push({
      label: "Known device but unusual network",
      scoreImpact: RISK_WEIGHTS.KNOWN_DEVICE_UNUSUAL_NETWORK,
      ruleCode: "RISK-DEVICE-NET",
    });
  }

  const clamped = Math.min(score, 100);
  return { score: clamped, level: riskLevelFromScore(clamped), breakdown };
}

/**
 * Hitung risk score untuk sebuah order.
 */
export function computeOrderRisk(
  orderId,
  customerId,
  orders,
  loginAttempts,
  otpRecords,
  deviceStatus
) {
  const breakdown = [];
  let score = 0;

  // Banyak order dari user yang sama
  const userOrders = orders.filter((o) => o.customerId === customerId);
  if (userOrders.length >= 3) {
    score += RISK_WEIGHTS.MULTIPLE_ORDERS_SHORT_TIME;
    breakdown.push({
      label: "Multiple orders in short time",
      scoreImpact: RISK_WEIGHTS.MULTIPLE_ORDERS_SHORT_TIME,
      ruleCode: "RISK-ORDER-BURST",
    });
  }

  // Failed login
  const recentFails = recentFailedLogins(customerId, loginAttempts);
  const totalFails  = failedLoginsForUser(customerId, loginAttempts);

  if (recentFails.length >= 3) {
    score += RISK_WEIGHTS.REPEATED_FAILED_LOGIN;
    breakdown.push({
      label: "Repeated failed login",
      scoreImpact: RISK_WEIGHTS.REPEATED_FAILED_LOGIN,
      ruleCode: "RISK-LOGIN-FAIL",
    });
  } else if (totalFails.length >= 3) {
    score += RISK_WEIGHTS.MULTIPLE_FAILED_LOGIN_HIST;
    breakdown.push({
      label: "Multiple failed logins on account",
      scoreImpact: RISK_WEIGHTS.MULTIPLE_FAILED_LOGIN_HIST,
      ruleCode: "RISK-LOGIN-FAIL",
    });
  }

  // OTP abuse
  if (otpResendAbuse(customerId, otpRecords)) {
    score += RISK_WEIGHTS.OTP_RETRY_ABUSE;
    breakdown.push({
      label: "OTP retry abuse",
      scoreImpact: RISK_WEIGHTS.OTP_RETRY_ABUSE,
      ruleCode: "RISK-OTP-ABUSE",
    });
  }

  // Device
  if (deviceStatus === "new") {
    score += RISK_WEIGHTS.NEW_DEVICE_DETECTED;
    breakdown.push({
      label: "New device detected",
      scoreImpact: RISK_WEIGHTS.NEW_DEVICE_DETECTED,
      ruleCode: "RISK-DEVICE-NEW",
    });
  } else if (deviceStatus === "known-unusual-network") {
    score += RISK_WEIGHTS.KNOWN_DEVICE_UNUSUAL_NETWORK;
    breakdown.push({
      label: "Known device but unusual network",
      scoreImpact: RISK_WEIGHTS.KNOWN_DEVICE_UNUSUAL_NETWORK,
      ruleCode: "RISK-DEVICE-NET",
    });
  }

  const clamped = Math.min(score, 100);
  return { score: clamped, level: riskLevelFromScore(clamped), breakdown };
}

/**
 * Hitung risk score untuk sebuah return request.
 */
export function computeReturnRisk(
  returnId,
  customerId,
  returns,
  loginAttempts,
  otpRecords,
  deviceStatus
) {
  const breakdown = [];
  let score = 0;

  const userReturns = returns.filter(
    (r) => r.customerId === customerId || r.customer === customerId
  );
  if (userReturns.length >= 2) {
    score += RISK_WEIGHTS.REPEATED_RETURN_REQUEST;
    breakdown.push({
      label: "Repeated return request",
      scoreImpact: RISK_WEIGHTS.REPEATED_RETURN_REQUEST,
      ruleCode: "RISK-RETURN-REPEAT",
    });
  }

  const totalFails = failedLoginsForUser(customerId, loginAttempts);
  if (totalFails.length >= 3) {
    const impact = Math.round(RISK_WEIGHTS.REPEATED_FAILED_LOGIN * 0.5);
    score += impact;
    breakdown.push({
      label: "Multiple failed logins on account",
      scoreImpact: impact,
      ruleCode: "RISK-LOGIN-FAIL",
    });
  }

  if (otpResendAbuse(customerId, otpRecords)) {
    score += RISK_WEIGHTS.OTP_RETRY_ABUSE;
    breakdown.push({
      label: "OTP retry abuse",
      scoreImpact: RISK_WEIGHTS.OTP_RETRY_ABUSE,
      ruleCode: "RISK-OTP-ABUSE",
    });
  }

  if (deviceStatus === "new") {
    score += RISK_WEIGHTS.NEW_DEVICE_DETECTED;
    breakdown.push({
      label: "New device detected",
      scoreImpact: RISK_WEIGHTS.NEW_DEVICE_DETECTED,
      ruleCode: "RISK-DEVICE-NEW",
    });
  } else if (deviceStatus === "known-unusual-network") {
    score += RISK_WEIGHTS.KNOWN_DEVICE_UNUSUAL_NETWORK;
    breakdown.push({
      label: "Known device but unusual network",
      scoreImpact: RISK_WEIGHTS.KNOWN_DEVICE_UNUSUAL_NETWORK,
      ruleCode: "RISK-DEVICE-NET",
    });
  }

  const clamped = Math.min(score, 100);
  return { score: clamped, level: riskLevelFromScore(clamped), breakdown };
}

// ── Flag & Timeline builders ───────────────────────────────────

/**
 * Generate monitoring flags dari hasil risk breakdown.
 */
export function generateFlagsFromBreakdown(entityType, entityId, breakdown) {
  const now = new Date().toISOString();
  return breakdown.map((item) => ({
    id: `FLAG-DYN-${entityId}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    entityType,
    entityId,
    ruleCode: item.ruleCode ?? "RISK-GENERIC",
    title: item.label,
    severity: item.scoreImpact >= 25 ? "high"
            : item.scoreImpact >= 15 ? "medium"
            : "low",
    status: "open",
    reason: `Terdeteksi dari analisis realtime: ${item.label}`,
    createdAt: now,
  }));
}

/**
 * Buat timeline event baru.
 */
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

/**
 * Recommended action text berdasarkan risk level.
 */
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
