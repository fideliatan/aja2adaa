import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api.js";
import "./index.css";

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const OTP_RESEND_SECONDS = 30;

const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M5 12l7-7M5 12l7 7" />
  </svg>
);

const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function PwField({ label, placeholder, value, onChange }) {
  const [show, setShow] = useState(false);

  return (
    <div className="fp-field-group">
      <label className="fp-field-label">{label}</label>
      <div className="fp-pw-wrap">
        <span className="fp-input-icon"><IconLock /></span>
        <input
          className="fp-field-input fp-field-input--pw"
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
        />
        <button type="button" className="fp-pw-toggle" onClick={() => setShow((current) => !current)}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  );
}

function StrengthBar({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ["", "Lemah", "Sedang", "Bagus", "Kuat"];
  const colors = ["", "#e07a73", "#e8a85a", "#6cbf8a", "#44b07a"];

  if (!password) return null;

  return (
    <div className="fp-strength">
      <div className="fp-strength-bars">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="fp-strength-bar"
            style={{ background: item <= score ? colors[score] : "#ede0de" }}
          />
        ))}
      </div>
      <span className="fp-strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

const PANEL = {
  1: {
    heading: "Ayo bantu kamu masuk lagi.",
    sub: "Masukkan email yang terhubung ke akunmu dan kami akan kirim OTP reset password.",
  },
  2: {
    heading: "Cek inboxmu.",
    sub: "Kami sudah kirim OTP 6 digit ke emailmu. Masukkan kode terbaru untuk lanjut.",
  },
  3: {
    heading: "Hampir selesai.",
    sub: "Buat password baru yang kuat untuk akun careofyou-mu.",
  },
};

const createEmptyOtp = () => Array(OTP_LENGTH).fill("");

