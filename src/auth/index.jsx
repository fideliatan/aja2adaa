import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./index.css";
import { useMockData } from "../context/MockDataContext.jsx";

const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RESEND_SECONDS = 30;
const OTP_LOCK_SECONDS = 20;

const PANEL_COPY = {
  login: {
    heading: "Welcome back.",
    sub: "Sign in and continue\nyour skincare journey.",
  },
  register: {
    heading: "Join careofyou.",
    sub: "Create an account and start\nglowing today.",
  },
};

const createEmptyOtp = () => Array(OTP_LENGTH).fill("");

const maskEmail = (email) => {
  const [localPart = "", domain = ""] = email.split("@");

  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0] ?? ""}***@${domain}`;
  }

  return `${localPart[0]}${"*".repeat(Math.max(localPart.length - 2, 1))}${localPart.slice(-1)}@${domain}`;
};

const getOtpNotice = (email) =>
  `Kode verifikasi sudah dikirim ke ${maskEmail(email)}. Cek inbox atau folder spam.`;

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 4v5c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V7l7-4z" />
    <path d="M9.5 12.5l1.75 1.75L14.5 11" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

function PwField({ label, name, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);

  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="field-pw-wrap">
        <input
          className="field-input"
          type={show ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        <button type="button" className="pw-toggle" onClick={() => setShow((current) => !current)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const switchTimerRef = useRef(null);
  const otpInputsRef = useRef([]);

  const { loginUser, verifyOtp, setUserSession, generateOtp, resendOtp } = useMockData();
  const [pendingUser, setPendingUser] = useState(null);

  const [mode, setMode] = useState(
    location.pathname === "/register" ? "register" : "login"
  );
  const [panelText, setPanelText] = useState(PANEL_COPY[mode]);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState(createEmptyOtp);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(OTP_MAX_ATTEMPTS);
  const [otpResendSeconds, setOtpResendSeconds] = useState(OTP_RESEND_SECONDS);
  const [otpLockSeconds, setOtpLockSeconds] = useState(0);

  useEffect(() => {
    return () => {
      window.clearTimeout(switchTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!otpModalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => otpInputsRef.current[0]?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [otpModalOpen]);

  useEffect(() => {
    if (!otpModalOpen || otpResendSeconds <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setOtpResendSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpModalOpen, otpResendSeconds]);

  useEffect(() => {
    if (!otpModalOpen || otpLockSeconds <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setOtpLockSeconds((seconds) => seconds - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpModalOpen, otpLockSeconds]);

  useEffect(() => {
    if (!otpModalOpen || otpLockSeconds !== 0 || otpAttemptsLeft !== 0) return;

    setOtpAttemptsLeft(OTP_MAX_ATTEMPTS);
    setOtpNotice("Sesi verifikasi aktif lagi. Silakan masukkan kode OTP terbaru.");
    window.requestAnimationFrame(() => otpInputsRef.current[0]?.focus());
  }, [otpAttemptsLeft, otpLockSeconds, otpModalOpen]);

  const resetOtpFlow = (email = "") => {
    setOtpDigits(createEmptyOtp());
    setOtpLoading(false);
    setOtpError("");
    setOtpNotice(
      email ? `${getOtpNotice(email)} Untuk testing gunakan kode 123456.` : ""
    );
    setOtpAttemptsLeft(OTP_MAX_ATTEMPTS);
    setOtpResendSeconds(OTP_RESEND_SECONDS);
    setOtpLockSeconds(0);
  };

  const openOtpModal = (email) => {
    resetOtpFlow(email);
    setOtpModalOpen(true);
  };

  const closeOtpModal = () => {
    setOtpModalOpen(false);
    resetOtpFlow();
  };

  const focusOtpInput = (index) => {
    otpInputsRef.current[index]?.focus();
    otpInputsRef.current[index]?.select?.();
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;

    window.clearTimeout(switchTimerRef.current);
    navigate(nextMode === "login" ? "/login" : "/register", { replace: true });
    switchTimerRef.current = window.setTimeout(() => {
      setPanelText(PANEL_COPY[nextMode]);
    }, 320);
    setMode(nextMode);
    setLoginError("");
    setRegError("");

    if (otpModalOpen) {
      closeOtpModal();
    }
  };

  const LOGIN_ERROR_MSG = {
    user_not_found:    "Email atau password salah.",
    wrong_password:    "Email atau password salah.",
    account_locked:    "Akun terkunci sementara. Coba lagi beberapa menit lagi.",
    account_suspended: "Akun ini telah dinonaktifkan. Hubungi kami untuk bantuan.",
  };

  const handleLogin = (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const email    = loginForm.email.trim().toLowerCase();
    const password = loginForm.password;

    window.setTimeout(() => {
      setLoginLoading(false);

      const result = loginUser(email, password);

      if (!result.success) {
        setLoginError(LOGIN_ERROR_MSG[result.reason] ?? "Login gagal. Silakan coba lagi.");
        return;
      }

      setPendingUser({
        ...result.user,
        deviceStatus: result.deviceStatus,
        deviceInfo: result.deviceInfo,
        riskSummary: result.riskSummary,
      });

      if (result.needsOtp) {
        generateOtp(result.user.id, { purpose: "login" });
        openOtpModal(email);
      } else {
        setUserSession(result.user, {
          deviceStatus: result.deviceStatus,
          deviceInfo: result.deviceInfo,
          riskSummary: result.riskSummary,
        });
        navigate("/");
      }
    }, 900);
  };

  const handleRegister = (event) => {
    event.preventDefault();

    if (regForm.password !== regForm.confirm) {
      setRegError("Passwords do not match.");
      return;
    }

    if (regForm.password.length < 6) {
      setRegError("Password must be at least 6 characters.");
      return;
    }

    setRegLoading(true);
    setRegError("");

    window.setTimeout(() => {
      setRegLoading(false);
      switchMode("login");
    }, 1000);
  };

  const handleOtpChange = (value, index) => {
    if (otpLockSeconds > 0 || otpLoading) return;

    const digit = value.replace(/\D/g, "").slice(-1);

    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });

    if (otpError) {
      setOtpError("");
    }

    if (digit && index < OTP_LENGTH - 1) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpKeyDown = (event, index) => {
    if (otpLoading || otpLockSeconds > 0) return;

    if (event.key === "Backspace") {
      event.preventDefault();

      if (otpDigits[index]) {
        setOtpDigits((current) => {
          const next = [...current];
          next[index] = "";
          return next;
        });
        return;
      }

      if (index > 0) {
        setOtpDigits((current) => {
          const next = [...current];
          next[index - 1] = "";
          return next;
        });
        focusOtpInput(index - 1);
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusOtpInput(index + 1);
    }
  };

  const handleOtpPaste = (event) => {
    if (otpLockSeconds > 0 || otpLoading) return;

    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    const nextOtp = createEmptyOtp();
    pasted.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtpDigits(nextOtp);
    setOtpError("");
    focusOtpInput(Math.min(pasted.length, OTP_LENGTH) - 1);
  };

  const handleOtpSubmit = (event) => {
    event.preventDefault();

    if (otpLockSeconds > 0) {
      setOtpError(`Terlalu banyak percobaan. Coba lagi dalam ${otpLockSeconds} detik.`);
      return;
    }

    const code = otpDigits.join("");

    if (code.length !== OTP_LENGTH) {
      setOtpError("Masukkan 6 digit OTP terlebih dahulu.");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    window.setTimeout(() => {
      setOtpLoading(false);

      const result = verifyOtp(pendingUser.id, code, { purpose: "login" });

      if (result.success) {
        closeOtpModal();
        setUserSession(pendingUser, {
          deviceStatus: pendingUser.deviceStatus,
          deviceInfo: pendingUser.deviceInfo,
          riskSummary: pendingUser.riskSummary,
        });
        navigate(pendingUser.role === "admin" ? "/admin" : "/");
        return;
      }

      setOtpDigits(createEmptyOtp());
      window.requestAnimationFrame(() => otpInputsRef.current[0]?.focus());

      if (result.reason === "otp_max_attempts" || result.reason === "otp_expired") {
        setOtpAttemptsLeft(0);
        setOtpLockSeconds(OTP_LOCK_SECONDS);
        setOtpResendSeconds(OTP_RESEND_SECONDS);
        setOtpError(`OTP salah 3 kali. Sistem dikunci ${OTP_LOCK_SECONDS} detik sebelum bisa dicoba lagi.`);
        return;
      }

      const nextAttempts = otpAttemptsLeft - 1;
      if (nextAttempts <= 0) {
        setOtpAttemptsLeft(0);
        setOtpLockSeconds(OTP_LOCK_SECONDS);
        setOtpResendSeconds(OTP_RESEND_SECONDS);
        setOtpError(`OTP salah 3 kali. Sistem dikunci ${OTP_LOCK_SECONDS} detik sebelum bisa dicoba lagi.`);
        return;
      }
      setOtpAttemptsLeft(nextAttempts);
      setOtpError(`OTP salah. Sisa percobaan ${nextAttempts} kali.`);
    }, 800);
  };

  const handleOtpResend = () => {
    if (otpResendSeconds > 0 || otpLoading || otpLockSeconds > 0 || !pendingUser) return;

    resendOtp(pendingUser.id, { purpose: "login" });
    setOtpDigits(createEmptyOtp());
    setOtpError("");
    setOtpAttemptsLeft(OTP_MAX_ATTEMPTS);
    setOtpResendSeconds(OTP_RESEND_SECONDS);
    setOtpNotice("Kode OTP baru sudah dikirim. Untuk testing gunakan kode 123456.");
    window.requestAnimationFrame(() => otpInputsRef.current[0]?.focus());
  };

  const isLogin = mode === "login";
  const otpStatusText =
    otpLockSeconds > 0
      ? `Tunggu ${otpLockSeconds} detik`
      : otpResendSeconds > 0
        ? `Kirim ulang dalam ${otpResendSeconds} detik`
        : "Bisa kirim ulang sekarang";

  return (
    <div className={`auth-page${otpModalOpen ? " modal-open" : ""}`}>
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <div className={`auth-panel${isLogin ? " panel-right" : " panel-left"}`}>
        <div className="panel-circle panel-circle-a" />
        <div className="panel-circle panel-circle-b" />

        <div className="panel-content">
          <div className="panel-logo-wrap">
            <img src="/logo-careofyou.png" alt="Careofyou" className="panel-logo" />
          </div>
          <p className="panel-brand">careofyou</p>
          <h2 className="panel-heading">{panelText.heading}</h2>
          <p className="panel-sub">{panelText.sub}</p>
          <div className="panel-dots">
            <span className={isLogin ? "dot dot-active" : "dot"} onClick={() => switchMode("login")} />
            <span className={!isLogin ? "dot dot-active" : "dot"} onClick={() => switchMode("register")} />
          </div>
        </div>
      </div>

      <div className={`auth-side auth-side-left${isLogin ? " side-visible" : " side-hidden side-hidden-left"}`}>
        <div className="auth-card">
          <div className="auth-card-top">
            <h2 className="auth-title">Sign in</h2>
            <p className="auth-subtitle">Good to have you back.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, email: event.target.value })
                }
                required
              />
            </div>

            <PwField
              label="Password"
              name="password"
              placeholder="........"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm({ ...loginForm, password: event.target.value })
              }
            />

            <div className="forgot-row">
              <a href="/forgot-password" className="forgot-link">Forgot password?</a>
            </div>

            {loginError && <p className="auth-error">{loginError}</p>}

            <button type="submit" className="auth-btn" disabled={loginLoading}>
              {loginLoading ? <span className="auth-spinner" /> : "Sign In"}
            </button>
          </form>
          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <span onClick={() => switchMode("register")}>Create one</span>
          </p>
        </div>
      </div>

      <div className={`auth-side auth-side-right${!isLogin ? " side-visible" : " side-hidden side-hidden-right"}`}>
        <div className="auth-card">
          <div className="auth-card-top">
            <h2 className="auth-title">Create account</h2>
            <p className="auth-subtitle">Let&apos;s get you glowing.</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input
                className="field-input"
                type="text"
                placeholder="Sara Tancredi"
                value={regForm.name}
                onChange={(event) =>
                  setRegForm({ ...regForm, name: event.target.value })
                }
                required
              />
            </div>

            <div className="field-group">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={regForm.email}
                onChange={(event) =>
                  setRegForm({ ...regForm, email: event.target.value })
                }
                required
              />
            </div>

            <PwField
              label="Password"
              name="password"
              placeholder="Min. 6 characters"
              value={regForm.password}
              onChange={(event) =>
                setRegForm({ ...regForm, password: event.target.value })
              }
            />

            <PwField
              label="Confirm Password"
              name="confirm"
              placeholder="Repeat your password"
              value={regForm.confirm}
              onChange={(event) =>
                setRegForm({ ...regForm, confirm: event.target.value })
              }
            />

            {regError && <p className="auth-error">{regError}</p>}

            <button type="submit" className="auth-btn" disabled={regLoading}>
              {regLoading ? <span className="auth-spinner" /> : "Create Account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <span onClick={() => switchMode("login")}>Sign in</span>
          </p>
        </div>
      </div>

      {otpModalOpen && (
        <div className="otp-modal" role="presentation">
          <div className="otp-modal-backdrop" onClick={closeOtpModal} />

          <div className="otp-dialog" role="dialog" aria-modal="true" aria-labelledby="otp-title">
            <button type="button" className="otp-close-btn" onClick={closeOtpModal} aria-label="Close OTP popup">
              <IconClose />
            </button>

            <div className="otp-header">
              <div className="otp-icon-wrap">
                <IconShield />
              </div>

              <div className="otp-header-copy">
                <p className="otp-kicker">Admin verification</p>
                <h3 id="otp-title" className="otp-title">Masukkan OTP 6 digit</h3>
                <p className="otp-subtitle">
                  Kami sudah mengirim kode verifikasi ke email admin terdaftar sebelum dashboard bisa dibuka.
                </p>
              </div>
            </div>

            <form className="otp-form" onSubmit={handleOtpSubmit}>
              <div className="otp-input-row">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpInputsRef.current[index] = element;
                    }}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpChange(event.target.value, index)}
                    onKeyDown={(event) => handleOtpKeyDown(event, index)}
                    onPaste={handleOtpPaste}
                    aria-label={`OTP digit ${index + 1}`}
                    disabled={otpLoading || otpLockSeconds > 0}
                  />
                ))}
              </div>

              <div className="otp-meta-row">
                <span className="otp-meta-chip">
                  <IconClock />
                  {otpStatusText}
                </span>
                <span className={`otp-meta-chip otp-meta-chip-soft${otpAttemptsLeft === 0 ? " otp-meta-chip-warning" : ""}`}>
                  {otpAttemptsLeft === 0 ? "Menunggu sistem terbuka" : `Sisa ${otpAttemptsLeft} percobaan`}
                </span>
              </div>

              {otpError ? (
                <p className="otp-feedback otp-feedback-error">{otpError}</p>
              ) : (
                <p className="otp-feedback otp-feedback-info">{otpNotice}</p>
              )}

              <div className="otp-actions">
                <button
                  type="button"
                  className="otp-secondary-btn"
                  onClick={handleOtpResend}
                  disabled={otpResendSeconds > 0 || otpLoading || otpLockSeconds > 0}
                >
                  Resend code
                </button>
                <button
                  type="submit"
                  className="otp-primary-btn"
                  disabled={otpLoading || otpLockSeconds > 0}
                >
                  {otpLoading ? <span className="auth-spinner" /> : "Verify & Enter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
