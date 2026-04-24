import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { INITIAL_MOCK_DATA } from "../data/seeds.js";
import {
  KEYS,
  clearLegacyStorage,
  loadMockDatabase,
  migrateOrders,
  resetMockDatabase,
  saveMockDatabase,
} from "../lib/storage.js";
import {
  buildLoginAttempt,
  checkDeviceTrust,
  generateOtpRecord,
  getMockFingerprint,
  getMockIp,
  resendOtpRecord,
  validateCredentials,
  verifyOtpRecord,
} from "../lib/authService.js";
import {
  buildTimelineEvent,
  computeOrderRisk,
  computeReturnRisk,
  computeUserRisk,
  generateFlagsFromBreakdown,
} from "../lib/riskEngine.js";

const MockDataContext = createContext(null);

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

const ORDER_STATUS_LABELS = {
  pending: "Waiting for approval",
  packing: "Order approved and being packed",
  shipped: "Order marked as shipped",
  delivered: "Order marked as delivered",
  rejected: "Order rejected by admin",
  cancelled: "Order cancelled by customer",
};

const RETURN_STATUS_LABELS = {
  pending: "Return submitted",
  flagged: "Return flagged for review",
  processing: "Return moved to manual review",
  completed: "Return completed",
  rejected: "Return rejected",
};

const ORDER_EVENT_TYPES = {
  pending: "order_created",
  packing: "order_approved",
  shipped: "order_shipped",
  delivered: "order_delivered",
  rejected: "order_rejected",
  cancelled: "order_cancelled",
};

const RETURN_EVENT_TYPES = {
  pending: "return_requested",
  flagged: "return_flagged",
  processing: "return_processing",
  completed: "return_completed",
  rejected: "return_rejected",
};

const SEVERITY_RANK = {
  low: 1,
  medium: 2,
  high: 3,
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatOrderDate(input = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(input));
}

function getActor(session, fallback = {}) {
  return {
    actorId: session?.userId ?? fallback.actorId ?? null,
    actorRole: session?.role ?? fallback.actorRole ?? null,
    actorName: session?.name ?? fallback.actorName ?? "System",
  };
}

function normalizeRiskSummary(summary = {}, deviceStatus = "trusted") {
  return {
    score: summary.score ?? 0,
    level: summary.level ?? "low",
    breakdown: summary.breakdown ?? [],
    updatedAt: summary.updatedAt ?? nowIso(),
    deviceStatus: summary.deviceStatus ?? deviceStatus,
  };
}

function buildStatusHistoryEntry({
  status,
  actorId,
  actorRole,
  note,
  createdAt = nowIso(),
  metadata = {},
}) {
  return {
    id: createId("HIST"),
    status,
    actorId,
    actorRole,
    note,
    createdAt,
    metadata,
  };
}

function buildApprovalStatusChange({
  entityType,
  entityId,
  fromStatus = null,
  toStatus,
  actorId,
  actorRole,
  note,
  metadata = {},
  createdAt = nowIso(),
}) {
  return {
    id: createId("APP"),
    entityType,
    entityId,
    fromStatus,
    toStatus,
    actorId,
    actorRole,
    note,
    metadata,
    createdAt,
  };
}

function appendActivity(store, event) {
  store.activityTimeline = [event, ...(store.activityTimeline ?? [])];
}

function maxSeverity(left, right) {
  return SEVERITY_RANK[left] >= SEVERITY_RANK[right] ? left : right;
}

function upsertGeneratedFlags(existingFlags = [], generatedFlags = []) {
  const nextFlags = [...existingFlags];
  const createdFlags = [];

  generatedFlags.forEach((flag) => {
    const index = nextFlags.findIndex(
      (item) =>
        item.entityType === flag.entityType &&
        item.entityId === flag.entityId &&
        item.ruleCode === flag.ruleCode &&
        item.status !== "resolved"
    );

    if (index >= 0) {
      const current = nextFlags[index];
      nextFlags[index] = {
        ...current,
        title: flag.title,
        severity: maxSeverity(current.severity ?? "low", flag.severity),
        reason: flag.reason,
        status: "open",
        lastTriggeredAt: flag.createdAt,
        triggerCount: (current.triggerCount ?? 1) + 1,
      };
      return;
    }

    const freshFlag = {
      ...flag,
      triggerCount: 1,
      lastTriggeredAt: flag.createdAt,
    };
    nextFlags.unshift(freshFlag);
    createdFlags.push(freshFlag);
  });

  return { nextFlags, createdFlags };
}

function buildManualFlag({
  entityType,
  entityId,
  ruleCode,
  title,
  severity = "medium",
  reason,
}) {
  return {
    id: createId("FLAG"),
    entityType,
    entityId,
    ruleCode,
    title,
    severity,
    status: "open",
    reason,
    createdAt: nowIso(),
  };
}

function addFlagsToStore(store, generatedFlags, actor = {}) {
  if (!generatedFlags.length) return [];

  const { nextFlags, createdFlags } = upsertGeneratedFlags(
    store.monitoringFlags,
    generatedFlags
  );
  store.monitoringFlags = nextFlags;

  createdFlags.forEach((flag) => {
    appendActivity(
      store,
      buildTimelineEvent(
        actor.actorId,
        actor.actorRole,
        "risk_flag_created",
        `Flag created: ${flag.title}`,
        {
          entityType: flag.entityType,
          entityId: flag.entityId,
          ruleCode: flag.ruleCode,
          flagId: flag.id,
        }
      )
    );
  });

  return createdFlags;
}

