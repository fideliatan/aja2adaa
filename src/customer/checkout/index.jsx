import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
<<<<<<< HEAD
import { CreditCard, Paperclip, Loader2, PartyPopper, Package, AlertTriangle, Clock } from "lucide-react";
=======
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
import { useOrders } from "../context/OrderContext";
import "./index.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { PRODUCTS } from "../../data/products.js";
import { useMockData } from "../../context/MockDataContext.jsx";

/* ─── Icons ──────────────────────────────────────────────── */
const IconClock = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconStore = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

/* ─── Static data ────────────────────────────────────────── */
const SAVED_ADDRESSES = [
  { id: 1, label: "Home", name: "Sara Tancredi", phone: "(+98) 9123728167", address: "123 Main Street, New York, NY 10001, USA", isMain: true },
  { id: 2, label: "Office", name: "Sara Tancredi", phone: "(+98) 9123728167", address: "456 Business Ave, Manhattan, NY 10002, USA", isMain: false },
];

const ORDER_ITEMS = [
  { id: 1, brand: "Skintific", name: "5X Ceramide Barrier Repair Moisture Gel", size: "30ml", qty: 1, price: 149000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=Skin" },
  { id: 2, brand: "Some By Mi", name: "AHA BHA PHA 30 Days Miracle Toner", size: "150ml", qty: 1, price: 185000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=Toner" },
];

const DELIVERY_OPTIONS = [
  { id: "instant",  label: "Instant",  desc: "Arrives in 2–4 hours",  fee: 35000 },
  { id: "sameday",  label: "Same Day", desc: "Arrives today by 9 PM", fee: 25000 },
  { id: "regular",  label: "Regular",  desc: "2–3 working days",       fee: 15000 },
  { id: "economy",  label: "Economy",  desc: "4–7 working days",       fee: 8000  },
];

const PAYMENT_METHODS = [
  { id: "bca",   label: "BCA",   type: "bank",   account: "1234-5678-90",    holder: "Careofyou Store" },
  { id: "bni",   label: "BNI",   type: "bank",   account: "0987-6543-21",    holder: "Careofyou Store" },
  { id: "dana",  label: "DANA",  type: "ewallet", account: "0812-3456-7890", holder: "Careofyou Store" },
  { id: "ovo",   label: "OVO",   type: "ewallet", account: "0812-3456-7890", holder: "Careofyou Store" },
  { id: "gopay", label: "GoPay", type: "ewallet", account: "0812-3456-7890", holder: "Careofyou Store" },
];

const fmt = (n) => "Rp " + n.toLocaleString("id-ID");

/* Compress a base64 data-URL to max 1200px / JPEG 0.75 so it fits localStorage */
function compressImage(dataUrl, maxDim = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback: use original
    img.src = dataUrl;
  });
}

