// ─────────────────────────────────────────────────────────────
//  CareOfYou — localStorage Manager
//  Semua akses localStorage lewat sini.
//  Nanti kalau mau ganti ke API, ganti implementasi di sini saja.
// ─────────────────────────────────────────────────────────────

// Key registry — satu tempat untuk semua storage keys
export const KEYS = {
  USERS:             "coy_users_v1",
  SESSION:           "coy_session_v1",
  OTP_RECORDS:       "coy_otp_v1",
  LOGIN_ATTEMPTS:    "coy_login_attempts_v1",
  TRUSTED_DEVICES:   "coy_trusted_devices_v1",
  MONITORING_FLAGS:  "coy_flags_v1",
  ACTIVITY_TIMELINE: "coy_timeline_v1",
  ORDERS:            "coy_orders_v2",   // key lama dipertahankan
  RETURNS:           "coy_returns_v1",  // key lama dipertahankan
};

// Baca dari localStorage, fallback ke seed jika belum ada
export function loadFromStorage(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (_) {}
  // Deep clone seed supaya mutasi tidak mengubah original
  return JSON.parse(JSON.stringify(seed == null ? null : seed));
}

// Simpan ke localStorage
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
}

// Hapus satu key
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

// Reset satu key ke seed value-nya
export function resetStorage(key, seed) {
  const fresh = JSON.parse(JSON.stringify(seed == null ? null : seed));
  saveToStorage(key, fresh);
  return fresh;
}

// Reset semua key sekaligus
// seedMap: { USERS: [...], SESSION: null, ORDERS: [...], ... }
export function resetAllStorage(seedMap) {
  Object.entries(seedMap).forEach(([keyName, seed]) => {
    const storageKey = KEYS[keyName];
    if (storageKey) resetStorage(storageKey, seed);
  });
}

// ── Migration helper (dipakai OrderContext) ────────────────────
// Bersihkan placeholder lama dari format storage sebelumnya
export function migrateOrders(orders) {
  return orders.map((o) => ({
    ...o,
    paymentProof:  o.paymentProof  === "__img__" ? null : o.paymentProof,
    deliveryProof: o.deliveryProof === "__img__" ? null : o.deliveryProof,
  }));
}