function normalizeSessionSnapshot(snapshot = {}, fallback = {}) {
  return {
    userId: snapshot.userId ?? fallback.userId ?? null,
    loginAt: snapshot.loginAt ?? fallback.loginAt ?? null,
    deviceStatus: snapshot.deviceStatus ?? fallback.deviceStatus ?? "trusted",
    deviceInfo: {
      fingerprint: snapshot.deviceInfo?.fingerprint ?? fallback.deviceInfo?.fingerprint ?? null,
      ipAddress: snapshot.deviceInfo?.ipAddress ?? fallback.deviceInfo?.ipAddress ?? null,
      userAgent: snapshot.deviceInfo?.userAgent ?? fallback.deviceInfo?.userAgent ?? "",
      trustedDeviceId:
        snapshot.deviceInfo?.trustedDeviceId ??
        fallback.deviceInfo?.trustedDeviceId ??
        null,
      deviceLabel:
        snapshot.deviceInfo?.deviceLabel ??
        fallback.deviceInfo?.deviceLabel ??
        "Unknown device",
      fingerprintSimilarity:
        snapshot.deviceInfo?.fingerprintSimilarity ??
        fallback.deviceInfo?.fingerprintSimilarity ??
        0,
      subnetSimilarity:
        snapshot.deviceInfo?.subnetSimilarity ??
        fallback.deviceInfo?.subnetSimilarity ??
        0,
      userAgentMatch:
        snapshot.deviceInfo?.userAgentMatch ??
        fallback.deviceInfo?.userAgentMatch ??
        false,
    },
  };
}

function buildUserRiskSummary(store, userId, deviceStatus = "trusted") {
  const risk = computeUserRisk(userId, store.loginAttempts ?? [], deviceStatus);
  return normalizeRiskSummary(risk, deviceStatus);
}

function buildOrderRiskSummary(store, order) {
  const deviceStatus = order.sessionSnapshot?.deviceStatus ?? "trusted";
  const risk = computeOrderRisk(
    order.id,
    order.customerId,
    store.orders ?? [],
    store.loginAttempts ?? [],
    store.otpRecords ?? [],
    deviceStatus
  );
  return normalizeRiskSummary(risk, deviceStatus);
}

function buildReturnRiskSummary(store, ret) {
  const deviceStatus = ret.sessionSnapshot?.deviceStatus ?? "trusted";
  const risk = computeReturnRisk(
    ret.id,
    ret.customerId,
    store.returns ?? [],
    store.loginAttempts ?? [],
    store.otpRecords ?? [],
    deviceStatus
  );
  return normalizeRiskSummary(risk, deviceStatus);
}

function normalizeUsers(users = [], baseStore) {
  return users.map((user) => ({
    avatar: null,
    status: "active",
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: null,
    ...user,
    riskSummary:
      user.riskSummary ??
      buildUserRiskSummary(baseStore, user.id, user.lastDeviceStatus ?? "trusted"),
  }));
}

function normalizeOrders(orders = [], session) {
  return migrateOrders(orders).map((order) => {
    const actor = order.customerId
      ? { actorId: order.customerId, actorRole: "customer" }
      : { actorId: null, actorRole: "customer" };

    return {
      customerId: null,
      email: "",
      paymentProof: null,
      deliveryProof: null,
      rejectionReason: null,
      cancelReason: null,
      trackingNumber: null,
      courier: null,
      delivery: null,
      deliveryId: null,
      cancelDeadlineTs: null,
      statusHistory: [],
      sessionSnapshot: normalizeSessionSnapshot({}, { userId: session?.userId }),
      riskSummary: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...order,
      date: order.date ?? formatOrderDate(order.createdAt ?? new Date()),
      createdAt: order.createdAt ?? nowIso(),
      updatedAt: order.updatedAt ?? order.createdAt ?? nowIso(),
      sessionSnapshot: normalizeSessionSnapshot(order.sessionSnapshot, {
        userId: order.customerId,
      }),
      statusHistory:
        order.statusHistory?.length > 0
          ? order.statusHistory
          : [
              buildStatusHistoryEntry({
                status: order.status ?? "pending",
                actorId: actor.actorId,
                actorRole: actor.actorRole,
                note:
                  ORDER_STATUS_LABELS[order.status ?? "pending"] ??
                  "Order updated",
                createdAt: order.createdAt ?? nowIso(),
              }),
            ],
    };
  });
}

function normalizeReturns(returns = [], session) {
  return returns.map((ret) => {
    const actor = ret.customerId
      ? { actorId: ret.customerId, actorRole: "customer" }
      : { actorId: null, actorRole: "customer" };

    return {
      customerId: null,
      email: "",
      receiptB64: null,
      productPhotoB64: null,
      qrCode: "-",
      scannedQr: "-",
      qrStatus: null,
      monitoringFlag: null,
      statusHistory: [],
      sessionSnapshot: normalizeSessionSnapshot({}, { userId: session?.userId }),
      riskSummary: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...ret,
      date: ret.date ?? formatOrderDate(ret.createdAt ?? new Date()),
      createdAt: ret.createdAt ?? nowIso(),
      updatedAt: ret.updatedAt ?? ret.createdAt ?? nowIso(),
      sessionSnapshot: normalizeSessionSnapshot(ret.sessionSnapshot, {
        userId: ret.customerId,
      }),
      statusHistory:
        ret.statusHistory?.length > 0
          ? ret.statusHistory
          : [
              buildStatusHistoryEntry({
                status: ret.status ?? "pending",
                actorId: actor.actorId,
                actorRole: actor.actorRole,
                note:
                  RETURN_STATUS_LABELS[ret.status ?? "pending"] ??
                  "Return updated",
                createdAt: ret.createdAt ?? nowIso(),
              }),
            ],
    };
  });
}

