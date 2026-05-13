import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api, { storeApi } from "../lib/api.js";
import {
  buildTimelineEvent,
  computeOrderRisk,
  computeReturnRisk,
  computeUserRisk,
  generateFlagsFromBreakdown,
} from "../lib/riskEngine.js";

const MockDataContext = createContext(null);

const SESSION_KEY = "coy_session_v2";
const nowIso = () => new Date().toISOString();

// ── Risk helpers ──────────────────────────────────────────────

function normalizeRiskSummary(summary = {}, deviceStatus = "trusted") {
  return {
    score: summary.score ?? 0,
    level: summary.level ?? "low",
    breakdown: summary.breakdown ?? [],
    updatedAt: summary.updatedAt ?? nowIso(),
    deviceStatus: summary.deviceStatus ?? deviceStatus,
  };
}

function buildUserRiskSummary(store, userId, deviceStatus = "trusted") {
  const risk = computeUserRisk(userId, store.loginAttempts ?? [], deviceStatus, store.activityTimeline ?? []);
  return normalizeRiskSummary(risk, deviceStatus);
}

function buildOrderRiskSummary(store, order) {
  const deviceStatus = order.sessionSnapshot?.deviceStatus ?? "trusted";
  const risk = computeOrderRisk(
    order.id, order.customerId,
    store.orders ?? [], store.loginAttempts ?? [], [],
    deviceStatus, store.activityTimeline ?? [],
    store.users ?? [], order
  );
  return normalizeRiskSummary(risk, deviceStatus);
}

function buildReturnRiskSummary(store, ret) {
  const deviceStatus = ret.sessionSnapshot?.deviceStatus ?? "trusted";
  const risk = computeReturnRisk(
    ret.id, ret.customerId,
    store.returns ?? [], store.loginAttempts ?? [], [],
    deviceStatus, store.activityTimeline ?? [],
    store.users ?? [], ret
  );
  return normalizeRiskSummary(risk, deviceStatus);
}

// ── Normalize raw API data ────────────────────────────────────

const EMPTY_STORE = {
  users: [], categories: [], products: [], productReviews: [], orders: [], returns: [],
  loginAttempts: [], trustedDevices: [],
  monitoringFlags: [], activityTimeline: [],
  otpRecords: [], session: null, meta: {},
};

function normalizeStore(data) {
  if (!data) return { ...EMPTY_STORE };

  const base = {
    ...EMPTY_STORE,
    users: data.users ?? [],
    categories: data.categories ?? [],
    products: data.products ?? [],
    productReviews: data.productReviews ?? [],
    orders: data.orders ?? [],
    returns: data.returns ?? [],
    loginAttempts: data.loginAttempts ?? [],
    trustedDevices: data.trustedDevices ?? [],
    monitoringFlags: data.monitoringFlags ?? [],
    activityTimeline: data.activityTimeline ?? [],
  };

  // Compute risk summaries for any entity that doesn't have one yet
  base.orders = base.orders.map((order) => ({
    ...order,
    riskSummary: order.riskSummary ?? buildOrderRiskSummary(base, order),
  }));

  base.returns = base.returns.map((ret) => ({
    ...ret,
    riskSummary: ret.riskSummary ?? buildReturnRiskSummary(base, ret),
  }));

  base.users = base.users.map((user) => ({
    ...user,
    riskSummary: user.riskSummary ?? buildUserRiskSummary(base, user.id, "trusted"),
  }));

  return base;
}

// ── Provider ──────────────────────────────────────────────────

