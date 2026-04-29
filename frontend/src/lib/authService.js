// ─────────────────────────────────────────────────────────────
//  CareOfYou — Auth Service (pure functions, no React)
//  Login, OTP, device trust, session logic.
//  Semua fungsi ini hanya terima data sebagai argumen —
//  tidak ada side effect, tidak ada localStorage langsung.
//  State management ada di MockDataContext.
// ─────────────────────────────────────────────────────────────

import { SEED_OTP_CODES } from "../data/seeds.js";

// Pool IP dummy untuk simulasi variasi jaringan
const MOCK_IP_POOL = [
  "192.168.1.101",
  "192.168.1.102",
  "192.168.1.110",
  "10.0.0.55",
  "203.0.113.45",
  "198.51.100.22",
];

// IP yang "biasa" untuk admin (subnet sama)
const ADMIN_HOME_IPS = ["192.168.1.101", "192.168.1.102", "192.168.1.110"];

export function getMockIp(userId) {
  if (userId === "USR-001") {
    // 80% chance admin di jaringan biasa, 20% di jaringan berbeda
    return Math.random() < 0.8
      ? ADMIN_HOME_IPS[Math.floor(Math.random() * ADMIN_HOME_IPS.length)]
      : MOCK_IP_POOL[Math.floor(Math.random() * MOCK_IP_POOL.length)];
  }
  return MOCK_IP_POOL[Math.floor(Math.random() * MOCK_IP_POOL.length)];
}

// Fingerprint berbasis browser — simplified mock
export function getMockFingerprint() {
  try {
    const raw = [
      navigator.userAgent,
      navigator.language,
      String(screen.width),
      String(screen.height),
    ].join("|");
    // btoa hasil → potong 20 karakter alphanumerik
    return "fp_" + btoa(raw).replace(/[^a-z0-9]/gi, "").slice(0, 20);
  } catch (_) {
    return "fp_fallback_" + Math.random().toString(36).slice(2, 12);
  }
}

// ── Similarity helpers ────────────────────────────────────────

// Kesamaan karakter antar dua string (0–100)
export function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 100;
  const len = Math.max(a.length, b.length);
  let match = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) match++;
  }
  return Math.round((match / len) * 100);
}

// Kesamaan subnet IP (bandingkan 3 oktet pertama)
export function subnetSimilarity(ip1, ip2) {
  if (!ip1 || !ip2) return 0;
  if (ip1 === ip2) return 97 + Math.floor(Math.random() * 3);
  const a = ip1.split(".");
  const b = ip2.split(".");
  let matching = 0;
  for (let i = 0; i < 3; i++) {
    if (a[i] === b[i]) matching++;
  }
  if (matching === 3) return 90 + Math.floor(Math.random() * 8);
  if (matching === 2) return 50 + Math.floor(Math.random() * 20);
  if (matching === 1) return 20 + Math.floor(Math.random() * 15);
  return 5 + Math.floor(Math.random() * 10);
}

// ── Core Auth Functions ───────────────────────────────────────

/**
 * Validasi email + password terhadap daftar users.
 * Return: { valid, reason, user, newFailCount?, willLock? }
 */
export function validateCredentials(email, password, users) {
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return { valid: false, reason: "user_not_found", user: null };
  }

  // Cek account lock
  if (
    user.lockedUntil &&
    new Date() < new Date(user.lockedUntil)
  ) {
    return {
      valid: false,
      reason: "account_locked",
      user,
      lockedUntil: user.lockedUntil,
    };
  }

  if (user.status === "suspended") {
    return { valid: false, reason: "account_suspended", user };
  }

  if (user.password !== password) {
    const newFailCount = (user.failedLoginCount ?? 0) + 1;
    const willLock = newFailCount >= 5;
    return {
      valid: false,
      reason: "wrong_password",
      user,
      newFailCount,
      willLock,
    };
  }

  return { valid: true, reason: null, user };
}

/**
 * Cek status kepercayaan device saat ini terhadap daftar trusted devices user.
 * Return: { status: "trusted"|"known-unusual-network"|"new", device, fingerprintSimilarity, subnetSim, uaMatch }
 */