function normalizeMockData(rawDb) {
  const seed = clone(INITIAL_MOCK_DATA);
  const merged = {
    ...seed,
    ...(rawDb ?? {}),
    meta: {
      ...seed.meta,
      ...(rawDb?.meta ?? {}),
      version: 3,
    },
  };

  const users = normalizeUsers(merged.users ?? [], merged);
  const orders = normalizeOrders(merged.orders ?? [], merged.session);
  const returns = normalizeReturns(merged.returns ?? [], merged.session);

  const hydrated = {
    ...merged,
    users,
    session:
      merged.session == null
        ? null
        : {
            ...merged.session,
            deviceStatus: merged.session.deviceStatus ?? "trusted",
            deviceInfo: normalizeSessionSnapshot(
              { deviceInfo: merged.session.deviceInfo ?? {} },
              { deviceStatus: merged.session.deviceStatus ?? "trusted" }
            ).deviceInfo,
            riskSnapshot: merged.session.riskSnapshot ?? {
              score: 0,
              level: "low",
            },
          },
    otpRecords: merged.otpRecords ?? [],
    loginAttempts: merged.loginAttempts ?? [],
    trustedDevices: merged.trustedDevices ?? [],
    monitoringFlags: merged.monitoringFlags ?? [],
    activityTimeline: merged.activityTimeline ?? [],
    orders,
    returns,
    approvalStatusChanges: merged.approvalStatusChanges ?? [],
  };

  hydrated.users = hydrated.users.map((user) => ({
    ...user,
    riskSummary:
      user.riskSummary ??
      buildUserRiskSummary(
        hydrated,
        user.id,
        user.riskSummary?.deviceStatus ?? "trusted"
      ),
  }));

  hydrated.orders = hydrated.orders.map((order) => ({
    ...order,
    riskSummary: order.riskSummary ?? buildOrderRiskSummary(hydrated, order),
  }));

  hydrated.returns = hydrated.returns.map((ret) => ({
    ...ret,
    riskSummary: ret.riskSummary ?? buildReturnRiskSummary(hydrated, ret),
  }));

  return hydrated;
}

function updateMatchedTrustedDevice(store, userId, deviceResult, ipAddress) {
  if (!deviceResult?.device?.id) return;

  store.trustedDevices = store.trustedDevices.map((device) =>
    device.id === deviceResult.device.id
      ? {
          ...device,
          lastSeenIp: ipAddress,
          lastSeenAt: nowIso(),
        }
      : device
  );
}

function applyUserRiskInPlace(store, userId, deviceStatus, actor = {}) {
  const riskSummary = buildUserRiskSummary(store, userId, deviceStatus);
  store.users = store.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          riskSummary,
          lastDeviceStatus: deviceStatus,
        }
      : user
  );

  const generatedFlags = generateFlagsFromBreakdown(
    "account",
    userId,
    riskSummary.breakdown
  );
  addFlagsToStore(store, generatedFlags, actor);
  return riskSummary;
}

function applyOrderRiskInPlace(store, orderId, actor = {}) {
  const order = store.orders.find((item) => item.id === orderId);
  if (!order) return null;

  const riskSummary = buildOrderRiskSummary(store, order);
  store.orders = store.orders.map((item) =>
    item.id === orderId ? { ...item, riskSummary } : item
  );

  const generatedFlags = generateFlagsFromBreakdown(
    "order",
    orderId,
    riskSummary.breakdown
  );
  addFlagsToStore(store, generatedFlags, actor);
  return riskSummary;
}

function applyReturnRiskInPlace(store, returnId, actor = {}) {
  const ret = store.returns.find((item) => item.id === returnId);
  if (!ret) return null;

  const riskSummary = buildReturnRiskSummary(store, ret);
  const generatedFlags = generateFlagsFromBreakdown(
    "return",
    returnId,
    riskSummary.breakdown
  );
  addFlagsToStore(store, generatedFlags, actor);

  const openFlag = store.monitoringFlags.find(
    (flag) =>
      flag.entityType === "return" &&
      flag.entityId === returnId &&
      flag.status === "open"
  );

  store.returns = store.returns.map((item) =>
    item.id === returnId
      ? {
          ...item,
          riskSummary,
          monitoringFlag: openFlag?.title ?? item.monitoringFlag ?? null,
        }
      : item
  );
  return riskSummary;
}

function buildSessionRecord(user, meta = {}) {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    loginAt: nowIso(),
    deviceStatus: meta.deviceStatus ?? "trusted",
    deviceInfo: {
      fingerprint: meta.deviceInfo?.fingerprint ?? null,
      ipAddress: meta.deviceInfo?.ipAddress ?? null,
      userAgent: meta.deviceInfo?.userAgent ?? "",
      trustedDeviceId: meta.deviceInfo?.trustedDeviceId ?? null,
      deviceLabel: meta.deviceInfo?.deviceLabel ?? "Current browser",
      fingerprintSimilarity: meta.deviceInfo?.fingerprintSimilarity ?? 0,
      subnetSimilarity: meta.deviceInfo?.subnetSimilarity ?? 0,
      userAgentMatch: meta.deviceInfo?.userAgentMatch ?? false,
    },
    riskSnapshot: {
      score: meta.riskSummary?.score ?? 0,
      level: meta.riskSummary?.level ?? "low",
    },
  };
}

