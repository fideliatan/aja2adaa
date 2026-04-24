import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";

/* ── Icons ─────────────────────────────────────────────── */
const IconArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
  </svg>
);
const IconMail = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconLock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ── Password field helper ─────────────────────────────── */
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
        <button type="button" className="fp-pw-toggle" onClick={() => setShow(v => !v)}>
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      </div>
    </div>
  );
}

/* ── Password strength checker ─────────────────────────── */
function StrengthBar({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#e07a73", "#e8a85a", "#6cbf8a", "#44b07a"];

  if (!password) return null;
  return (
    <div className="fp-strength">
      <div className="fp-strength-bars">
        {[1,2,3,4].map(i => (
          <div
            key={i}
            className="fp-strength-bar"
            style={{ background: i <= score ? colors[score] : "#ede0de" }}
          />
        ))}
      </div>
      <span className="fp-strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

/* ── Panel copy per step ─────────────────────────────────── */
const PANEL = {
  1: { heading: "Let's get you back.",      sub: "Enter the email linked to your account — we'll send a verification code." },
  2: { heading: "Check your inbox.",        sub: "We've sent a 4-digit OTP to your email. Enter it below to continue." },
  3: { heading: "Almost there.",            sub: "Create a strong new password for your careofyou account." },
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep]           = useState(1);
  const [panelCopy, setPanelCopy] = useState(PANEL[1]);

  /* Step 1 */
  const [email, setEmail]               = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError]     = useState("");

  /* Step 2 */
  const [otp, setOtp]               = useState(["", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError]     = useState("");
  const [seconds, setSeconds]       = useState(45);
  const inputs = useRef([]);

  /* Step 3 */
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError]     = useState("");

  /* Countdown */
  useEffect(() => {
    if (step !== 2) return;
    const t = seconds > 0 && setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, step]);

  const goToStep = (n) => {
    setTimeout(() => setPanelCopy(PANEL[n]), 300);
    setStep(n);
  };

  /* Step 1 submit */
  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setEmailError("");
    if (!email.trim()) { setEmailError("Please enter your email address."); return; }
    setEmailLoading(true);
    setTimeout(() => { setEmailLoading(false); goToStep(2); setSeconds(45); }, 1200);
  };

  /* OTP handlers */
  const handleOtpInput = (value, idx) => {
    if (!/^[0-9]*$/.test(value)) return;
    const next = [...otp];
    next[idx] = value.slice(-1);
    setOtp(next);
    if (value && idx < inputs.current.length - 1) inputs.current[idx + 1].focus();
  };
  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) inputs.current[idx - 1].focus();
  };

  /* Step 2 submit */
  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setOtpError("");
    if (otp.join("").length < 4) { setOtpError("Please enter all 4 digits."); return; }
    setOtpLoading(true);
    setTimeout(() => { setOtpLoading(false); goToStep(3); }, 1200);
  };

  const handleResend = () => {
    setSeconds(45);
    setOtp(["", "", "", ""]);
    inputs.current[0]?.focus();
  };

  /* Step 3 submit */
  const handlePassSubmit = (e) => {
    e.preventDefault();
    setPassError("");
    if (newPass.length < 6)          { setPassError("Password must be at least 6 characters."); return; }
    if (newPass !== confirmPass)      { setPassError("Passwords do not match."); return; }
    setPassLoading(true);
    setTimeout(() => { setPassLoading(false); navigate("/login"); }, 1400);
  };

  return (
    <div className="fp-page">
      <div className="fp-blob fp-blob-1" />
      <div className="fp-blob fp-blob-2" />
      <div className="fp-blob fp-blob-3" />

      <a href="/login" className="fp-back-link">
        <IconArrowLeft />
        Back to Sign In
      </a>

      <div className="fp-container">

        {/* ════ LEFT PANEL ════ */}
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
                <span className="fp-step-text">Enter Email</span>
              </div>
              <div className="fp-step-line" />
              <div className={`fp-step${step >= 2 ? " fp-step-active" : ""}${step > 2 ? " fp-step-done" : ""}`}>
                <span className="fp-step-num">{step > 2 ? <IconCheck /> : "2"}</span>
                <span className="fp-step-text">Verify Code</span>
              </div>
              <div className="fp-step-line" />
              <div className={`fp-step${step >= 3 ? " fp-step-active" : ""}`}>
                <span className="fp-step-num">3</span>
                <span className="fp-step-text">New Password</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════ RIGHT SIDE ════ */}
        <div className="fp-form-side">

          {/* ── STEP 1: Email ── */}
          <div className={`fp-card fp-step-panel${step === 1 ? " fp-panel-visible" : " fp-panel-hidden fp-panel-hidden-left"}`}>
            <div className="fp-card-icon">
              <div className="fp-icon-ring"><IconMail /></div>
            </div>
            <div className="fp-card-top">
              <h2 className="fp-title">Forgot Password?</h2>
              <p className="fp-subtitle">No worries — it happens to the best of us. We'll help you get back in.</p>
            </div>
            <form className="fp-form" onSubmit={handleEmailSubmit}>
              <div className="fp-field-group">
                <label className="fp-field-label">Email Address</label>
                <div className="fp-input-wrap">
                  <span className="fp-input-icon"><IconMail /></span>
                  <input
                    className="fp-field-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <p className="fp-field-hint">We'll send a 4-digit OTP to this email.</p>
              </div>
              {emailError && <div className="fp-error">{emailError}</div>}
              <button type="submit" className="fp-btn" disabled={emailLoading}>
                {emailLoading ? <span className="fp-spinner" /> : <><span>Continue</span><IconArrowRight /></>}
              </button>
            </form>
            <p className="fp-login-link">
              Remember your password? <a href="/login">Sign in</a>
            </p>
          </div>

          {/* ── STEP 2: OTP ── */}
          <div className={`fp-card fp-step-panel${step === 2 ? " fp-panel-visible" : step < 2 ? " fp-panel-hidden fp-panel-hidden-right" : " fp-panel-hidden fp-panel-hidden-left"}`}>
            <div className="fp-card-icon">
              <div className="fp-icon-ring fp-icon-ring--shield"><IconShield /></div>
            </div>
            <div className="fp-card-top">
              <h2 className="fp-title">Verify Your Email</h2>
              <p className="fp-subtitle">
                Enter the 4-digit code sent to{" "}
                <span className="fp-email-highlight">{email || "your email"}</span>
              </p>
            </div>
            <form className="fp-form" onSubmit={handleOtpSubmit}>
              <div className="fp-otp-row">
                {otp.map((val, idx) => (
                  <input
                    key={idx}
                    ref={el => (inputs.current[idx] = el)}
                    className="fp-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={val}
                    onChange={e => handleOtpInput(e.target.value, idx)}
                    onKeyDown={e => handleOtpKeyDown(e, idx)}
                  />
                ))}
              </div>
              <div className="fp-otp-meta">
                <span>{seconds > 0 ? `00:${seconds.toString().padStart(2, "0")}` : "Code expired"}</span>
                <button type="button" className="fp-resend-btn" onClick={handleResend}>Resend Code</button>
              </div>
              {otpError && <div className="fp-error">{otpError}</div>}
              <button type="submit" className="fp-btn" disabled={otpLoading}>
                {otpLoading ? <span className="fp-spinner" /> : <><span>Verify</span><IconArrowRight /></>}
              </button>
            </form>
            <p className="fp-login-link">
              Wrong email?{" "}
              <span className="fp-link-btn" onClick={() => { setStep(1); setPanelCopy(PANEL[1]); }}>Go back</span>
            </p>
          </div>

          {/* ── STEP 3: New Password ── */}
          <div className={`fp-card fp-step-panel${step === 3 ? " fp-panel-visible" : " fp-panel-hidden fp-panel-hidden-right"}`}>
            <div className="fp-card-icon">
              <div className="fp-icon-ring fp-icon-ring--lock"><IconLock /></div>
            </div>
            <div className="fp-card-top">
              <h2 className="fp-title">Set New Password</h2>
              <p className="fp-subtitle">Choose a strong password to secure your account.</p>
            </div>
            <form className="fp-form" onSubmit={handlePassSubmit}>
              <PwField
                label="New Password"
                placeholder="Min. 6 characters"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
              <StrengthBar password={newPass} />
              <PwField
                label="Confirm Password"
                placeholder="Repeat your password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />
              {passError && <div className="fp-error">{passError}</div>}
              <button type="submit" className="fp-btn" disabled={passLoading}>
                {passLoading ? <span className="fp-spinner" /> : <><span>Reset Password</span><IconArrowRight /></>}
              </button>
            </form>
            <p className="fp-login-link">
              Remembered it?{" "}
              <a href="/login">Sign in instead</a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