export function checkDeviceTrust(
  userId,
  currentFingerprint,
  currentIp,
  currentUserAgent,
  trustedDevices
) {
  const userDevices = trustedDevices
    .filter((d) => d.userId === userId)
    .sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));

  if (userDevices.length === 0) {
    return {
      status: "new",
      device: null,
      fingerprintSimilarity: 0,
      subnetSim: 0,
      uaMatch: false,
    };
  }

  for (const device of userDevices) {
    const fpSim = stringSimilarity(currentFingerprint, device.fingerprintHash);
    const subnetSim = subnetSimilarity(currentIp, device.lastSeenIp);
    const uaMatch = currentUserAgent === device.userAgent;

    // Trusted: fingerprint sangat mirip DAN subnet sama
    if (fpSim >= 85 && subnetSim >= 80) {
      return {
        status: "trusted",
        device,
        fingerprintSimilarity: fpSim,
        subnetSim,
        uaMatch,
      };
    }

    // Known device tapi jaringan berbeda
    if (fpSim >= 65) {
      return {
        status: "known-unusual-network",
        device,
        fingerprintSimilarity: fpSim,
        subnetSim,
        uaMatch,
      };
    }
  }

  // Tidak cocok dengan device mana pun
  return {
    status: "new",
    device: null,
    fingerprintSimilarity: 0,
    subnetSim: 0,
    uaMatch: false,
  };
}

/**
 * Buat record login attempt baru.
 */
export function buildLoginAttempt(
  userId,
  email,
  role,
  success,
  reason,
  fingerprint,
  ip,
  ua
) {
  return {
    id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: userId ?? null,
    email,
    role: role ?? "unknown",
    success,
    timestamp: new Date().toISOString(),
    ipAddress: ip ?? getMockIp(userId),
    userAgent: ua ?? navigator.userAgent,
    deviceFingerprint: fingerprint ?? getMockFingerprint(),
    reason,
  };
}

// ── OTP Functions ─────────────────────────────────────────────

/**
 * Generate OTP record baru untuk userId.
 * Admin selalu dapat 123456, customer dapat 111111 (atau sesuai SEED_OTP_CODES).
 */
export function generateOtpRecord(userId, options = {}) {
  const { purpose = "login", metadata = {} } = options;
  const code = SEED_OTP_CODES[userId] ??
    String(Math.floor(100000 + Math.random() * 900000));

  return {
    id: `OTP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    purpose,
    metadata,
    code,
    requestedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60000).toISOString(), // 5 menit
    attempts: 0,
    resendCount: 0,
    status: "pending", // pending | verified | failed | expired
  };
}

/**
 * Verifikasi kode OTP yang diinput user.
 * Return: { success, reason, record, updatedRecord? }
 */
export function verifyOtpRecord(userId, inputCode, otpRecords, options = {}) {
  const { purpose } = options;
  // Ambil OTP terbaru yang masih pending
  const record = [...otpRecords]
    .filter(
      (r) =>
        r.userId === userId &&
        r.status === "pending" &&
        (!purpose || r.purpose === purpose)
    )
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))[0];

  if (!record) {
    return { success: false, reason: "no_pending_otp", record: null };
  }

  if (new Date() > new Date(record.expiresAt)) {
    const updatedRecord = { ...record, status: "expired" };
    return { success: false, reason: "otp_expired", record, updatedRecord };
  }

  const newAttempts = record.attempts + 1;

  if (newAttempts > 3) {
    const updatedRecord = { ...record, attempts: newAttempts, status: "failed" };
    return { success: false, reason: "otp_max_attempts", record, updatedRecord };
  }

  if (inputCode !== record.code) {
    const isFailed = newAttempts >= 3;
    const updatedRecord = {
      ...record,
      attempts: newAttempts,
      status: isFailed ? "failed" : "pending",
    };
    return { success: false, reason: "otp_wrong_code", record, updatedRecord };
  }

  const updatedRecord = { ...record, status: "verified", attempts: newAttempts };
  return { success: true, reason: null, record, updatedRecord };
}

/**
 * Tandai OTP terakhir user sebagai "resent" dan buat record baru.
 * Dipakai ketika user minta resend OTP.
 */
export function resendOtpRecord(userId, otpRecords, options = {}) {
  const { purpose } = options;
  // Expire OTP lama
  const expiredRecords = otpRecords.map((r) =>
    r.userId === userId &&
    r.status === "pending" &&
    (!purpose || r.purpose === purpose)
      ? { ...r, status: "expired" }
      : r
  );

  const newRecord = generateOtpRecord(userId, options);
  // Track berapa kali sudah resend
  const prevResends = otpRecords
    .filter((r) => r.userId === userId && (!purpose || r.purpose === purpose))
    .reduce((max, r) => Math.max(max, r.resendCount ?? 0), 0);
  newRecord.resendCount = prevResends + 1;

  return { expiredRecords, newRecord };
}