export function MockDataProvider({ children }) {
  const [mockStore, setMockStore] = useState(() =>
    normalizeMockData(loadMockDatabase(INITIAL_MOCK_DATA))
  );
  const storeRef = useRef(mockStore);

  useEffect(() => {
    storeRef.current = mockStore;
    saveMockDatabase(mockStore);
  }, [mockStore]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== KEYS.MOCK_DB) return;

      if (!event.newValue) {
        const freshStore = normalizeMockData(clone(INITIAL_MOCK_DATA));
        storeRef.current = freshStore;
        setMockStore(freshStore);
        return;
      }

      try {
        const nextStore = normalizeMockData(JSON.parse(event.newValue));
        storeRef.current = nextStore;
        setMockStore(nextStore);
      } catch (_) {}
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const commitStore = useCallback((updater) => {
    const workingCopy = clone(storeRef.current);
    const nextStore = normalizeMockData(updater(workingCopy) ?? workingCopy);
    storeRef.current = nextStore;
    setMockStore(nextStore);
    return nextStore;
  }, []);

  const loginUser = useCallback(
    (email, password) => {
      const currentStore = storeRef.current;
      const currentUa = navigator.userAgent;
      const fingerprint = getMockFingerprint();
      const result = validateCredentials(email, password, currentStore.users);
      const currentIp = getMockIp(result.user?.id);
      const devicePreview = result.user
        ? checkDeviceTrust(
            result.user.id,
            fingerprint,
            currentIp,
            currentUa,
            currentStore.trustedDevices
          )
        : null;
      let response = { success: false, reason: "unknown" };

      commitStore((draft) => {
        const attemptActor = getActor(draft.session, {
          actorId: result.user?.id ?? null,
          actorRole: result.user?.role ?? "unknown",
          actorName: result.user?.name ?? email,
        });

        const attempt = buildLoginAttempt(
          result.user?.id,
          email,
          result.user?.role,
          result.valid,
          result.reason,
          fingerprint,
          currentIp,
          currentUa
        );
        draft.loginAttempts = [...draft.loginAttempts, attempt];

        if (!result.valid) {
          if (result.user && result.newFailCount !== undefined) {
            draft.users = draft.users.map((user) =>
              user.id === result.user.id
                ? {
                    ...user,
                    failedLoginCount: result.newFailCount,
                    lockedUntil: result.willLock
                      ? new Date(Date.now() + 30 * 60000).toISOString()
                      : null,
                  }
                : user
            );
          }

          appendActivity(
            draft,
            buildTimelineEvent(
              result.user?.id ?? null,
              result.user?.role ?? "unknown",
              "login_failed",
              `Login failed for ${email}`,
              {
                email,
                reason: result.reason,
                ipAddress: currentIp,
                fingerprint,
              }
            )
          );

          if (result.user) {
            applyUserRiskInPlace(
              draft,
              result.user.id,
              devicePreview?.status ?? "trusted",
              attemptActor
            );
          }

          response = { success: false, ...result };
          return draft;
        }

        const deviceResult =
          devicePreview ??
          checkDeviceTrust(
            result.user.id,
            fingerprint,
            currentIp,
            currentUa,
            draft.trustedDevices
          );

        draft.users = draft.users.map((user) =>
          user.id === result.user.id
            ? {
                ...user,
                failedLoginCount: 0,
                lockedUntil: null,
                lastLoginAt: nowIso(),
              }
            : user
        );

        updateMatchedTrustedDevice(draft, result.user.id, deviceResult, currentIp);

        appendActivity(
          draft,
          buildTimelineEvent(
            result.user.id,
            result.user.role,
            "login_success",
            `Login success for ${email}`,
            {
              email,
              ipAddress: currentIp,
              deviceStatus: deviceResult.status,
            }
          )
        );

        if (deviceResult.status === "new") {
          appendActivity(
            draft,
            buildTimelineEvent(
              result.user.id,
              result.user.role,
              "new_device_detected",
              "New device detected during login",
              {
                fingerprint,
                ipAddress: currentIp,
              }
            )
          );
        }

        if (deviceResult.status === "known-unusual-network") {
          appendActivity(
            draft,
            buildTimelineEvent(
              result.user.id,
              result.user.role,
              "known_device_unusual_network",
              "Known device on unusual network",
              {
                deviceLabel: deviceResult.device?.deviceLabel ?? "Known device",
                ipAddress: currentIp,
                subnetSimilarity: deviceResult.subnetSim ?? 0,
              }
            )
          );
        }

        if (deviceResult.status === "trusted") {
          appendActivity(
            draft,
            buildTimelineEvent(
              result.user.id,
              result.user.role,
              "trusted_device_matched",
              "Trusted device matched",
              {
                deviceToken: deviceResult.device?.deviceToken ?? null,
              }
            )
          );
        }

        const actor = getActor(draft.session, {
          actorId: result.user.id,
          actorRole: result.user.role,
          actorName: result.user.name,
        });
        const riskSummary = applyUserRiskInPlace(
          draft,
          result.user.id,
          deviceResult.status,
          actor
        );

        response = {
          success: true,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            twoFactorEnabled: result.user.twoFactorEnabled,
          },
          deviceStatus: deviceResult.status,
          deviceInfo: {
            fingerprint,
            ipAddress: currentIp,
            userAgent: currentUa,
            trustedDeviceId: deviceResult.device?.id ?? null,
            deviceLabel:
              deviceResult.device?.deviceLabel ??
              (deviceResult.status === "new"
                ? "New browser session"
                : "Known browser session"),
            fingerprintSimilarity: deviceResult.fingerprintSimilarity ?? 0,
            subnetSimilarity: deviceResult.subnetSim ?? 0,
            userAgentMatch: deviceResult.uaMatch ?? false,
          },
          needsOtp: result.user.twoFactorEnabled,
          riskSummary,
        };

        return draft;
      });

      return response;
    },
    [commitStore]
  );

  const logoutUser = useCallback(() => {
    const currentStore = storeRef.current;
    if (!currentStore.session) {
      return;
    }

    commitStore((draft) => {
      appendActivity(
        draft,
        buildTimelineEvent(
          draft.session.userId,
          draft.session.role,
          "logout",
          `Logout: ${draft.session.email}`,
          { sessionEndedAt: nowIso() }
        )
      );
      draft.session = null;
      return draft;
    });
  }, [commitStore]);

  const setUserSession = useCallback(
    (user, meta = {}) => {
      let sessionRecord = null;

      commitStore((draft) => {
        sessionRecord = buildSessionRecord(user, meta);
        draft.session = sessionRecord;
        return draft;
      });

      return sessionRecord;
    },
    [commitStore]
  );

  const generateOtp = useCallback(
    (userId, options = {}) => {
      let otpRecord = null;

      commitStore((draft) => {
        otpRecord = generateOtpRecord(userId, options);
        draft.otpRecords = [...draft.otpRecords, otpRecord];

        const user = draft.users.find((item) => item.id === userId);
        appendActivity(
          draft,
          buildTimelineEvent(
            userId,
            user?.role ?? null,
            "otp_requested",
            `${options.purpose === "step_up" ? "Step-up" : "Login"} OTP requested`,
            {
              purpose: options.purpose ?? "login",
              metadata: options.metadata ?? {},
            }
          )
        );

        return draft;
      });

      return otpRecord;
    },
    [commitStore]
  );

  const verifyOtp = useCallback(
    (userId, code, options = {}) => {
      const currentStore = storeRef.current;
      const result = verifyOtpRecord(
        userId,
        code,
        currentStore.otpRecords,
        options
      );

      commitStore((draft) => {
        if (result.updatedRecord) {
          draft.otpRecords = draft.otpRecords.map((record) =>
            record.id === result.updatedRecord.id ? result.updatedRecord : record
          );
        }

        const user = draft.users.find((item) => item.id === userId);
        appendActivity(
          draft,
          buildTimelineEvent(
            userId,
            user?.role ?? null,
            result.success ? "otp_verified" : "otp_failed",
            result.success
              ? `${options.purpose === "step_up" ? "Step-up" : "Login"} OTP verified`
              : "OTP verification failed",
            {
              purpose: options.purpose ?? "login",
              reason: result.reason,
              attempts: result.updatedRecord?.attempts ?? result.record?.attempts ?? 0,
            }
          )
        );

        if (
          !result.success &&
          (result.updatedRecord?.attempts ?? 0) >= 2
        ) {
          addFlagsToStore(
            draft,
            [
              buildManualFlag({
                entityType: "session",
                entityId: userId,
                ruleCode: "RISK-OTP-RETRY",
                title: "OTP Retry Abuse",
                severity:
                  (result.updatedRecord?.attempts ?? 0) >= 3 ? "medium" : "low",
                reason:
                  "OTP verification failed repeatedly during a protected flow.",
              }),
            ],
            getActor(draft.session, {
              actorId: userId,
              actorRole: user?.role ?? null,
              actorName: user?.name ?? "User",
            })
          );
        }

        return draft;
      });

      return result;
    },
    [commitStore]
  );

  const resendOtp = useCallback(
    (userId, options = {}) => {
      const currentStore = storeRef.current;
      const { expiredRecords, newRecord } = resendOtpRecord(
        userId,
        currentStore.otpRecords,
        options
      );

      commitStore((draft) => {
        draft.otpRecords = [...expiredRecords, newRecord];

        const user = draft.users.find((item) => item.id === userId);
        appendActivity(
          draft,
          buildTimelineEvent(
            userId,
            user?.role ?? null,
            "otp_resent",
            `${options.purpose === "step_up" ? "Step-up" : "Login"} OTP resent`,
            {
              purpose: options.purpose ?? "login",
              resendCount: newRecord.resendCount,
            }
          )
        );

        if (newRecord.resendCount >= 2) {
          addFlagsToStore(
            draft,
            [
              buildManualFlag({
                entityType: "session",
                entityId: userId,
                ruleCode: "RISK-OTP-RETRY",
                title: "OTP Retry Abuse",
                severity: newRecord.resendCount >= 3 ? "medium" : "low",
                reason:
                  "OTP resend was requested repeatedly in the same protected flow.",
              }),
            ],
            getActor(draft.session, {
              actorId: userId,
              actorRole: user?.role ?? null,
              actorName: user?.name ?? "User",
            })
          );
        }

        return draft;
      });

      return newRecord;
    },
    [commitStore]
  );

  const trustDevice = useCallback(
    (userId, fingerprint, ipAddress, userAgent, label) => {
      let trustedDevice = null;

      commitStore((draft) => {
        trustedDevice = {
          id: createId("DEV"),
          userId,
          deviceToken: `dt_${userId}_${Date.now()}`,
          fingerprintHash: fingerprint,
          deviceLabel: label ?? "Browser session",
          userAgent,
          firstSeenIp: ipAddress,
          lastSeenIp: ipAddress,
          trustedStatus: "trusted",
          fingerprintSimilarity: 95,
          subnetSimilarity: 90,
          userAgentMatch: true,
          firstSeenAt: nowIso(),
          lastSeenAt: nowIso(),
          lastVerificationAt: nowIso(),
        };
        draft.trustedDevices = [trustedDevice, ...draft.trustedDevices];

        appendActivity(
          draft,
          buildTimelineEvent(
            userId,
            draft.users.find((user) => user.id === userId)?.role ?? null,
            "device_trusted",
            `Trusted device added: ${trustedDevice.deviceLabel}`,
            {
              deviceId: trustedDevice.id,
              deviceToken: trustedDevice.deviceToken,
            }
          )
        );

        return draft;
      });

      return trustedDevice;
    },
    [commitStore]
  );

  const addFlag = useCallback(
    (flag) => {
      let insertedFlag = null;

      commitStore((draft) => {
        insertedFlag = {
          createdAt: nowIso(),
          status: "open",
          ...flag,
          id: flag.id ?? createId("FLAG"),
        };
        addFlagsToStore(
          draft,
          [insertedFlag],
          getActor(draft.session, {
            actorId: insertedFlag.entityId,
            actorRole: null,
            actorName: "System",
          })
        );
        return draft;
      });

      return insertedFlag;
    },
    [commitStore]
  );

  const reviewFlag = useCallback(
    (flagId) => {
      commitStore((draft) => {
        draft.monitoringFlags = draft.monitoringFlags.map((flag) =>
          flag.id === flagId
            ? { ...flag, status: "reviewed", reviewedAt: nowIso() }
            : flag
        );

        const flag = draft.monitoringFlags.find((item) => item.id === flagId);
        if (flag) {
          appendActivity(
            draft,
            buildTimelineEvent(
              draft.session?.userId ?? null,
              draft.session?.role ?? null,
              "flag_reviewed",
              `Flag reviewed: ${flag.title}`,
              {
                flagId: flag.id,
                entityType: flag.entityType,
                entityId: flag.entityId,
              }
            )
          );
        }

        return draft;
      });
    },
    [commitStore]
  );

  const resolveFlag = useCallback(
    (flagId) => {
      commitStore((draft) => {
        draft.monitoringFlags = draft.monitoringFlags.map((flag) =>
          flag.id === flagId
            ? { ...flag, status: "resolved", resolvedAt: nowIso() }
            : flag
        );

        const flag = draft.monitoringFlags.find((item) => item.id === flagId);
        if (flag) {
          appendActivity(
            draft,
            buildTimelineEvent(
              draft.session?.userId ?? null,
              draft.session?.role ?? null,
              "flag_resolved",
              `Flag resolved: ${flag.title}`,
              {
                flagId: flag.id,
                entityType: flag.entityType,
                entityId: flag.entityId,
              }
            )
          );
        }

        return draft;
      });
    },
    [commitStore]
  );

  const addTimelineEvent = useCallback(
    (event) => {
      commitStore((draft) => {
        appendActivity(draft, event);
        return draft;
      });
    },
    [commitStore]
  );

  const addOrder = useCallback(
    (orderInput) => {
      let createdOrder = null;

      commitStore((draft) => {
        const session = draft.session;
        const actor = getActor(session, {
          actorId: orderInput.customerId ?? null,
          actorRole: "customer",
          actorName: orderInput.customer ?? "Customer",
        });
        const customerUser = draft.users.find(
          (user) => user.id === (orderInput.customerId ?? session?.userId)
        );
        const createdAt = orderInput.createdAt ?? nowIso();

        createdOrder = {
          id: orderInput.id ?? createId("ORD"),
          status: orderInput.status ?? "pending",
          customerId: orderInput.customerId ?? session?.userId ?? null,
          customer:
            orderInput.customer ??
            customerUser?.name ??
            session?.name ??
            "Customer",
          email: orderInput.email ?? customerUser?.email ?? "",
          date: orderInput.date ?? formatOrderDate(createdAt),
          items: orderInput.items ?? [],
          subtotal: orderInput.subtotal ?? 0,
          deliveryFee: orderInput.deliveryFee ?? 0,
          total: orderInput.total ?? 0,
          payment: orderInput.payment ?? "",
          paymentAccount: orderInput.paymentAccount ?? "",
          recipient:
            orderInput.recipient ??
            orderInput.customer ??
            customerUser?.name ??
            "",
          phone: orderInput.phone ?? customerUser?.phone ?? "",
          address: orderInput.address ?? "",
          delivery: orderInput.delivery ?? null,
          deliveryId: orderInput.deliveryId ?? null,
          paymentProof: orderInput.paymentProof ?? null,
          rejectionReason: null,
          cancelReason: null,
          trackingNumber: null,
          courier: null,
          deliveryProof: null,
          cancelDeadlineTs:
            orderInput.cancelDeadlineTs ?? Date.now() + 24 * 60 * 60 * 1000,
          createdAt,
          updatedAt: createdAt,
          sessionSnapshot: normalizeSessionSnapshot(orderInput.sessionSnapshot, {
            userId: orderInput.customerId ?? session?.userId ?? null,
            loginAt: session?.loginAt ?? createdAt,
            deviceStatus: session?.deviceStatus ?? "trusted",
            deviceInfo: session?.deviceInfo ?? {},
          }),
          statusHistory: [
            buildStatusHistoryEntry({
              status: orderInput.status ?? "pending",
              actorId: actor.actorId,
              actorRole: actor.actorRole,
              note: "Order placed and waiting for approval.",
              createdAt,
            }),
          ],
        };

        draft.orders = [createdOrder, ...draft.orders];
        draft.approvalStatusChanges = [
          buildApprovalStatusChange({
            entityType: "order",
            entityId: createdOrder.id,
            fromStatus: null,
            toStatus: createdOrder.status,
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            note: "Order created.",
            createdAt,
          }),
          ...draft.approvalStatusChanges,
        ];

        appendActivity(
          draft,
          buildTimelineEvent(
            actor.actorId,
            actor.actorRole,
            "order_created",
            `Order placed: ${createdOrder.id}`,
            {
              entityType: "order",
              entityId: createdOrder.id,
              orderId: createdOrder.id,
              total: createdOrder.total,
            }
          )
        );

        if (createdOrder.paymentProof) {
          appendActivity(
            draft,
            buildTimelineEvent(
              actor.actorId,
              actor.actorRole,
              "payment_proof_uploaded",
              `Payment proof uploaded for ${createdOrder.id}`,
              {
                entityType: "order",
                entityId: createdOrder.id,
                orderId: createdOrder.id,
              }
            )
          );
        }

        const riskSummary = applyOrderRiskInPlace(draft, createdOrder.id, actor);
        createdOrder = draft.orders.find((order) => order.id === createdOrder.id);
        if (createdOrder) {
          createdOrder.riskSummary = riskSummary;
        }

        return draft;
      });

      return createdOrder;
    },
    [commitStore]
  );

  const updateOrderStatus = useCallback(
    (orderId, patch, note) => {
      let updatedOrder = null;

      commitStore((draft) => {
        const order = draft.orders.find((item) => item.id === orderId);
        if (!order) return draft;

        const actor = getActor(draft.session, {
          actorId: order.customerId,
          actorRole: draft.session?.role ?? "system",
          actorName: order.customer,
        });
        const nextStatus = patch.status ?? order.status;
        const statusChanged = nextStatus !== order.status;
        const updatedAt = nowIso();

        draft.orders = draft.orders.map((item) => {
          if (item.id !== orderId) return item;

          const nextItem = {
            ...item,
            ...patch,
            updatedAt,
          };

          if (statusChanged) {
            nextItem.statusHistory = [
              ...item.statusHistory,
              buildStatusHistoryEntry({
                status: nextStatus,
                actorId: actor.actorId,
                actorRole: actor.actorRole,
                note:
                  note ??
                  ORDER_STATUS_LABELS[nextStatus] ??
                  "Order status updated",
                createdAt: updatedAt,
              }),
            ];
          }

          updatedOrder = nextItem;
          return nextItem;
        });

        if (statusChanged) {
          draft.approvalStatusChanges = [
            buildApprovalStatusChange({
              entityType: "order",
              entityId: orderId,
              fromStatus: order.status,
              toStatus: nextStatus,
              actorId: actor.actorId,
              actorRole: actor.actorRole,
              note:
                note ??
                ORDER_STATUS_LABELS[nextStatus] ??
                "Order status updated",
              createdAt: updatedAt,
              metadata: patch,
            }),
            ...draft.approvalStatusChanges,
          ];

          appendActivity(
            draft,
            buildTimelineEvent(
              actor.actorId,
              actor.actorRole,
              ORDER_EVENT_TYPES[nextStatus] ?? "order_updated",
              note ??
                `${ORDER_STATUS_LABELS[nextStatus] ?? "Order updated"}: ${orderId}`,
              {
                entityType: "order",
                entityId: orderId,
                orderId,
                fromStatus: order.status,
                toStatus: nextStatus,
              }
            )
          );
        }

        return draft;
      });

      return updatedOrder;
    },
    [commitStore]
  );

  const cancelOrder = useCallback(
    (orderId, reason) =>
      updateOrderStatus(
        orderId,
        {
          status: "cancelled",
          cancelReason: reason ?? null,
          cancelDeadlineTs: null,
        },
        "Order cancelled by customer."
      ),
    [updateOrderStatus]
  );

  const approveOrder = useCallback(
    (orderId) =>
      updateOrderStatus(
        orderId,
        {
          status: "packing",
          cancelDeadlineTs: null,
        },
        "Payment approved by admin."
      ),
    [updateOrderStatus]
  );

  const rejectOrder = useCallback(
    (orderId, reason) =>
      updateOrderStatus(
        orderId,
        {
          status: "rejected",
          rejectionReason: reason ?? null,
          cancelDeadlineTs: null,
        },
        "Payment rejected by admin."
      ),
    [updateOrderStatus]
  );

  const shipOrder = useCallback(
    (orderId, courier, trackingNumber) =>
      updateOrderStatus(
        orderId,
        {
          status: "shipped",
          courier,
          trackingNumber,
        },
        "Order marked as shipped by admin."
      ),
    [updateOrderStatus]
  );

  const deliverOrder = useCallback(
    (orderId, deliveryProof) =>
      updateOrderStatus(
        orderId,
        {
          status: "delivered",
          deliveryProof: deliveryProof ?? null,
        },
        "Order marked as delivered by admin."
      ),
    [updateOrderStatus]
  );

  const getOrder = useCallback(
    (orderId) => storeRef.current.orders.find((order) => order.id === orderId),
    []
  );

  const addReturn = useCallback(
    (returnInput) => {
      let createdReturn = null;

      commitStore((draft) => {
        const session = draft.session;
        const linkedOrder = draft.orders.find(
          (order) => order.id === returnInput.orderId
        );
        const actor = getActor(session, {
          actorId:
            returnInput.customerId ??
            linkedOrder?.customerId ??
            session?.userId ??
            null,
          actorRole: "customer",
          actorName:
            returnInput.customer ??
            linkedOrder?.customer ??
            session?.name ??
            "Customer",
        });
        const createdAt = returnInput.createdAt ?? nowIso();

        createdReturn = {
          id: returnInput.id ?? createId("RET"),
          orderId: returnInput.orderId,
          customerId:
            returnInput.customerId ??
            linkedOrder?.customerId ??
            session?.userId ??
            null,
          customer:
            returnInput.customer ??
            linkedOrder?.customer ??
            session?.name ??
            "Customer",
          email: returnInput.email ?? linkedOrder?.email ?? session?.email ?? "",
          date: returnInput.date ?? formatOrderDate(createdAt),
          createdAt,
          updatedAt: createdAt,
          reason: returnInput.reason ?? "",
          status: returnInput.status ?? "pending",
          monitoringFlag: returnInput.monitoringFlag ?? null,
          products: returnInput.products ?? [],
          conditionNote: returnInput.conditionNote ?? returnInput.reason ?? "",
          photos:
            returnInput.photos ??
            (returnInput.productPhotoB64 ? [returnInput.productPhotoB64] : []),
          receiptB64: returnInput.receiptB64 ?? null,
          productPhotoB64: returnInput.productPhotoB64 ?? null,
          qrCode: returnInput.qrCode ?? "-",
          scannedQr: returnInput.scannedQr ?? "-",
          qrStatus: returnInput.qrStatus ?? null,
          total: returnInput.total ?? 0,
          sessionSnapshot: normalizeSessionSnapshot(returnInput.sessionSnapshot, {
            userId:
              returnInput.customerId ??
              linkedOrder?.customerId ??
              session?.userId ??
              null,
            loginAt: session?.loginAt ?? createdAt,
            deviceStatus:
              returnInput.sessionSnapshot?.deviceStatus ??
              linkedOrder?.sessionSnapshot?.deviceStatus ??
              session?.deviceStatus ??
              "trusted",
            deviceInfo:
              returnInput.sessionSnapshot?.deviceInfo ??
              session?.deviceInfo ??
              {},
          }),
          statusHistory: [
            buildStatusHistoryEntry({
              status: returnInput.status ?? "pending",
              actorId: actor.actorId,
              actorRole: actor.actorRole,
              note: "Return request submitted by customer.",
              createdAt,
            }),
          ],
        };

        draft.returns = [createdReturn, ...draft.returns];
        draft.approvalStatusChanges = [
          buildApprovalStatusChange({
            entityType: "return",
            entityId: createdReturn.id,
            fromStatus: null,
            toStatus: createdReturn.status,
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            note: "Return created.",
            createdAt,
          }),
          ...draft.approvalStatusChanges,
        ];

        appendActivity(
          draft,
          buildTimelineEvent(
            actor.actorId,
            actor.actorRole,
            "return_requested",
            `Return requested: ${createdReturn.id}`,
            {
              entityType: "return",
              entityId: createdReturn.id,
              orderId: createdReturn.orderId,
            }
          )
        );

        if (createdReturn.receiptB64 || createdReturn.photos.length > 0) {
          appendActivity(
            draft,
            buildTimelineEvent(
              actor.actorId,
              actor.actorRole,
              "return_evidence_uploaded",
              `Return evidence uploaded for ${createdReturn.id}`,
              {
                entityType: "return",
                entityId: createdReturn.id,
                orderId: createdReturn.orderId,
              }
            )
          );
        }

        const riskSummary = applyReturnRiskInPlace(draft, createdReturn.id, actor);
        createdReturn = draft.returns.find((ret) => ret.id === createdReturn.id);
        if (createdReturn) {
          createdReturn.riskSummary = riskSummary;
        }

        return draft;
      });

      return createdReturn;
    },
    [commitStore]
  );

  const updateReturn = useCallback(
    (returnId, patch) => {
      let updatedReturn = null;

      commitStore((draft) => {
        const ret = draft.returns.find((item) => item.id === returnId);
        if (!ret) return draft;

        const actor = getActor(draft.session, {
          actorId: ret.customerId,
          actorRole: draft.session?.role ?? "system",
          actorName: ret.customer,
        });
        const nextStatus = patch.status ?? ret.status;
        const statusChanged = nextStatus !== ret.status;
        const updatedAt = nowIso();

        draft.returns = draft.returns.map((item) => {
          if (item.id !== returnId) return item;

          const nextItem = {
            ...item,
            ...patch,
            updatedAt,
          };

          if (statusChanged) {
            nextItem.statusHistory = [
              ...item.statusHistory,
              buildStatusHistoryEntry({
                status: nextStatus,
                actorId: actor.actorId,
                actorRole: actor.actorRole,
                note:
                  RETURN_STATUS_LABELS[nextStatus] ??
                  "Return status updated",
                createdAt: updatedAt,
              }),
            ];
          }

          updatedReturn = nextItem;
          return nextItem;
        });

        if (statusChanged) {
          draft.approvalStatusChanges = [
            buildApprovalStatusChange({
              entityType: "return",
              entityId: returnId,
              fromStatus: ret.status,
              toStatus: nextStatus,
              actorId: actor.actorId,
              actorRole: actor.actorRole,
              note:
                RETURN_STATUS_LABELS[nextStatus] ??
                "Return status updated",
              createdAt: updatedAt,
              metadata: patch,
            }),
            ...draft.approvalStatusChanges,
          ];

          appendActivity(
            draft,
            buildTimelineEvent(
              actor.actorId,
              actor.actorRole,
              RETURN_EVENT_TYPES[nextStatus] ?? "return_updated",
              `${RETURN_STATUS_LABELS[nextStatus] ?? "Return updated"}: ${returnId}`,
              {
                entityType: "return",
                entityId: returnId,
                orderId: ret.orderId,
                fromStatus: ret.status,
                toStatus: nextStatus,
              }
            )
          );
        }

        if (patch.qrStatus === "invalid") {
          updatedReturn = {
            ...updatedReturn,
            monitoringFlag:
              updatedReturn.monitoringFlag ?? "QR verification mismatch",
          };
          draft.returns = draft.returns.map((item) =>
            item.id === returnId
              ? {
                  ...item,
                  monitoringFlag:
                    item.monitoringFlag ?? "QR verification mismatch",
                }
              : item
          );

          addFlagsToStore(
            draft,
            [
              buildManualFlag({
                entityType: "return",
                entityId: returnId,
                ruleCode: "RISK-QR-MISMATCH",
                title: "QR Verification Failed",
                severity: "high",
                reason:
                  "Return package QR does not match the order record.",
              }),
            ],
            actor
          );
        }

        if (patch.qrStatus === "valid") {
          appendActivity(
            draft,
            buildTimelineEvent(
              actor.actorId,
              actor.actorRole,
              "qr_verified",
              `QR verification passed for ${returnId}`,
              {
                entityType: "return",
                entityId: returnId,
                orderId: ret.orderId,
              }
            )
          );
        }

        applyReturnRiskInPlace(draft, returnId, actor);
        updatedReturn = draft.returns.find((item) => item.id === returnId);
        return draft;
      });

      return updatedReturn;
    },
    [commitStore]
  );

  const getReturn = useCallback(
    (returnId) => storeRef.current.returns.find((ret) => ret.id === returnId),
    []
  );

  const resetAllMockData = useCallback(() => {
    const freshStore = normalizeMockData(resetMockDatabase(INITIAL_MOCK_DATA));
    clearLegacyStorage();
    storeRef.current = freshStore;
    setMockStore(freshStore);
    return freshStore;
  }, []);

  const currentUser = mockStore.session
    ? mockStore.users.find((user) => user.id === mockStore.session.userId) ?? null
    : null;
  const openFlagCount = mockStore.monitoringFlags.filter(
    (flag) => flag.status === "open"
  ).length;

  return (
    <MockDataContext.Provider
      value={{
        mockStore,
        users: mockStore.users,
        session: mockStore.session,
        currentUser,
        otpRecords: mockStore.otpRecords,
        loginAttempts: mockStore.loginAttempts,
        trustedDevices: mockStore.trustedDevices,
        monitoringFlags: mockStore.monitoringFlags,
        activityTimeline: mockStore.activityTimeline,
        activityLogs: mockStore.activityTimeline,
        orders: mockStore.orders,
        returns: mockStore.returns,
        approvalStatusChanges: mockStore.approvalStatusChanges,
        openFlagCount,
        loginUser,
        logoutUser,
        setUserSession,
        generateOtp,
        verifyOtp,
        resendOtp,
        trustDevice,
        addFlag,
        reviewFlag,
        resolveFlag,
        addTimelineEvent,
        addOrder,
        cancelOrder,
        approveOrder,
        rejectOrder,
        shipOrder,
        deliverOrder,
        getOrder,
        addReturn,
        updateReturn,
        getReturn,
        resetAllMockData,
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error("useMockData() must be used inside <MockDataProvider>");
  }
  return context;
}
