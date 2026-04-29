const clone = (value) => JSON.parse(JSON.stringify(value));

export const KEYS = {
  MOCK_DB: "coy_mock_db_v3",
  USERS: "coy_users_v1",
  SESSION: "coy_session_v1",
  OTP_RECORDS: "coy_otp_v1",
  LOGIN_ATTEMPTS: "coy_login_attempts_v1",
  TRUSTED_DEVICES: "coy_trusted_devices_v1",
  MONITORING_FLAGS: "coy_flags_v1",
  ACTIVITY_TIMELINE: "coy_timeline_v1",
  ORDERS: "coy_orders_v2",
  RETURNS: "coy_returns_v1",
};

function safeParse(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

export function migrateOrders(orders = []) {
  return orders.map((order) => ({
    ...order,
    paymentProof:
      order.paymentProof === "__img__" ? null : order.paymentProof,
    deliveryProof:
      order.deliveryProof === "__img__" ? null : order.deliveryProof,
  }));
}

function buildLegacyMockDatabase(seed) {
  const hasLegacyData = [
    KEYS.USERS,
    KEYS.SESSION,
    KEYS.OTP_RECORDS,
    KEYS.LOGIN_ATTEMPTS,
    KEYS.TRUSTED_DEVICES,
    KEYS.MONITORING_FLAGS,
    KEYS.ACTIVITY_TIMELINE,
    KEYS.ORDERS,
    KEYS.RETURNS,
  ].some((key) => readStorage(key) !== null);

  if (!hasLegacyData) {
    return null;
  }

  const orders = safeParse(readStorage(KEYS.ORDERS));
  const returns = safeParse(readStorage(KEYS.RETURNS));

  return {
    ...clone(seed),
    meta: {
      ...(seed.meta ?? {}),
      version: 3,
      source: "legacy-migration",
      migratedAt: new Date().toISOString(),
    },
    users: safeParse(readStorage(KEYS.USERS)) ?? clone(seed.users ?? []),
    session: safeParse(readStorage(KEYS.SESSION)) ?? null,
    otpRecords: safeParse(readStorage(KEYS.OTP_RECORDS)) ?? clone(seed.otpRecords ?? []),
    loginAttempts:
      safeParse(readStorage(KEYS.LOGIN_ATTEMPTS)) ??
      clone(seed.loginAttempts ?? []),
    trustedDevices:
      safeParse(readStorage(KEYS.TRUSTED_DEVICES)) ??
      clone(seed.trustedDevices ?? []),
    monitoringFlags:
      safeParse(readStorage(KEYS.MONITORING_FLAGS)) ??
      clone(seed.monitoringFlags ?? []),
    activityTimeline:
      safeParse(readStorage(KEYS.ACTIVITY_TIMELINE)) ??
      clone(seed.activityTimeline ?? []),
    orders: orders ? migrateOrders(orders) : clone(seed.orders ?? []),
    returns: returns ?? clone(seed.returns ?? []),
    approvalStatusChanges: clone(seed.approvalStatusChanges ?? []),
  };
}

export function loadMockDatabase(seed) {
  const persisted = safeParse(readStorage(KEYS.MOCK_DB));

  if (persisted) {
    return clone(persisted);
  }

  const migrated = buildLegacyMockDatabase(seed);
  if (migrated) {
    saveMockDatabase(migrated);
    return clone(migrated);
  }

  return clone(seed);
}

export function saveMockDatabase(mockDb) {
  writeStorage(KEYS.MOCK_DB, mockDb);
}

export function resetMockDatabase(seed) {
  const fresh = clone(seed);
  saveMockDatabase(fresh);
  return fresh;
}

export function clearLegacyStorage() {
  [
    KEYS.USERS,
    KEYS.SESSION,
    KEYS.OTP_RECORDS,
    KEYS.LOGIN_ATTEMPTS,
    KEYS.TRUSTED_DEVICES,
    KEYS.MONITORING_FLAGS,
    KEYS.ACTIVITY_TIMELINE,
    KEYS.ORDERS,
    KEYS.RETURNS,
  ].forEach(removeStorage);
}

export function loadFromStorage(key, seed) {
  const parsed = safeParse(readStorage(key));
  return parsed == null ? clone(seed == null ? null : seed) : parsed;
}

export function saveToStorage(key, data) {
  writeStorage(key, data);
}

export function removeFromStorage(key) {
  removeStorage(key);
}

export function resetStorage(key, seed) {
  const fresh = clone(seed == null ? null : seed);
  saveToStorage(key, fresh);
  return fresh;
}

export function resetAllStorage(seedMap) {
  Object.entries(seedMap).forEach(([keyName, seed]) => {
    const storageKey = KEYS[keyName];
    if (storageKey) {
      resetStorage(storageKey, seed);
    }
  });
}