const formatSeconds = (value) => {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const inputs = useRef([]);

  const [step, setStep] = useState(1);
  const [panelCopy, setPanelCopy] = useState(PANEL[1]);
  const [sessionId, setSessionId] = useState("");

  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [otp, setOtp] = useState(createEmptyOtp);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendSeconds, setResendSeconds] = useState(OTP_RESEND_SECONDS);

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");

  useEffect(() => {
    if (step !== 2 || otpExpirySeconds <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setOtpExpirySeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [otpExpirySeconds, step]);

  useEffect(() => {
    if (step !== 2 || resendSeconds <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setResendSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendSeconds, step]);

  const goToStep = (nextStep) => {
    window.setTimeout(() => setPanelCopy(PANEL[nextStep]), 300);
    setStep(nextStep);
  };

  const resetOtpState = () => {
    setOtp(createEmptyOtp());
    setOtpError("");
    setOtpExpirySeconds(OTP_EXPIRY_SECONDS);
    setResendSeconds(OTP_RESEND_SECONDS);
  };

  const focusOtpInput = (index) => {
    inputs.current[index]?.focus();
    inputs.current[index]?.select?.();
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    setEmailError("");
    if (!normalizedEmail) {
      setEmailError("Masukkan alamat email kamu.");
      return;
    }

    setEmailLoading(true);

    try {
      const { data } = await api.post("/api/auth/password/forgot/", {
        email: normalizedEmail,
      });
      setEmail(normalizedEmail);
      setSessionId(data.sessionId);
      resetOtpState();
      goToStep(2);
      window.requestAnimationFrame(() => focusOtpInput(0));
    } catch (error) {
      const message = error.response?.data?.error ?? "Gagal mengirim OTP reset password.";
      setEmailError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleOtpInput = (value, index) => {
    if (!/^[0-9]*$/.test(value)) return;

    const digit = value.slice(-1);
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (otpError) setOtpError("");

    if (digit && index < OTP_LENGTH - 1) {
      focusOtpInput(index + 1);
    }
  };

  const handleOtpKeyDown = (event, index) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      focusOtpInput(index - 1);
    }
  };

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
    const code = otp.join("");

    setOtpError("");
    if (code.length !== OTP_LENGTH) {
      setOtpError("Masukkan semua 6 digit OTP.");
      return;
    }

    setOtpLoading(true);

    try {
      await api.post("/api/auth/otp/verify/", {
        sessionId,
        code,
      });
      goToStep(3);
    } catch (error) {
      const reason = error.response?.data?.reason ?? "";
      const message = error.response?.data?.error ?? "OTP salah. Silakan coba lagi.";
      setOtp(createEmptyOtp());
      window.requestAnimationFrame(() => focusOtpInput(0));

      if (reason === "otp_expired") {
        setOtpExpirySeconds(0);
      }
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendSeconds > 0) return;

    setOtpLoading(true);
    setOtpError("");

    try {
      const { data } = await api.post("/api/auth/password/forgot/", {
        email,
      });
      setSessionId(data.sessionId);
      resetOtpState();
      window.requestAnimationFrame(() => focusOtpInput(0));
    } catch (error) {
      const message = error.response?.data?.error ?? "Gagal mengirim ulang OTP.";
      setOtpError(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handlePassSubmit = async (event) => {
    event.preventDefault();
    setPassError("");

    if (newPass.length < 6) {
      setPassError("Password minimal 6 karakter.");
      return;
    }

    if (newPass !== confirmPass) {
      setPassError("Password tidak cocok.");
      return;
    }

    setPassLoading(true);

    try {
      await api.post("/api/auth/password/reset/", {
        sessionId,
        newPassword: newPass,
      });
      navigate("/login");
    } catch (error) {
      const message = error.response?.data?.error ?? "Gagal mengatur ulang password.";
      setPassError(message);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="fp-page">
      <div className="fp-blob fp-blob-1" />
      <div className="fp-blob fp-blob-2" />
      <div className="fp-blob fp-blob-3" />

      <a href="/login" className="fp-back-link">
        <IconArrowLeft />
        Kembali ke Masuk
      </a>

      <div className="fp-container">
        <div className="fp-panel">
          <div className="fp-panel-circle fp-panel-circle-a" />
          <div className="fp-panel-circle fp-panel-circle-b" />
          <div className="fp-panel-circle fp-panel-circle-c" />
          <div className="fp-panel-content">
            <div className="fp-panel-logo-wrap">
              <img src="/logo-careofyou.png" alt="Careofyou" className="fp-panel-logo" />
            </div>
            <p className="fp-panel-brand">careofyou</p>
            <h2 className="fp-panel-heading">{panelCopy.heading}</h2>
            <p className="fp-panel-sub">{panelCopy.sub}</p>

            <div className="fp-steps">
              <div className={`fp-step${step >= 1 ? " fp-step-active" : ""}${step > 1 ? " fp-step-done" : ""}`}>
                <span className="fp-step-num">{step > 1 ? <IconCheck /> : "1"}</span>
                <span className="fp-step-text">Masukkan Email</span>
              </div>
              <div className="fp-step-line" />
              <div className={`fp-step${step >= 2 ? " fp-step-active" : ""}${step > 2 ? " fp-step-done" : ""}`}>
                <span className="fp-step-num">{step > 2 ? <IconCheck /> : "2"}</span>
                <span className="fp-step-text">Verifikasi Kode</span>
              </div>
              <div className="fp-step-line" />
              <div className={`fp-step${step >= 3 ? " fp-step-active" : ""}`}>
                <span className="fp-step-num">3</span>
                <span className="fp-step-text">Password Baru</span>
              </div>
            </div>
          </div>
        </div>

        <div className="fp-form-side">
          <div className={`fp-card fp-step-panel${step === 1 ? " fp-panel-visible" : " fp-panel-hidden fp-panel-hidden-left"}`}>
            <div className="fp-card-icon">
              <div className="fp-icon-ring"><IconMail /></div>
            </div>
            <div className="fp-card-top">
              <h2 className="fp-title">Lupa Password?</h2>
              <p className="fp-subtitle">Tenang saja - kami akan bantu kamu masuk lagi.</p>
            </div>
            <form className="fp-form" onSubmit={handleEmailSubmit}>
              <div className="fp-field-group">
                <label className="fp-field-label">Alamat Email</label>
                <div className="fp-input-wrap">
                  <span className="fp-input-icon"><IconMail /></span>
                  <input
                    className="fp-field-input"
                    type="email"
                    placeholder="kamu@contoh.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <p className="fp-field-hint">Kami akan kirim OTP 6 digit ke email ini.</p>
              </div>
              {emailError && <div className="fp-error">{emailError}</div>}
              <button type="submit" className="fp-btn" disabled={emailLoading}>
                {emailLoading ? <span className="fp-spinner" /> : <><span>Lanjutkan</span><IconArrowRight /></>}
              </button>
            </form>
            <p className="fp-login-link">
              Ingat passwordmu? <a href="/login">Masuk</a>
            </p>
          </div>

          <div className={`fp-card fp-step-panel${step === 2 ? " fp-panel-visible" : step < 2 ? " fp-panel-hidden fp-panel-hidden-right" : " fp-panel-hidden fp-panel-hidden-left"}`}>
            <div className="fp-card-icon">
              <div className="fp-icon-ring fp-icon-ring--shield"><IconShield /></div>
            </div>
            <div className="fp-card-top">
              <h2 className="fp-title">Verifikasi Email</h2>
              <p className="fp-subtitle">
                Masukkan kode 6 digit yang dikirim ke{" "}
                <span className="fp-email-highlight">{email || "emailmu"}</span>
              </p>
            </div>
            <form className="fp-form" onSubmit={handleOtpSubmit}>
              <div className="fp-otp-row">
                {otp.map((value, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      inputs.current[index] = element;
                    }}
                    className="fp-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(event) => handleOtpInput(event.target.value, index)}
                    onKeyDown={(event) => handleOtpKeyDown(event, index)}
                  />
                ))}
              </div>
              <div className="fp-otp-meta">
                <span>{otpExpirySeconds > 0 ? formatSeconds(otpExpirySeconds) : "Kode kedaluwarsa"}</span>
                <button
                  type="button"
                  className="fp-resend-btn"
                  onClick={handleResend}
                  disabled={resendSeconds > 0 || otpLoading}
                >
                  {resendSeconds > 0 ? `Kirim Ulang (${resendSeconds})` : "Kirim Ulang Kode"}
                </button>
              </div>
              {otpError && <div className="fp-error">{otpError}</div>}
              <button type="submit" className="fp-btn" disabled={otpLoading}>
                {otpLoading ? <span className="fp-spinner" /> : <><span>Verifikasi</span><IconArrowRight /></>}
              </button>
            </form>
            <p className="fp-login-link">
              Email salah?{" "}
              <span
                className="fp-link-btn"
                onClick={() => {
                  setStep(1);
                  setPanelCopy(PANEL[1]);
                  setSessionId("");
                  setOtp(createEmptyOtp());
                  setOtpError("");
                }}
              >
                Kembali
              </span>
            </p>
          </div>

          <div className={`fp-card fp-step-panel${step === 3 ? " fp-panel-visible" : " fp-panel-hidden fp-panel-hidden-right"}`}>
            <div className="fp-card-icon">
              <div className="fp-icon-ring fp-icon-ring--lock"><IconLock /></div>
            </div>
            <div className="fp-card-top">
              <h2 className="fp-title">Atur Password Baru</h2>
              <p className="fp-subtitle">Pilih password yang kuat untuk mengamankan akunmu.</p>
            </div>
            <form className="fp-form" onSubmit={handlePassSubmit}>
              <PwField
                label="Password Baru"
                placeholder="Min. 6 karakter"
                value={newPass}
                onChange={(event) => setNewPass(event.target.value)}
              />
              <StrengthBar password={newPass} />
              <PwField
                label="Konfirmasi Password"
                placeholder="Ulangi password kamu"
                value={confirmPass}
                onChange={(event) => setConfirmPass(event.target.value)}
              />
              {passError && <div className="fp-error">{passError}</div>}
              <button type="submit" className="fp-btn" disabled={passLoading}>
                {passLoading ? <span className="fp-spinner" /> : <><span>Atur Ulang Password</span><IconArrowRight /></>}
              </button>
            </form>
            <p className="fp-login-link">
              Ingat passwordmu?{" "}
              <a href="/login">Masuk sekarang</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