/* ─── Main component ─────────────────────────────────────── */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addOrder } = useOrders();
  const { session, currentUser } = useMockData();

  const cartItems = location.state?.cartItems ?? ORDER_ITEMS;

  // Address
  const [addresses, setAddresses] = useState(SAVED_ADDRESSES);
  const [selectedAddr, setSelectedAddr] = useState(SAVED_ADDRESSES.find(a => a.isMain)?.id ?? 1);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: "", name: "", phone: "", address: "" });
  const [addrError, setAddrError] = useState("");

  // Delivery
  const [delivery, setDelivery] = useState("regular");

  // Payment
  const [payment, setPayment] = useState("");

  // Proof upload modal
  const [proofModal, setProofModal]   = useState(false);
  const [proofFile, setProofFile]     = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [proofDrag, setProofDrag]     = useState(false);
  const [timerLeft, setTimerLeft]     = useState(120); // 2 min
  const [timerExpired, setTimerExpired] = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [newOrderId, setNewOrderId]   = useState("");
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const proofDataRef = useRef(null);

  useEffect(() => {
    if (!proofModal || submitted) return;
    timerRef.current = setInterval(() => {
      setTimerLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setTimerExpired(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [proofModal, submitted]);

  const handleAddAddress = (e) => {
    e.preventDefault();
    if (!newAddr.label || !newAddr.name || !newAddr.phone || !newAddr.address) {
      setAddrError("Please fill in all fields.");
      return;
    }
    const added = { id: Date.now(), ...newAddr, isMain: false };
    setAddresses((prev) => [...prev, added]);
    setSelectedAddr(added.id);
    setNewAddr({ label: "", name: "", phone: "", address: "" });
    setShowAddrForm(false);
    setAddrError("");
  };

  const subtotal    = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = DELIVERY_OPTIONS.find(d => d.id === delivery)?.fee ?? 0;
  const total       = subtotal + deliveryFee;

  const handleCheckout = () => {
    if (!payment) { alert("Please select a payment method."); return; }
    const ordId = "ORD-" + Date.now().toString().slice(-6);
    setNewOrderId(ordId);
    setTimerLeft(120);
    setTimerExpired(false);
    setProofFile(null);
    setProofPreview(null);
    setSubmitted(false);
    setProofModal(true);
  };

  const handleProofFile = (file) => {
    if (!file) return;
    setProofFile(file);
    proofDataRef.current = null;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressImage(e.target.result);
      proofDataRef.current = compressed;
      setProofPreview(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleProofSubmit = () => {
    const proof = proofDataRef.current ?? proofPreview;
    if (!proof) return;
    clearInterval(timerRef.current);
    const addr        = addresses.find(a => a.id === selectedAddr);
    const pay         = PAYMENT_METHODS.find(p => p.id === payment);
    const deliveryOpt = DELIVERY_OPTIONS.find(d => d.id === delivery);
    addOrder({
      id: newOrderId,
      status: "pending",
      customer: addr?.name ?? "Customer",
      customerId: session?.userId ?? null,
      email: currentUser?.email ?? session?.email ?? "",
      date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      items: cartItems.map(i => ({ name: i.name, qty: i.qty, price: i.price, brand: i.brand ?? "", image: i.image ?? "" })),
      subtotal,
      deliveryFee,
      total,
      payment: pay?.label ?? payment,
      paymentAccount: pay?.account ?? "",
      recipient: addr?.name ?? "",
      phone: addr?.phone ?? "",
      address: addr?.address ?? "",
      delivery: deliveryOpt?.label ?? delivery,
      deliveryId: delivery,
      paymentProof: proof,
      rejectionReason: null,
      cancelReason: null,
      trackingNumber: null,
      courier: null,
      cancelDeadlineTs: Date.now() + 24 * 60 * 60 * 1000,
      sessionSnapshot: {
        userId: session?.userId ?? null,
        loginAt: session?.loginAt ?? null,
        deviceStatus: session?.deviceStatus ?? "trusted",
        deviceInfo: session?.deviceInfo ?? {},
      },
    });
    setSubmitted(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setProofDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleProofFile(file);
  };

  const fmtTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const selectedPayment = PAYMENT_METHODS.find(p => p.id === payment);
  const selectedAddress  = addresses.find(a => a.id === selectedAddr);

  return (
    <>
    <div className="co-page">

      {/* NAVBAR */}
      <Navbar 
        allProducts={PRODUCTS}
        activePage="checkout"
        onHomeClick={() => navigate("/")}
        onProductsClick={() => navigate("/products")}
      />

      {/* ── MAIN ── */}
      <main className="co-main">
        <div className="co-container">
          <h1 className="co-page-title">Checkout</h1>

          <div className="co-layout">

            {/* ════ LEFT COLUMN ════ */}
            <div className="co-left">

              {/* 1 · SHIPPING ADDRESS */}
              <section className="co-card">
                <div className="co-card-heading">
                  <span className="co-card-icon"><IconMapPin /></span>
                  <h2 className="co-card-title">Shipping Address</h2>
                </div>

                <div className="co-addr-list">
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`co-addr-option${selectedAddr === addr.id ? " co-addr-option--active" : ""}`}>
                      <input
                        type="radio"
                        name="address"
                        className="co-radio"
                        checked={selectedAddr === addr.id}
                        onChange={() => setSelectedAddr(addr.id)}
                      />
                      <div className="co-addr-body">
                        <div className="co-addr-top">
                          <span className="co-addr-label">{addr.label}</span>
                          {addr.isMain && <span className="co-addr-badge">Main</span>}
                        </div>
                        <p className="co-addr-name">{addr.name} · {addr.phone}</p>
                        <p className="co-addr-text">{addr.address}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  className="co-add-addr-btn"
                  onClick={() => { setShowAddrForm(v => !v); setAddrError(""); }}
                >
                  {showAddrForm ? "Cancel" : "+ Use a different address"}
                </button>

                {showAddrForm && (
                  <form className="co-addr-form" onSubmit={handleAddAddress}>
                    <div className="co-form-row">
                      <div className="co-form-group">
                        <label className="co-form-label">Label</label>
                        <input className="co-input" name="label" placeholder="e.g. Home" value={newAddr.label} onChange={e => setNewAddr({...newAddr, label: e.target.value})} />
                      </div>
                      <div className="co-form-group">
                        <label className="co-form-label">Recipient Name</label>
                        <input className="co-input" name="name" placeholder="Full name" value={newAddr.name} onChange={e => setNewAddr({...newAddr, name: e.target.value})} />
                      </div>
                    </div>
                    <div className="co-form-group">
                      <label className="co-form-label">Phone Number</label>
                      <input className="co-input" name="phone" placeholder="+62 812 3456 7890" value={newAddr.phone} onChange={e => setNewAddr({...newAddr, phone: e.target.value})} />
                    </div>
                    <div className="co-form-group">
                      <label className="co-form-label">Full Address</label>
                      <textarea className="co-input co-textarea" placeholder="Street, City, ZIP, Country" value={newAddr.address} onChange={e => setNewAddr({...newAddr, address: e.target.value})} rows={3}/>
                    </div>
                    {addrError && <p className="co-error">{addrError}</p>}
                    <button type="submit" className="co-save-addr-btn">Save & Use This Address</button>
                  </form>
                )}
              </section>

              {/* 2 · ORDER DETAILS */}
              <section className="co-card">
                <div className="co-card-heading">
                  <span className="co-card-icon"><IconStore /></span>
                  <h2 className="co-card-title">Order Details</h2>
                </div>
                <div className="co-store-name">Careofyou Official Store</div>
                <div className="co-item-list">
                  {cartItems.map(item => (
                    <div key={item.id} className="co-item">
                      <img src={item.image} alt={item.name} className="co-item-img"/>
                      <div className="co-item-info">
                        <p className="co-item-brand">{item.brand ?? item.category}</p>
                        <p className="co-item-name">{item.name}</p>
                        {item.size && <p className="co-item-size">Size: {item.size}</p>}
                      </div>
                      <div className="co-item-right">
                        <p className="co-item-price">{fmt(item.price)}</p>
                        <p className="co-item-qty">Qty: {item.qty}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3 · DELIVERY */}
              <section className="co-card">
                <h2 className="co-card-title" style={{ marginBottom: 16 }}>Delivery Option</h2>
                <div className="co-delivery-list">
                  {DELIVERY_OPTIONS.map(opt => (
                    <label key={opt.id} className={`co-delivery-option${delivery === opt.id ? " co-delivery-option--active" : ""}`}>
                      <input
                        type="radio"
                        name="delivery"
                        className="co-radio"
                        checked={delivery === opt.id}
                        onChange={() => setDelivery(opt.id)}
                      />
                      <div className="co-delivery-body">
                        <span className="co-delivery-label">{opt.label}</span>
                        <span className="co-delivery-desc">{opt.desc}</span>
                      </div>
                      <span className="co-delivery-fee">{fmt(opt.fee)}</span>
                    </label>
                  ))}
                </div>
              </section>

              {/* 4 · PAYMENT METHOD */}
              <section className="co-card">
                <h2 className="co-card-title" style={{ marginBottom: 16 }}>Payment Method</h2>

                <p className="co-payment-group-label">Bank Transfer</p>
                <div className="co-payment-grid">
                  {PAYMENT_METHODS.filter(p => p.type === "bank").map(p => (
                    <label key={p.id} className={`co-payment-option${payment === p.id ? " co-payment-option--active" : ""}`}>
                      <input type="radio" name="payment" className="co-radio" checked={payment === p.id} onChange={() => setPayment(p.id)}/>
                      <span className="co-payment-label">{p.label}</span>
                    </label>
                  ))}
                </div>

                <p className="co-payment-group-label" style={{ marginTop: 16 }}>E-Wallet</p>
                <div className="co-payment-grid">
                  {PAYMENT_METHODS.filter(p => p.type === "ewallet").map(p => (
                    <label key={p.id} className={`co-payment-option${payment === p.id ? " co-payment-option--active" : ""}`}>
                      <input type="radio" name="payment" className="co-radio" checked={payment === p.id} onChange={() => setPayment(p.id)}/>
                      <span className="co-payment-label">{p.label}</span>
                    </label>
                  ))}
                </div>

                {selectedPayment && (
                  <div className="co-payment-detail">
                    <p className="co-payment-detail-title">Transfer to:</p>
                    <p className="co-payment-detail-bank">{selectedPayment.label}</p>
                    <p className="co-payment-detail-account">{selectedPayment.account}</p>
                    <p className="co-payment-detail-holder">a.n. {selectedPayment.holder}</p>
                  </div>
                )}
              </section>

            </div>{/* end left */}

            {/* ════ RIGHT COLUMN — SUMMARY ════ */}
            <div className="co-right">
              <div className="co-summary">
                <h2 className="co-summary-title">Order Summary</h2>

                <div className="co-summary-items">
                  {cartItems.map(item => (
                    <div key={item.id} className="co-summary-item">
                      <span className="co-summary-item-name">{item.name} <span className="co-summary-item-qty">×{item.qty}</span></span>
                      <span className="co-summary-item-price">{fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                <div className="co-summary-divider"/>

                <div className="co-summary-row">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="co-summary-row">
                  <span>Delivery ({DELIVERY_OPTIONS.find(d => d.id === delivery)?.label})</span>
                  <span>{fmt(deliveryFee)}</span>
                </div>
                <div className="co-summary-divider"/>

                <div className="co-summary-total">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>

                {selectedAddress && (
                  <div className="co-summary-addr">
                    <p className="co-summary-addr-label">Ship to</p>
                    <p className="co-summary-addr-name">{selectedAddress.name}</p>
                    <p className="co-summary-addr-text">{selectedAddress.address}</p>
                  </div>
                )}

                <button
                  className="co-checkout-btn"
                  onClick={handleCheckout}
                  disabled={!payment}
                >
                  {payment ? "Place Order" : "Select Payment Method"}
                </button>

                <p className="co-checkout-note">
                  By placing your order you agree to our terms and conditions.
                </p>
              </div>
            </div>

          </div>{/* end layout */}
        </div>
      </main>

      <Footer />

    </div>

    {/* ════════════════════════════════════════════════════
        PAYMENT PROOF UPLOAD MODAL
        ════════════════════════════════════════════════════ */}
    {proofModal && (
      <div className="co-proof-overlay" onClick={() => !submitted && setProofModal(false)}>
        <div className="co-proof-modal" onClick={e => e.stopPropagation()}>

          {!submitted ? (
            <>
              {/* Header */}
              <div className="co-proof-header">
                <div className="co-proof-header-left">
<<<<<<< HEAD
                  <span className="co-proof-icon-wrap"><CreditCard size={24} /></span>
=======
                  <span className="co-proof-icon-wrap">💳</span>
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
                  <div>
                    <h3 className="co-proof-title">Upload Bukti Pembayaran</h3>
                    <p className="co-proof-subtitle">Order #{newOrderId}</p>
                  </div>
                </div>
                <div className={`co-proof-timer${timerExpired ? " co-proof-timer--expired" : timerLeft <= 30 ? " co-proof-timer--warn" : ""}`}>
<<<<<<< HEAD
                  {timerExpired ? <><AlertTriangle size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Waktu habis</> : <><Clock size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {fmtTimer(timerLeft)}</>}
=======
                  {timerExpired ? "⚠️ Waktu habis" : `⏱ ${fmtTimer(timerLeft)}`}
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
                </div>
              </div>

              {timerExpired && (
                <div className="co-proof-expired-banner">
                  Waktu upload sudah habis, tapi kamu masih bisa mengunggah bukti. Silakan upload sekarang.
                </div>
              )}

              {/* Payment info */}
              <div className="co-proof-payment-box">
                <div className="co-proof-payment-label">Transfer ke</div>
                <div className="co-proof-payment-row">
                  <span className="co-proof-bank-name">{selectedPayment?.label}</span>
                  <span className="co-proof-bank-account">{selectedPayment?.account}</span>
                </div>
                <div className="co-proof-payment-holder">a.n. {selectedPayment?.holder}</div>
                <div className="co-proof-amount">Total: <strong>{fmt(total)}</strong></div>
              </div>

              {/* Upload area */}
              <div
                className={`co-proof-dropzone${proofDrag ? " co-proof-dropzone--drag" : ""}${proofPreview ? " co-proof-dropzone--filled" : ""}`}
                onDragOver={e => { e.preventDefault(); setProofDrag(true); }}
                onDragLeave={() => setProofDrag(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => handleProofFile(e.target.files?.[0])}
                />
                {proofPreview ? (
                  <div className="co-proof-preview-wrap">
                    <img src={proofPreview} alt="preview" className="co-proof-preview-img" />
                    <div className="co-proof-preview-info">
                      <span className="co-proof-preview-name">✓ {proofFile?.name}</span>
                      <span className="co-proof-preview-change">Tap to change</span>
                    </div>
                  </div>
                ) : (
                  <div className="co-proof-dropzone-inner">
<<<<<<< HEAD
                    <span className="co-proof-upload-icon"><Paperclip size={28} /></span>
=======
                    <span className="co-proof-upload-icon">📎</span>
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
                    <p className="co-proof-drop-text">Drag & drop foto bukti transfer</p>
                    <p className="co-proof-drop-sub">atau klik untuk pilih gambar</p>
                  </div>
                )}
              </div>

              <button
                className="co-proof-submit-btn"
                onClick={handleProofSubmit}
                disabled={!proofPreview}
              >
                {!proofFile
                  ? "Pilih foto terlebih dahulu"
                  : !proofPreview
<<<<<<< HEAD
                    ? <><Loader2 size={14} style={{ display: "inline", verticalAlign: "middle" }} /> Memproses foto...</>
=======
                    ? "⏳ Memproses foto..."
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
                    : "Kirim Bukti Pembayaran →"}
              </button>

              <p className="co-proof-note">Pastikan foto bukti transfer terlihat jelas dan terbaca</p>
            </>
          ) : (
            /* Success state */
            <div className="co-proof-success">
<<<<<<< HEAD
              <div className="co-proof-success-anim"><PartyPopper size={40} /></div>
=======
              <div className="co-proof-success-anim">🎉</div>
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
              <h3 className="co-proof-success-title">Bukti Pembayaran Terkirim!</h3>
              <p className="co-proof-success-sub">
                Pesanan <strong>#{newOrderId}</strong> sedang menunggu konfirmasi admin.<br />
                Kami akan memproses pesananmu secepatnya.
              </p>
              <div className="co-proof-success-info">
<<<<<<< HEAD
                <span className="co-proof-success-icon-small"><Clock size={14} /></span>
=======
                <span className="co-proof-success-icon-small">⏱</span>
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
                Estimasi konfirmasi: 1×24 jam
              </div>
              <div className="co-proof-success-actions">
                <button
                  className="co-proof-success-primary"
                  onClick={() => { setProofModal(false); navigate("/myprofile", { state: { tab: "orderstatus" } }); }}
                >
<<<<<<< HEAD
                  <Package size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Lihat Status Orderan
=======
                  📦 Lihat Status Orderan
>>>>>>> fb31355c86f196a0069095e4e53d6c65f8614301
                </button>
                <button
                  className="co-proof-success-ghost"
                  onClick={() => { setProofModal(false); navigate("/"); }}
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    )}
    </>
  );
}