export function MockDataProvider({ children }) {
  const [storeData, setStoreData] = useState({ ...EMPTY_STORE });
  const [loading, setLoading] = useState(true);
  const storeRef = useRef(storeData);

  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) ?? null; }
    catch { return null; }
  });
  const sessionRef = useRef(session);

  useEffect(() => { storeRef.current = storeData; }, [storeData]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Fetch all data from backend
  const refresh = useCallback(async () => {
    try {
      const { data } = await storeApi.init();
      const normalized = normalizeStore(data);
      storeRef.current = normalized;
      setStoreData(normalized);
    } catch (_) {
      // keep current state on network error
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000);
    refresh().finally(() => {
      clearTimeout(timer);
      setLoading(false);
    });
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session management ──────────────────────────────────────

  const setUserSession = useCallback((user, meta = {}) => {
    const sessionRecord = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loginAt: nowIso(),
      deviceStatus: meta.deviceStatus ?? "trusted",
      deviceInfo: meta.deviceInfo ?? {},
      riskSnapshot: meta.riskSummary
        ? { score: meta.riskSummary.score, level: meta.riskSummary.level }
        : { score: 0, level: "low" },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionRecord));
    sessionRef.current = sessionRecord;
    setSession(sessionRecord);
  }, []);

  const logoutUser = useCallback(async () => {
    const current = sessionRef.current;
    if (current) {
      try {
        await api.post("/api/auth/logout/", {
          userId: current.userId,
          userRole: current.role,
          email: current.email,
        });
      } catch (_) {}
    }
    localStorage.removeItem(SESSION_KEY);
    sessionRef.current = null;
    setSession(null);
  }, []);

  // ── OTP (admin step-up, backed by Django) ───────────────────

  const otpSessionRef = useRef(null);

  const generateOtp = useCallback(async (userId, options = {}) => {
    try {
      const { data } = await api.post("/api/auth/otp/request/", {
        userId,
        purpose: options.purpose ?? "step_up",
      });
      otpSessionRef.current = data.sessionId;
      return { id: data.sessionId };
    } catch (_) {
      return { id: null };
    }
  }, []);

  const verifyOtp = useCallback(async (userId, code, options = {}) => {
    // Wait up to 3s for sessionId if generateOtp is still in flight
    let waited = 0;
    while (!otpSessionRef.current && waited < 3000) {
      await new Promise((r) => setTimeout(r, 200));
      waited += 200;
    }
    try {
      await api.post("/api/auth/otp/verify/", {
        sessionId: otpSessionRef.current,
        code,
      });
      otpSessionRef.current = null;
      return { success: true };
    } catch (err) {
      const reason = err.response?.data?.reason ?? "otp_wrong";
      return { success: false, reason };
    }
  }, []);

  const resendOtp = useCallback(async (userId, options = {}) => {
    try {
      const { data } = await api.post("/api/auth/otp/request/", {
        userId,
        purpose: options.purpose ?? "step_up",
      });
      otpSessionRef.current = data.sessionId;
    } catch (_) {}
  }, []);

  // ── Orders ──────────────────────────────────────────────────

  const addOrder = useCallback(async (orderInput) => {
    const { data } = await api.post("/api/store/orders/", {
      ...orderInput,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
    return data.order;
  }, [refresh]);

  const approveOrder = useCallback(async (orderId) => {
    await api.patch(`/api/store/orders/${orderId}/approve/`, {
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const rejectOrder = useCallback(async (orderId, reason) => {
    await api.patch(`/api/store/orders/${orderId}/reject/`, {
      reason,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const shipOrder = useCallback(async (orderId, courier, trackingNumber) => {
    await api.patch(`/api/store/orders/${orderId}/ship/`, {
      courier,
      trackingNumber,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const deliverOrder = useCallback(async (orderId, deliveryProof) => {
    await api.patch(`/api/store/orders/${orderId}/deliver/`, {
      deliveryProof,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const cancelOrder = useCallback(async (orderId, reason) => {
    await api.patch(`/api/store/orders/${orderId}/cancel/`, {
      reason,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const getOrder = useCallback(
    (orderId) => storeRef.current.orders.find((o) => o.id === orderId),
    []
  );

  // ── Returns ─────────────────────────────────────────────────

  const addReturn = useCallback(async (returnInput) => {
    const { data } = await api.post("/api/store/returns/", {
      ...returnInput,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
    return data.return;
  }, [refresh]);

  const updateReturn = useCallback(async (returnId, patch) => {
    await api.patch(`/api/store/returns/${returnId}/`, {
      ...patch,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const getReturn = useCallback(
    (returnId) => storeRef.current.returns.find((r) => r.id === returnId),
    []
  );

  // ── Flags ────────────────────────────────────────────────────

  const addFlag = useCallback(async (flag) => {
    const { data } = await api.post("/api/store/flags/", {
      ...flag,
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
    return data.flag;
  }, [refresh]);

  const reviewFlag = useCallback(async (flagId) => {
    await api.patch(`/api/store/flags/${flagId}/review/`, {
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  const resolveFlag = useCallback(async (flagId) => {
    await api.patch(`/api/store/flags/${flagId}/resolve/`, {
      actorId: sessionRef.current?.userId,
      actorRole: sessionRef.current?.role,
    });
    await refresh();
  }, [refresh]);

  // ── Timeline ─────────────────────────────────────────────────

  const addTimelineEvent = useCallback(async (event) => {
    try {
      await api.post("/api/store/timeline/", event);
    } catch (_) {}
  }, []);

  // ── Device trust ─────────────────────────────────────────────

  const trustDevice = useCallback(async (userId, fingerprint, ipAddress, userAgent, label) => {
    try {
      const deviceId = `DEV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const { data } = await api.post("/api/store/devices/trust/", {
        id: deviceId,
        userId,
        fingerprintHash: fingerprint,
        deviceLabel: label ?? "Browser session",
        userAgent,
        firstSeenIp: ipAddress,
        lastSeenIp: ipAddress,
        deviceToken: `dt_${userId}_${Date.now()}`,
        fingerprintSimilarity: 95,
        subnetSimilarity: 90,
        userAgentMatch: true,
      });
      await refresh();
      return data.device;
    } catch (_) {
      return null;
    }
  }, [refresh]);

  // ── Reviews ───────────────────────────────────────────────────

  const submitReview = useCallback(async (productId, orderId, rating) => {
    const userId = sessionRef.current?.userId;
    if (!userId) throw new Error("Not logged in");
    const { data } = await api.post("/api/store/reviews/", { productId, userId, orderId, rating });
    setStoreData((prev) => {
      const filtered = prev.productReviews.filter(
        (r) => !(r.productId === productId && r.userId === userId && r.orderId === orderId)
      );
      const updatedProduct = data.product;
      const updatedProducts = prev.products.map((p) =>
        p.id === updatedProduct.id ? updatedProduct : p
      );
      return {
        ...prev,
        productReviews: [
          ...filtered,
          { productId, userId, orderId, rating, reviewId: data.product?.id ?? "" },
        ],
        products: updatedProducts,
      };
    });
    return data;
  }, []);

  // ── Admin reset (just refreshes from DB) ─────────────────────

  const resetAllMockData = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // ── Derived state ─────────────────────────────────────────────

  const currentUser = session
    ? storeData.users.find((u) => u.id === session.userId) ?? null
    : null;

  const openFlagCount = storeData.monitoringFlags.filter((f) => f.status === "open").length;

  // Full mockStore object (includes session for backwards compat with admin/risk-data.js)
  const mockStore = { ...storeData, session };

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", fontFamily: "sans-serif", color: "#999", fontSize: "14px",
      }}>
        Memuat data...
      </div>
    );
  }

  return (
    <MockDataContext.Provider
      value={{
        mockStore,
        users: storeData.users,
        categories: storeData.categories,
        products: storeData.products,
        productReviews: storeData.productReviews,
        submitReview,
        session,
        currentUser,
        otpRecords: [],
        loginAttempts: storeData.loginAttempts,
        trustedDevices: storeData.trustedDevices,
        monitoringFlags: storeData.monitoringFlags,
        activityTimeline: storeData.activityTimeline,
        activityLogs: storeData.activityTimeline,
        orders: storeData.orders,
        returns: storeData.returns,
        openFlagCount,
        loading,
        refresh,
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
