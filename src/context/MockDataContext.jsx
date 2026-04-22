// ─────────────────────────────────────────────────────────────
//  CareOfYou — MockDataContext
//  Central React context untuk semua mock/dummy data.
//  Satu provider, satu source of truth.
//
//  Usage:
//    const { session, loginUser, generateOtp, verifyOtp, ... } = useMockData();
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  SEED_USERS,
  SEED_LOGIN_ATTEMPTS,
  SEED_TRUSTED_DEVICES,
  SEED_MONITORING_FLAGS,
  SEED_ACTIVITY_TIMELINE,
  SEED_ORDERS,
  SEED_RETURNS,
} from "../data/seeds.js";
import {
  KEYS,
  loadFromStorage,
  saveToStorage,
  resetAllStorage,
} from "../lib/storage.js";
import {
  validateCredentials,
  buildLoginAttempt,
  checkDeviceTrust,
  generateOtpRecord,
  verifyOtpRecord,
  resendOtpRecord,
  getMockFingerprint,
  getMockIp,
} from "../lib/authService.js";
import { buildTimelineEvent } from "../lib/riskEngine.js";

// ─────────────────────────────────────────────────────────────

const MockDataContext = createContext(null);

export function MockDataProvider({ children }) {
  // ── State — semuanya di-load dari localStorage (fallback ke seed) ──
  const [users, setUsers] = useState(() =>
    loadFromStorage(KEYS.USERS, SEED_USERS)
  );
  const [session, setSession] = useState(() =>
    loadFromStorage(KEYS.SESSION, null)
  );
  const [otpRecords, setOtpRecords] = useState(() =>
    loadFromStorage(KEYS.OTP_RECORDS, [])
  );
  const [loginAttempts, setLoginAttempts] = useState(() =>
    loadFromStorage(KEYS.LOGIN_ATTEMPTS, SEED_LOGIN_ATTEMPTS)
  );
  const [trustedDevices, setTrustedDevices] = useState(() =>
    loadFromStorage(KEYS.TRUSTED_DEVICES, SEED_TRUSTED_DEVICES)
  );
  const [monitoringFlags, setMonitoringFlags] = useState(() =>
    loadFromStorage(KEYS.MONITORING_FLAGS, SEED_MONITORING_FLAGS)
  );
  const [activityTimeline, setActivityTimeline] = useState(() =>
    loadFromStorage(KEYS.ACTIVITY_TIMELINE, SEED_ACTIVITY_TIMELINE)
  );

  // ── Persist ke localStorage setiap state berubah ──────────────
  useEffect(() => { saveToStorage(KEYS.USERS, users); }, [users]);
  useEffect(() => { saveToStorage(KEYS.SESSION, session); }, [session]);
  useEffect(() => { saveToStorage(KEYS.OTP_RECORDS, otpRecords); }, [otpRecords]);
  useEffect(() => { saveToStorage(KEYS.LOGIN_ATTEMPTS, loginAttempts); }, [loginAttempts]);
  useEffect(() => { saveToStorage(KEYS.TRUSTED_DEVICES, trustedDevices); }, [trustedDevices]);
  useEffect(() => { saveToStorage(KEYS.MONITORING_FLAGS, monitoringFlags); }, [monitoringFlags]);
  useEffect(() => { saveToStorage(KEYS.ACTIVITY_TIMELINE, activityTimeline); }, [activityTimeline]);

  // ── Timeline helper ────────────────────────────────────────────
  const addTimelineEvent = useCallback((event) => {
    setActivityTimeline((prev) => [event, ...prev]);
  }, []);

  // ── Flag helpers ───────────────────────────────────────────────
  const addFlag = useCallback((flag) => {
    setMonitoringFlags((prev) => [flag, ...prev]);
  }, []);

  const resolveFlag = useCallback((flagId) => {
    setMonitoringFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, status: "resolved" } : f))
    );
  }, []);

  const reviewFlag = useCallback((flagId) => {
    setMonitoringFlags((prev) =>
      prev.map((f) => (f.id === flagId ? { ...f, status: "reviewed" } : f))
    );
  }, []);

  // ── LOGIN ──────────────────────────────────────────────────────
  /**
   * Coba login dengan email & password.
   *
   * Return:
   *   { success: false, reason: string, ... }
   *   { success: true, user, deviceStatus, deviceInfo, needsOtp }
   *
   * Side effects:
   *   - Tambah login attempt record
   *   - Update failedLoginCount / lockedUntil di user
   *   - Tambah timeline event
   */
  const loginUser = useCallback(
    (email, password) => {
      const fingerprint  = getMockFingerprint();
      const currentIp    = getMockIp();
      const currentUa    = navigator.userAgent;

      const result = validateCredentials(email, password, users);

      // Catat attempt (berhasil maupun gagal)
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
      setLoginAttempts((prev) => [...prev, attempt]);

      if (!result.valid) {
        // Update failedLoginCount / lock
        if (result.newFailCount !== undefined) {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === result.user.id
                ? {
                    ...u,
                    failedLoginCount: result.newFailCount,
                    lockedUntil: result.willLock
                      ? new Date(Date.now() + 30 * 60000).toISOString()
                      : null,
                  }
                : u
            )
          );
        }
        addTimelineEvent(
          buildTimelineEvent(
            result.user?.id,
            result.user?.role ?? "unknown",
            "login_failed",
            `Login gagal: ${result.reason} (${email})`,
            { email, reason: result.reason, ip: currentIp }
          )
        );
        return { success: false, ...result };
      }

      // Login berhasil — reset failed count
      setUsers((prev) =>
        prev.map((u) =>
          u.id === result.user.id
            ? { ...u, failedLoginCount: 0, lockedUntil: null }
            : u
        )
      );

      // Cek device trust
      const deviceResult = checkDeviceTrust(
        result.user.id,
        fingerprint,
        currentIp,
        currentUa,
        trustedDevices
      );

      addTimelineEvent(
        buildTimelineEvent(
          result.user.id,
          result.user.role,
          "login_success",
          `Login berhasil: ${email}`,
          { email, deviceStatus: deviceResult.status, ip: currentIp }
        )
      );

      if (deviceResult.status === "new") {
        addTimelineEvent(
          buildTimelineEvent(
            result.user.id,
            result.user.role,
            "new_device_detected",
            `Device baru terdeteksi saat login`,
            { fingerprint, ip: currentIp }
          )
        );
      } else if (deviceResult.status === "trusted") {
        addTimelineEvent(
          buildTimelineEvent(
            result.user.id,
            result.user.role,
            "trusted_device_matched",
            `Trusted device cocok: ${deviceResult.device?.deviceLabel ?? "unknown"}`,
            { deviceToken: deviceResult.device?.deviceToken }
          )
        );
      } else if (deviceResult.status === "known-unusual-network") {
        addTimelineEvent(
          buildTimelineEvent(
            result.user.id,
            result.user.role,
            "known_device_unusual_network",
            `Device dikenal tapi jaringan tidak biasa`,
            {
              deviceLabel: deviceResult.device?.deviceLabel,
              ip: currentIp,
              subnetSim: deviceResult.subnetSim,
            }
          )
        );
      }

      // Hanya butuh OTP kalau 2FA enabled (admin). Customer langsung masuk.
      const needsOtp = result.user.twoFactorEnabled;

      return {
        success: true,
        user: {
          id:               result.user.id,
          email:            result.user.email,
          name:             result.user.name,
          role:             result.user.role,
          twoFactorEnabled: result.user.twoFactorEnabled,
        },
        deviceStatus: deviceResult.status,
        deviceInfo:   deviceResult,
        needsOtp,
      };
    },
    [users, trustedDevices, addTimelineEvent]
  );

  // ── LOGOUT ─────────────────────────────────────────────────────
  const logoutUser = useCallback(() => {
    if (session) {
      addTimelineEvent(
        buildTimelineEvent(
          session.userId,
          session.role,
          "logout",
          `Logout: ${session.email}`
        )
      );
    }
    setSession(null);
  }, [session, addTimelineEvent]);

  // ── SET SESSION ────────────────────────────────────────────────
  /**
   * Panggil ini setelah login+OTP berhasil untuk simpan sesi aktif.
   */
  const setUserSession = useCallback((user) => {
    const s = {
      userId:  user.id,
      email:   user.email,
      name:    user.name,
      role:    user.role,
      loginAt: new Date().toISOString(),
    };
    setSession(s);
    return s;
  }, []);

  // ── OTP ────────────────────────────────────────────────────────
  /**
   * Generate OTP baru untuk userId dan simpan ke otpRecords.
   * Return: OTP record yang baru dibuat (dengan code di dalamnya).
   */
  const generateOtp = useCallback(
    (userId) => {
      const record = generateOtpRecord(userId);
      setOtpRecords((prev) => [...prev, record]);
      addTimelineEvent(
        buildTimelineEvent(userId, null, "otp_requested", `OTP diminta untuk user ${userId}`)
      );
      return record;
    },
    [addTimelineEvent]
  );

  /**
   * Verifikasi kode OTP yang diinput.
   * Return: { success, reason, updatedRecord? }
   */
  const verifyOtp = useCallback(
    (userId, code) => {
      const result = verifyOtpRecord(userId, code, otpRecords);
      if (result.updatedRecord) {
        setOtpRecords((prev) =>
          prev.map((r) =>
            r.id === result.updatedRecord.id ? result.updatedRecord : r
          )
        );
      }
      const ok       = result.success;
      const evtType  = ok ? "otp_verified" : "otp_failed";
      const evtLabel = ok
        ? `OTP berhasil diverifikasi (${userId})`
        : `OTP gagal: ${result.reason} (${userId})`;
      addTimelineEvent(
        buildTimelineEvent(userId, null, evtType, evtLabel, {
          reason: result.reason,
          attempts: result.updatedRecord?.attempts,
        })
      );
      return result;
    },
    [otpRecords, addTimelineEvent]
  );

  /**
   * Resend OTP — expire yang lama, buat baru.
   */
  const resendOtp = useCallback(
    (userId) => {
      const { expiredRecords, newRecord } = resendOtpRecord(userId, otpRecords);
      setOtpRecords([...expiredRecords, newRecord]);
      addTimelineEvent(
        buildTimelineEvent(
          userId,
          null,
          "otp_resent",
          `OTP di-resend (resend #${newRecord.resendCount}) untuk user ${userId}`,
          { resendCount: newRecord.resendCount }
        )
      );
      return newRecord;
    },
    [otpRecords, addTimelineEvent]
  );

  // ── TRUSTED DEVICE ─────────────────────────────────────────────
  /**
   * Daftarkan device baru sebagai trusted untuk userId.
   */
  const trustDevice = useCallback(
    (userId, fingerprint, ip, ua, label) => {
      const device = {
        id: `DEV-${Date.now()}`,
        userId,
        deviceToken: `dt_${userId}_${Date.now()}`,
        fingerprintHash: fingerprint,
        deviceLabel: label ?? "Browser (Chrome)",
        userAgent: ua,
        firstSeenIp: ip,
        lastSeenIp: ip,
        trustedStatus: "trusted",
        fingerprintSimilarity: 95,
        subnetSimilarity: 90,
        userAgentMatch: true,
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        lastVerificationAt: new Date().toISOString(),
      };
      setTrustedDevices((prev) => [device, ...prev]);
      addTimelineEvent(
        buildTimelineEvent(
          userId,
          null,
          "device_trusted",
          `Device baru didaftarkan sebagai trusted: ${device.deviceLabel}`,
          { deviceToken: device.deviceToken }
        )
      );
      return device;
    },
    [addTimelineEvent]
  );

  // ── RESET ──────────────────────────────────────────────────────
  /**
   * Reset semua mock data ke initial seed.
   * Berguna untuk testing ulang dari awal.
   */
  const resetAllMockData = useCallback(() => {
    resetAllStorage({
      USERS:             SEED_USERS,
      SESSION:           null,
      OTP_RECORDS:       [],
      LOGIN_ATTEMPTS:    SEED_LOGIN_ATTEMPTS,
      TRUSTED_DEVICES:   SEED_TRUSTED_DEVICES,
      MONITORING_FLAGS:  SEED_MONITORING_FLAGS,
      ACTIVITY_TIMELINE: SEED_ACTIVITY_TIMELINE,
      ORDERS:            SEED_ORDERS,
      RETURNS:           SEED_RETURNS,
    });
    setUsers([...SEED_USERS]);
    setSession(null);
    setOtpRecords([]);
    setLoginAttempts([...SEED_LOGIN_ATTEMPTS]);
    setTrustedDevices([...SEED_TRUSTED_DEVICES]);
    setMonitoringFlags([...SEED_MONITORING_FLAGS]);
    setActivityTimeline([...SEED_ACTIVITY_TIMELINE]);
  }, []);

  // ── Computed / derived values ──────────────────────────────────
  const openFlagCount = monitoringFlags.filter((f) => f.status === "open").length;
  const currentUser = session
    ? users.find((u) => u.id === session.userId) ?? null
    : null;

  // ── Context value ──────────────────────────────────────────────
  return (
    <MockDataContext.Provider
      value={{
        // ── State
        users,
        session,
        currentUser,
        otpRecords,
        loginAttempts,
        trustedDevices,
        monitoringFlags,
        activityTimeline,
        openFlagCount,

        // ── Auth actions
        loginUser,
        logoutUser,
        setUserSession,

        // ── OTP actions
        generateOtp,
        verifyOtp,
        resendOtp,

        // ── Device actions
        trustDevice,

        // ── Flag / timeline actions
        addFlag,
        resolveFlag,
        reviewFlag,
        addTimelineEvent,

        // ── Reset
        resetAllMockData,
      }}
    >
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const ctx = useContext(MockDataContext);
  if (!ctx) {
    throw new Error("useMockData() harus dipakai di dalam <MockDataProvider>");
  }
  return ctx;
}
