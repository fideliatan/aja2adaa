import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, Package, Truck, CheckCircle, XCircle, Ban, ShoppingBag, Tag, PartyPopper } from "lucide-react";
import "./index.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { PRODUCTS } from "../../data/products.js";
import { useOrders } from "../context/OrderContext";
import { useMockData } from "../../context/MockDataContext.jsx";
import { SEED_USER_PROFILES } from "../../data/seeds.js";

/* ── Icons ─────────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);
const IconMapPin = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconWallet = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <path d="M16 12h2"/>
    <path d="M2 10h20"/>
  </svg>
);

const AdminPaymentApproval = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* User head */}
    <circle cx="9" cy="7" r="4" />

    {/* User body */}
    <path d="M3 21c0-3.5 3-6 6-6s6 2.5 6 6" />

    {/* Gear (settings) */}
    <circle cx="18" cy="17" r="2.5" />
    <path d="M18 13v1" />
    <path d="M18 20v1" />
    <path d="M15.5 14.5l.7.7" />
    <path d="M19.8 18.8l.7.7" />
    <path d="M14 17h1" />
    <path d="M21 17h1" />
    <path d="M15.5 19.5l.7-.7" />
    <path d="M19.8 15.2l.7-.7" />
  </svg>
);

const IconBox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconTruck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 5v3h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconLogOut = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ── Nav config ─────────────────────────────────────────── */
const navItems = [
  { id: "userinfo",     label: "Info Pengguna",  icon: <IconUser /> },
  { id: "myaddress",    label: "Alamat Saya",    icon: <IconMapPin /> },
  { id: "orderstatus",  label: "Status Orderan", icon: <IconWallet /> },
  { id: "setting",      label: "Pengaturan",     icon: <IconSettings /> },
  { id: "notifications",label: "Notifikasi",     icon: <IconBell /> },
];

/* ── Sections ───────────────────────────────────────────── */
function UserInfoSection() {
  const { session } = useMockData();
  const profile = SEED_USER_PROFILES[session?.userId] ?? {};
  const nameParts = (session?.name ?? "").split(" ");

  const [form, setForm] = useState({
    firstName: profile.firstName ?? nameParts[0] ?? "",
    lastName:  profile.lastName  ?? nameParts.slice(1).join(" ") ?? "",
    email:     session?.email ?? "",
    phone:     profile.phone ?? "",
    location:  profile.location ?? "Indonesia",
    postalCode: profile.postalCode ?? "",
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <div className="pr-profile-header">
        <div className="pr-profile-initial">
          {form.firstName.charAt(0)}{form.lastName.charAt(0)}
        </div>
        <div className="pr-profile-info">
          <h3 className="pr-profile-name">{form.firstName} {form.lastName}</h3>
          <p className="pr-profile-location">{form.location}</p>
        </div>
      </div>

      <form className="pr-form" onSubmit={handleSubmit}>
        <div className="pr-form-row">
          <div className="pr-form-group">
            <label className="pr-form-label">Nama Depan</label>
            <input className="pr-input" name="firstName" value={form.firstName} onChange={handleChange} />
          </div>
          <div className="pr-form-group">
            <label className="pr-form-label">Nama Lengkap</label>
            <input className="pr-input" name="lastName" value={form.lastName} onChange={handleChange} />
          </div>
        </div>
        <div className="pr-form-row">
          <div className="pr-form-group">
            <label className="pr-form-label">Alamat Email</label>
            <input className="pr-input" name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="pr-form-group">
            <label className="pr-form-label">Nomor Telepon</label>
            <input className="pr-input" name="phone" value={form.phone} onChange={handleChange} />
          </div>
        </div>
        <div className="pr-form-row">
          <div className="pr-form-group">
            <label className="pr-form-label">Lokasi</label>
            <input className="pr-input" name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="pr-form-group">
            <label className="pr-form-label">Kode Pos</label>
            <input className="pr-input" name="postalCode" value={form.postalCode} onChange={handleChange} />
          </div>
        </div>
        <div className="pr-save-wrapper">
          <button type="submit" className={`pr-save-btn${saved ? " pr-save-btn--saved" : ""}`}>
            {saved ? "Tersimpan!" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </>
  );
}

/* ── My Address Section ─────────────────────────────────── */
function MyAddressSection() {
  const { session } = useMockData();
  const profile = SEED_USER_PROFILES[session?.userId] ?? {};
  const [addresses, setAddresses] = useState(profile.addresses ?? []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", name: "", phone: "", address: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.label || !form.name || !form.phone || !form.address) {
      setError("Harap isi semua kolom.");
      return;
    }
    const newAddr = {
      id: Date.now(),
      ...form,
      isMain: addresses.length === 0,
    };
    setAddresses([...addresses, newAddr]);
    setForm({ label: "", name: "", phone: "", address: "" });
    setShowForm(false);
    setError("");
  };

  const setMain = (id) => {
    setAddresses(addresses.map((a) => ({ ...a, isMain: a.id === id })));
  };

  const remove = (id) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isMain)) {
      updated[0].isMain = true;
    }
    setAddresses(updated);
  };

  return (
    <div className="pr-addr-section">
      <div className="pr-addr-header">
        <div>
          <h2 className="pr-section-title">Alamat Saya</h2>
          <p className="pr-section-sub">{addresses.length} alamat tersimpan</p>
        </div>
        <button className="pr-addr-add-btn" onClick={() => { setShowForm((v) => !v); setError(""); }}>
          {showForm ? "Batal" : "+ Tambah Alamat"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form className="pr-addr-form" onSubmit={handleAdd}>
          <div className="pr-form-row">
            <div className="pr-form-group">
              <label className="pr-form-label">Label (mis. Rumah, Kantor)</label>
              <input className="pr-input" name="label" placeholder="Rumah" value={form.label} onChange={handleChange} />
            </div>
            <div className="pr-form-group">
              <label className="pr-form-label">Nama Penerima</label>
              <input className="pr-input" name="name" placeholder="Nama lengkap" value={form.name} onChange={handleChange} />
            </div>
          </div>
          <div className="pr-form-group">
            <label className="pr-form-label">Nomor Telepon</label>
            <input className="pr-input" name="phone" placeholder="+62 812 3456 7890" value={form.phone} onChange={handleChange} />
          </div>
          <div className="pr-form-group">
            <label className="pr-form-label">Alamat Lengkap</label>
            <textarea className="pr-input pr-textarea" name="address" placeholder="Jalan, Kota, Kode Pos, Negara" value={form.address} onChange={handleChange} rows={3} />
          </div>
          {error && <p className="pr-addr-error">{error}</p>}
          <div className="pr-save-wrapper" style={{ justifyContent: "flex-start" }}>
            <button type="submit" className="pr-save-btn">Simpan Alamat</button>
          </div>
        </form>
      )}

      {/* Address cards */}
      <div className="pr-addr-list">
        {addresses.map((addr) => (
          <div key={addr.id} className={`pr-addr-card${addr.isMain ? " pr-addr-card--main" : ""}`}>
            <div className="pr-addr-card-top">
              <div className="pr-addr-label-row">
                <span className="pr-addr-label">{addr.label}</span>
                {addr.isMain && <span className="pr-addr-badge">Utama</span>}
              </div>
              <button className="pr-addr-delete" onClick={() => remove(addr.id)} title="Hapus alamat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
            <p className="pr-addr-name">{addr.name} · {addr.phone}</p>
            <p className="pr-addr-text">{addr.address}</p>
            {!addr.isMain && (
              <button className="pr-addr-set-main" onClick={() => setMain(addr.id)}>
                Jadikan alamat utama
              </button>
            )}
          </div>
        ))}
      </div>

      {addresses.length === 0 && (
        <div className="pr-placeholder">
          <p className="pr-placeholder-title">Belum ada alamat</p>
          <p className="pr-placeholder-sub">Tambahkan alamat pengiriman untuk memulai.</p>
        </div>
      )}
    </div>
  );
}

/* ── Order Section (adminapproval / Packing / Shipped / Rate Order) ── */
const MOCK_ORDERS = {
  adminapproval: [
    {
      id: "ORD-011",
      date: "15 Apr 2025",
      products: [
        { name: "Sunscreen Aqua Gel SPF 50",        size: "40ml", qty: 2, price: 99000,  image: "https://placehold.co/72x72/fce8e6/c4706a?text=SPF"  },
        { name: "5X Ceramide Barrier Moisture Gel", size: "30ml", qty: 1, price: 149000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=Gel"  },
      ],
      deliveryFee: 15000,
      payment: { method: "BCA Transfer", account: "1234-5678-90" },
    },
    {
      id: "ORD-012",
      date: "15 Apr 2025",
      products: [
        { name: "Vitamin C Brightening Serum", size: "30ml", qty: 1, price: 195000, image: "https://placehold.co/72x72/fff3e0/c4706a?text=VitC" },
      ],
      deliveryFee: 10000,
      payment: { method: "GoPay", account: "0812-3456-7890" },
    },
  ],
  packing: [
    {
      id: "ORD-013",
      date: "14 Apr 2025",
      packedBy: "Warehouse Team B",
      estimatedShip: "16 Apr 2025",
      products: [
        { name: "Retinol Night Cream",       size: "50ml", qty: 1, price: 210000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=Ret"  },
        { name: "Hydra Boost Toner",         size: "200ml", qty: 1, price: 125000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=Ton"  },
      ],
      deliveryFee: 15000,
      payment: { method: "BNI Transfer", account: "0987-6543-21" },
    },
    {
      id: "ORD-014",
      date: "13 Apr 2025",
      packedBy: "Warehouse Team A",
      estimatedShip: "15 Apr 2025",
      products: [
        { name: "Niacinamide 10% + Zinc Serum", size: "30ml", qty: 2, price: 135000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=Nia" },
      ],
      deliveryFee: 10000,
      payment: { method: "OVO", account: "0812-3456-7890" },
    },
  ],
  shipped: [
    {
      id: "ORD-015",
      date: "12 Apr 2025",
      courier: "JNE Regular",
      tracking: "JNE20250412005123",
      estimatedArrival: "17 Apr 2025",
      products: [
        { name: "AHA BHA Exfoliating Toner",   size: "200ml", qty: 1, price: 135000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=AHA"  },
        { name: "SPF 50 UV Defense Serum",     size: "30ml",  qty: 1, price: 225000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=SPF"  },
      ],
      deliveryFee: 0,
      payment: { method: "BCA Transfer", account: "1234-5678-90" },
    },
    {
      id: "ORD-016",
      date: "11 Apr 2025",
      courier: "SiCepat HALU",
      tracking: "SICP20250411007890",
      estimatedArrival: "14 Apr 2025",
      products: [
        { name: "Peptide Eye Cream", size: "15ml", qty: 1, price: 185000, image: "https://placehold.co/72x72/fff3e0/c4706a?text=Eye" },
      ],
      deliveryFee: 8000,
      payment: { method: "DANA", account: "0812-3456-7890" },
    },
  ],
  rateorder: [
    {
      id: "ORD-007",
      date: "5 Apr 2025",
      deliveredDate: "7 Apr 2025",
      products: [
        { name: "Sunscreen Aqua Gel SPF 50",       brand: "Skintific", size: "40ml", qty: 2, price: 99000,  image: "https://placehold.co/72x72/fce8e6/c4706a?text=SPF"  },
        { name: "5X Ceramide Barrier Moisture Gel", brand: "Skintific", size: "30ml", qty: 1, price: 149000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=Gel"  },
      ],
      deliveryFee: 15000,
      delivery: { courier: "JNE Regular",   tracking: "JNE2025040500123",  address: "123 Main Street, New York, NY 10001, USA",     recipient: "Sara Tancredi", phone: "(+98) 9123728167" },
      payment:  { method: "BCA",  type: "bank",   account: "1234-5678-90",    holder: "Careofyou Store" },
      rating: null,
    },
    {
      id: "ORD-008",
      date: "3 Apr 2025",
      deliveredDate: "5 Apr 2025",
      products: [
        { name: "Snail Truecica Miracle Repair Toner", brand: "Some By Mi", size: "150ml", qty: 1, price: 185000, image: "https://placehold.co/72x72/fdeaea/c4706a?text=Toner" },
      ],
      deliveryFee: 8000,
      delivery: { courier: "SiCepat HALU", tracking: "SICP2025040300456", address: "456 Business Ave, Manhattan, NY 10002, USA",    recipient: "Sara Tancredi", phone: "(+98) 9123728167" },
      payment:  { method: "GoPay", type: "ewallet", account: "0812-3456-7890", holder: "Careofyou Store" },
      rating: 4,
    },
    {
      id: "ORD-005",
      date: "15 Mar 2025",
      deliveredDate: "18 Mar 2025",
      products: [
        { name: "Real Floral Toner — Rose Edition", brand: "Nacific", size: "180ml", qty: 1, price: 210000, image: "https://placehold.co/72x72/fce8e6/c4706a?text=Rose"  },
        { name: "Vitamin C Brightening Serum",      brand: "Nacific", size: "30ml",  qty: 1, price: 195000, image: "https://placehold.co/72x72/fff3e0/c4706a?text=VitC"  },
        { name: "SPF 50 Daily Sun Cream",           brand: "Nacific", size: "50ml",  qty: 2, price: 89000,  image: "https://placehold.co/72x72/fce8e6/c4706a?text=Sun"   },
      ],
      deliveryFee: 0,
      delivery: { courier: "JNT Express",   tracking: "JNT2025031500789",  address: "123 Main Street, New York, NY 10001, USA",     recipient: "Sara Tancredi", phone: "(+98) 9123728167" },
      payment:  { method: "BNI",  type: "bank",   account: "0987-6543-21",    holder: "Careofyou Store" },
      rating: 5,
    },
    {
      id: "ORD-003",
      date: "22 Feb 2025",
      deliveredDate: "24 Feb 2025",
      products: [
        { name: "Lightening Face Moisturizer SPF 30", brand: "Wardah", size: "40ml", qty: 1, price: 69000, image: "https://placehold.co/72x72/e8f5e9/4caf50?text=SPF" },
      ],
      deliveryFee: 8000,
      delivery: { courier: "SiCepat REG",  tracking: "SICP2025022200321", address: "456 Business Ave, Manhattan, NY 10002, USA",    recipient: "Sara Tancredi", phone: "(+98) 9123728167" },
      payment:  { method: "DANA", type: "ewallet", account: "0812-3456-7890", holder: "Careofyou Store" },
      rating: 3,
    },
  ],
};

const STATUS_LABEL = {
  adminapproval: { text: "Persetujuan Admin", color: "#e07a73", bg: "#fff5f5" },
  packing:   { text: "Sedang Dikemas",    color: "#e09a3a", bg: "#fffaf0" },
  shipped:   { text: "Dalam Pengiriman",  color: "#4a9fd4", bg: "#f0f8ff" },
  rateorder: { text: "Terkirim",          color: "#5aab6d", bg: "#f0faf3" },
};

const fmt = (n) => "Rp " + n.toLocaleString("id-ID");

function OrderSection({ sectionKey, title }) {
  const [query, setQuery]     = useState("");
  const [selected, setSelected] = useState(null);
  const orders = MOCK_ORDERS[sectionKey] ?? [];
  const status = STATUS_LABEL[sectionKey];
  const q      = query.toLowerCase();
  const filtered = orders.filter(o =>
    o.id.toLowerCase().includes(q) ||
    o.products.some(p => p.name.toLowerCase().includes(q))
  );

  const orderTotal = (order) =>
    order.products.reduce((s, p) => s + p.price * p.qty, 0) + order.deliveryFee;

  const statusEmoji = sectionKey === "adminapproval" ? <Clock size={14} /> : sectionKey === "packing" ? <Package size={14} /> : <Truck size={14} />;

  return (
    <div className="pr-order-section">
      <div className="pr-order-header">
        <div>
          <h2 className="pr-section-title">{title}</h2>
          <p className="pr-section-sub">{orders.length} pesanan</p>
        </div>
      </div>

      <div className="pr-search-wrap">
        <span className="pr-search-icon"><IconSearch /></span>
        <input
          className="pr-search-input"
          type="text"
          placeholder="Cari berdasarkan ID order atau produk…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && <button className="pr-search-clear" onClick={() => setQuery("")}>✕</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="pr-placeholder">
          <p className="pr-placeholder-title">Pesanan tidak ditemukan</p>
          <p className="pr-placeholder-sub">Coba kata kunci lain.</p>
        </div>
      ) : (
        <div className="pr-order-list">
          {filtered.map(order => {
            const total = orderTotal(order);
            const itemCount = order.products.reduce((s, p) => s + p.qty, 0);
            return (
              <div
                key={order.id}
                className="pr-order-card pr-order-card--clickable"
                onClick={() => setSelected(order)}
              >
                <div className="pr-order-top">
                  <span className="pr-order-status" style={{ color: status.color, background: status.bg }}>
                    {statusEmoji} {status.text}
                  </span>
                  <span className="pr-order-date">{order.date}</span>
                </div>

                <div className="pr-order-thumbs">
                  {order.products.slice(0, 3).map((p, i) => (
                    <img key={i} src={p.image} alt={p.name} className="pr-order-thumb" />
                  ))}
                  {order.products.length > 3 && (
                    <span className="pr-order-thumb-more">+{order.products.length - 3}</span>
                  )}
                </div>

                <p className="pr-order-summary">
                  {order.products[0].name}
                  {order.products.length > 1 && (
                    <span className="pr-order-summary-more"> &amp; {order.products.length - 1} produk lainnya</span>
                  )}
                </p>

                {sectionKey === "adminapproval" && (
                  <div className="pr-order-info-row">
                    <span className="pr-order-info-label">Pembayaran</span>
                    <span className="pr-order-info-value">{order.payment.method} · {order.payment.account}</span>
                  </div>
                )}
                {sectionKey === "packing" && (
                  <div className="pr-order-info-row">
                    <span className="pr-order-info-label">Est. tanggal kirim</span>
                    <span className="pr-order-info-value">{order.estimatedShip}</span>
                  </div>
                )}
                {sectionKey === "shipped" && (
                  <>
                    <div className="pr-order-info-row">
                      <span className="pr-order-info-label">Kurir</span>
                      <span className="pr-order-info-value">{order.courier}</span>
                    </div>
                    <div className="pr-order-info-row">
                      <span className="pr-order-info-label">No. Resi</span>
                      <span className="pr-order-info-value pr-order-tracking">{order.tracking}</span>
                    </div>
                    <div className="pr-order-info-row">
                      <span className="pr-order-info-label">Est. tiba</span>
                      <span className="pr-order-info-value" style={{ color: "#5aab6d", fontWeight: 600 }}>{order.estimatedArrival}</span>
                    </div>
                  </>
                )}

                <div className="pr-order-bottom">
                  <div className="pr-order-bottom-left">
                    <span className="pr-order-id">{order.id}</span>
                    <span className="pr-order-meta">· {itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="pr-order-bottom-right">
                    <span className="pr-order-unrated">Ketuk untuk detail ›</span>
                    <span className="pr-order-total">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div className="pr-modal-overlay" onClick={() => setSelected(null)}>
          <div className="pr-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="pr-modal-header">
              <div>
                <p className="pr-modal-order-id">{selected.id} · {selected.date}</p>
                <h3 className="pr-modal-title">Detail Pesanan</h3>
              </div>
              <div className="pr-modal-header-right">
                <span className="pr-modal-status-badge" style={{ color: status.color, background: status.bg }}>
                  {statusEmoji} {status.text}
                </span>
                <button className="pr-modal-close" onClick={() => setSelected(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="pr-modal-body">
              {/* Products */}
              <div className="pr-modal-section">
                <p className="pr-modal-section-title">Produk Dipesan</p>
                <div className="pr-modal-products">
                  {selected.products.map((p, i) => (
                    <div key={i} className="pr-modal-product">
                      <img src={p.image} alt={p.name} className="pr-modal-product-img" />
                      <div className="pr-modal-product-info">
                        <p className="pr-modal-product-name">{p.name}</p>
                        <p className="pr-modal-product-meta">{p.size} · Jml {p.qty}</p>
                      </div>
                      <span className="pr-modal-product-price">{fmt(p.price * p.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="pr-modal-cost-rows">
                  <div className="pr-modal-cost-row">
                    <span>Biaya pengiriman</span><span>{fmt(selected.deliveryFee)}</span>
                  </div>
                  <div className="pr-modal-cost-row pr-modal-cost-row--total">
                    <span>Total</span><span>{fmt(orderTotal(selected))}</span>
                  </div>
                </div>
              </div>

              {/* Status-specific info */}
              {sectionKey === "adminapproval" && (
                <div className="pr-modal-section">
                  <p className="pr-modal-section-title">Status Pesanan</p>
                  <div className="pr-modal-info-grid">
                    <div className="pr-modal-info-item pr-modal-info-item--full">
                      <span className="pr-modal-info-label">Update selanjutnya</span>
                      <span className="pr-modal-info-value">Pembayaran kamu sedang diverifikasi admin kami. Mohon tunggu hingga 1×24 jam.</span>
                    </div>
                  </div>
                </div>
              )}

              {sectionKey === "packing" && (
                <div className="pr-modal-section">
                  <p className="pr-modal-section-title">Informasi Pengemasan</p>
                  <div className="pr-modal-info-grid">
                    <div className="pr-modal-info-item">
                      <span className="pr-modal-info-label">Dikemas oleh</span>
                      <span className="pr-modal-info-value">{selected.packedBy}</span>
                    </div>
                    <div className="pr-modal-info-item">
                      <span className="pr-modal-info-label">Est. tanggal kirim</span>
                      <span className="pr-modal-info-value">{selected.estimatedShip}</span>
                    </div>
                  </div>
                </div>
              )}

              {sectionKey === "shipped" && (
                <div className="pr-modal-section">
                  <p className="pr-modal-section-title">Informasi Pengiriman</p>
                  <div className="pr-modal-info-grid">
                    <div className="pr-modal-info-item">
                      <span className="pr-modal-info-label">Kurir</span>
                      <span className="pr-modal-info-value">{selected.courier}</span>
                    </div>
                    <div className="pr-modal-info-item">
                      <span className="pr-modal-info-label">No. Resi</span>
                      <span className="pr-modal-info-value pr-modal-info-track">{selected.tracking}</span>
                    </div>
                    <div className="pr-modal-info-item">
                      <span className="pr-modal-info-label">Est. tiba</span>
                      <span className="pr-modal-info-value">{selected.estimatedArrival}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment */}
              <div className="pr-modal-section">
                <p className="pr-modal-section-title">Metode Pembayaran</p>
                <div className="pr-modal-payment">
                  <div className="pr-modal-payment-badge">{selected.payment.method}</div>
                  <div>
                    <p className="pr-modal-payment-account">{selected.payment.account}</p>
                    <p className="pr-modal-payment-holder">
                      {selected.payment.holder ? `a.n. ${selected.payment.holder}` : "Akun pembayaran yang digunakan untuk pesanan ini"}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Order Status Section ───────────────────────────────── */
const ORDER_STATUS_META = {
  pending:   { label: "Menunggu Konfirmasi", color: "#e09a3a", bg: "rgba(224,154,58,0.12)",   icon: <Clock size={14} /> },
  packing:   { label: "Sedang Dikemas",      color: "#4a9fd4", bg: "rgba(74,159,212,0.12)",   icon: <Package size={14} /> },
  shipped:   { label: "Dalam Pengiriman",    color: "#8b5cf6", bg: "rgba(139,92,246,0.12)",   icon: <Truck size={14} /> },
  delivered: { label: "Terkirim",            color: "#22c55e", bg: "rgba(34,197,94,0.12)",    icon: <PartyPopper size={14} /> },
  rejected:  { label: "Ditolak",             color: "#ef4444", bg: "rgba(239,68,68,0.12)",    icon: <XCircle size={14} /> },
  cancelled: { label: "Dibatalkan",          color: "#aaa",    bg: "rgba(170,170,170,0.12)",  icon: <Ban size={14} /> },
};

const STATUS_TABS = [
  { key: "all",       label: "Semua"   },
  { key: "pending",   label: "Menunggu" },
  { key: "packing",   label: "Dikemas"  },
  { key: "shipped",   label: "Dikirim"  },
  { key: "delivered", label: "Terkirim" },
  { key: "rejected",  label: "Ditolak"  },
  { key: "cancelled", label: "Batal"    },
];

function OrderStatusSection() {
  const navigate = useNavigate();
  const { orders } = useOrders();
  const { session } = useMockData();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();

  // Hanya tampilkan order milik user yang sedang login
  const myOrders = session
    ? orders.filter(o => o.customerId === session.userId || o.customer === session.name)
    : [];

  const filtered = myOrders.filter(o => {
    const matchTab = tab === "all" || o.status === tab;
    const matchQ   = !q || o.id.toLowerCase().includes(q) ||
      o.items?.some(i => i.name.toLowerCase().includes(q));
    return matchTab && matchQ;
  });

  return (
    <div className="pr-order-section">
      <div className="pr-order-header">
        <div>
          <h2 className="pr-section-title">Status Orderan</h2>
          <p className="pr-section-sub">{myOrders.length} total pesanan</p>
        </div>
      </div>

      {/* Tab filter */}
      <div className="pr-os-tabs">
        {STATUS_TABS.map(t => {
          const count = t.key === "all" ? myOrders.length : myOrders.filter(o => o.status === t.key).length;
          return (
            <button
              key={t.key}
              className={`pr-os-tab${tab === t.key ? " pr-os-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {count > 0 && <span className="pr-os-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="pr-search-wrap">
        <span className="pr-search-icon"><IconSearch /></span>
        <input
          className="pr-search-input"
          type="text"
          placeholder="Cari ID order atau produk…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && <button className="pr-search-clear" onClick={() => setQuery("")}>✕</button>}
      </div>

      {filtered.length === 0 ? (
        <div className="pr-placeholder">
          <p className="pr-placeholder-title">Belum ada pesanan</p>
          <p className="pr-placeholder-sub">Pesanan kamu akan muncul di sini setelah checkout.</p>
        </div>
      ) : (
        <div className="pr-os-list">
          {filtered.map(order => {
            const meta = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.pending;
            const itemCount = order.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
            return (
              <div
                key={order.id}
                className="pr-os-card"
                onClick={() => navigate("/orderdetail", { state: { orderId: order.id } })}
              >
                <div className="pr-os-card-top">
                  <span className="pr-os-status-badge" style={{ color: meta.color, background: meta.bg }}>
                    {meta.icon} {meta.label}
                  </span>
                  <span className="pr-os-date">{order.date}</span>
                </div>

                <div className="pr-os-items-row">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="pr-os-item-thumb">
                      {item.image
                        ? <img src={item.image} alt={item.name} />
                        : <span>{item.name?.[0] ?? "?"}</span>
                      }
                    </div>
                  ))}
                  {(order.items?.length ?? 0) > 3 && (
                    <div className="pr-os-item-thumb pr-os-item-more">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                <p className="pr-os-item-summary">
                  {order.items?.[0]?.name ?? "—"}
                  {(order.items?.length ?? 0) > 1 && (
                    <span className="pr-os-more-text"> & {order.items.length - 1} produk lainnya</span>
                  )}
                </p>

                <div className="pr-os-card-bottom">
                  <span className="pr-os-id">{order.id} · {itemCount} item</span>
                  <div className="pr-os-right">
                    <span className="pr-os-see-detail">Lihat Detail ›</span>
                    <span className="pr-os-total">{fmt(order.total)}</span>
                  </div>
                </div>

                {order.status === "pending" && order.cancelDeadlineTs && (
                  <div className="pr-os-cancel-hint">
                    Bisa dibatalkan · Lihat detail untuk info lebih lanjut
                  </div>
                )}
                {order.status === "rejected" && order.rejectionReason && (
                  <div className="pr-os-rejected-hint">
                    Alasan: {order.rejectionReason}
                  </div>
                )}
                {order.status === "shipped" && order.trackingNumber && (
                  <div className="pr-os-tracking-hint">
                    <Truck size={13} style={{ display: "inline", verticalAlign: "middle" }} /> {order.courier} · {order.trackingNumber}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Notifications Section ──────────────────────────────── */
const MOCK_NOTIFICATIONS = [
  { id: 1,  type: "order",    title: "Pesanan dibuat",                   body: "ORD-011 dikonfirmasi. Rp 362.000 via Transfer BCA.",                   time: "Baru saja",     read: false },
  { id: 2,  type: "order",    title: "Pesanan dibuat",                   body: "ORD-012 dikonfirmasi. Rp 205.000 via GoPay.",                          time: "5 menit lalu",  read: false },
  { id: 3,  type: "payment",  title: "Pembayaran disetujui",             body: "Admin telah memverifikasi Transfer BNI untuk ORD-013.",                time: "30 menit lalu", read: false },
  { id: 4,  type: "payment",  title: "Pembayaran disetujui",             body: "Admin telah memverifikasi pembayaran OVO untuk ORD-014.",              time: "1 jam lalu",    read: false },
  { id: 5,  type: "packing",  title: "Pesanan sedang dikemas",           body: "ORD-013 sedang disiapkan oleh tim kami. Est. kirim: 16 Apr.",          time: "2 jam lalu",    read: false },
  { id: 6,  type: "packing",  title: "Pesanan sedang dikemas",           body: "ORD-014 sedang dikemas. Est. kirim: 15 Apr.",                          time: "3 jam lalu",    read: true  },
  { id: 7,  type: "shipped",  title: "Pesanan dalam perjalanan!",        body: "ORD-015 dikirim via JNE Regular. No. Resi: JNE20250412005123.",        time: "Kemarin",       read: true  },
  { id: 8,  type: "shipped",  title: "Pesanan dalam perjalanan!",        body: "ORD-016 dikirim via SiCepat HALU. Est. tiba: 14 Apr.",                 time: "2 hari lalu",   read: true  },
  { id: 9,  type: "promo",    title: "Penawaran spesial untukmu",        body: "Dapatkan diskon 15% untuk pembelian berikutnya. Gunakan kode CARE15.", time: "3 hari lalu",   read: true  },
  { id: 10, type: "delivered", title: "Pesanan terkirim",                body: "ORD-007 telah tiba. Bagaimana pengalamanmu? Berikan ulasan!",          time: "8 hari lalu",   read: true  },
];

const NOTIF_META = {
  order:     { icon: <ShoppingBag size={16} />, color: "#e09a3a", bg: "rgba(224,154,58,0.1)"  },
  payment:   { icon: <CheckCircle size={16} />, color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  packing:   { icon: <Package size={16} />,     color: "#4a9fd4", bg: "rgba(74,159,212,0.1)"  },
  shipped:   { icon: <Truck size={16} />,       color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  delivered: { icon: <PartyPopper size={16} />, color: "#5aab6d", bg: "rgba(90,171,109,0.1)"  },
  promo:     { icon: <Tag size={16} />,         color: "#d6867c", bg: "rgba(214,134,124,0.1)" },
};

function NotificationsSection() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState("all");

  const unread   = notifs.filter(n => !n.read).length;
  const filters  = ["all", "order", "payment", "packing", "shipped", "promo"];
  const filtered = filter === "all" ? notifs : notifs.filter(n => n.type === filter);

  const markRead    = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = ()   => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismiss     = (id) => setNotifs(prev => prev.filter(n => n.id !== id));

  return (
    <div className="pr-order-section">
      <div className="pr-order-header">
        <div>
          <h2 className="pr-section-title">Notifikasi</h2>
          <p className="pr-section-sub">{unread} belum dibaca · {notifs.length} total</p>
        </div>
        {unread > 0 && (
          <button className="pr-notif-markall" onClick={markAllRead}>Tandai semua telah dibaca</button>
        )}
      </div>

      {/* Filter pills */}
      <div className="pr-notif-filters">
        {filters.map(f => (
          <button
            key={f}
            className={`pr-notif-pill${filter === f ? " pr-notif-pill--active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Semua" : f === "order" ? "Pesanan" : f === "payment" ? "Pembayaran" : f === "packing" ? "Pengemasan" : f === "shipped" ? "Dikirim" : "Promo"}
            <span className="pr-notif-pill-count">
              {f === "all" ? notifs.length : notifs.filter(n => n.type === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="pr-notif-list">
        {filtered.length === 0 ? (
          <div className="pr-placeholder">
            <p className="pr-placeholder-title">Tidak ada notifikasi</p>
            <p className="pr-placeholder-sub">Belum ada di kategori ini.</p>
          </div>
        ) : filtered.map(n => {
          const meta = NOTIF_META[n.type] ?? NOTIF_META.order;
          return (
            <div
              key={n.id}
              className={`pr-notif-item${n.read ? "" : " pr-notif-item--unread"}`}
              onClick={() => markRead(n.id)}
            >
              <div className="pr-notif-icon" style={{ background: meta.bg }}>
                <span>{meta.icon}</span>
              </div>
              <div className="pr-notif-body">
                <div className="pr-notif-top">
                  <span className="pr-notif-title">{n.title}</span>
                  <span className="pr-notif-time">{n.time}</span>
                </div>
                <p className="pr-notif-desc">{n.body}</p>
              </div>
              <div className="pr-notif-actions">
                {!n.read && <span className="pr-notif-dot" />}
                <button
                  className="pr-notif-dismiss"
                  onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Rate Order Section ─────────────────────────────────── */
function RateOrderSection() {
  const [query, setQuery]       = useState("");
  const [orders, setOrders]     = useState(MOCK_ORDERS.rateorder);
  const [selected, setSelected] = useState(null);
  const [hoverStar, setHoverStar] = useState(0);
  const [returnStep, setReturnStep]     = useState(null); // null | "picking" | "done"
  const [returnItems, setReturnItems]   = useState([]);   // selected product indices
  const [returnReason, setReturnReason] = useState("");
  const [returnMsg, setReturnMsg]       = useState("");
  const [activeTab, setActiveTab]       = useState("all");

  const q = query.toLowerCase();
  const filtered = orders
    .filter(o => {
      if (activeTab === "rated")   return o.rating !== null;
      if (activeTab === "unrated") return o.rating === null;
      return true;
    })
    .filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.products.some(p => p.name.toLowerCase().includes(q))
    );

  const setRating = (orderId, rating) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rating } : o));
    setSelected(prev => prev ? { ...prev, rating } : prev);
  };

  const handleDownload = (order) => {
    const lines = [
      "==============================",
      "  CAREOFYOU — ORDER RECEIPT",
      "==============================",
      `Order ID   : ${order.id}`,
      `Order Date : ${order.date}`,
      `Delivered  : ${order.deliveredDate}`,
      "",
      "── PRODUCTS ──────────────────",
      ...order.products.map(p =>
        `${p.brand} ${p.name} (${p.size})  x${p.qty}  ${fmt(p.price * p.qty)}`
      ),
      "",
      `Delivery Fee : ${fmt(order.deliveryFee)}`,
      `TOTAL        : ${fmt(order.total)}`,
      "",
      "── PAYMENT ───────────────────",
      `Method  : ${order.payment.method}`,
      `Account : ${order.payment.account}`,
      `Holder  : a.n. ${order.payment.holder}`,
      "",
      "── DELIVERY ──────────────────",
      `Courier   : ${order.delivery.courier}`,
      `Tracking  : ${order.delivery.tracking}`,
      `Recipient : ${order.delivery.recipient}  ${order.delivery.phone}`,
      `Address   : ${order.delivery.address}`,
      "",
      "Thank you for shopping at Careofyou!",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `bill-${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const orderTotal = (order) =>
    order.products.reduce((s, p) => s + p.price * p.qty, 0) + order.deliveryFee;

  const toggleReturnItem = (idx) =>
    setReturnItems(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);

  const submitReturn = () => {
    const names = returnItems.map(i => selected.products[i].name).join(", ");
    setReturnMsg(`Permintaan pengembalian diajukan untuk: ${names}. Tim kami akan menghubungi kamu dalam 24 jam.`);
    setReturnStep("done");
    setReturnItems([]);
    setReturnReason("");
  };

  const openModal = (order) => {
    setSelected(order);
    setHoverStar(0);
    setReturnMsg("");
    setReturnStep(null);
    setReturnItems([]);
    setReturnReason("");
  };

  return (
    <div className="pr-order-section">

      {/* Header */}
      <div className="pr-order-header">
        <div>
          <h2 className="pr-section-title">Riwayat Pesanan</h2>
          <p className="pr-section-sub">{orders.length} pesanan selesai</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="pr-rate-tabs">
        {[["all", "Semua"], ["unrated", "Belum Dinilai"], ["rated", "Sudah Dinilai"]].map(([key, label]) => (
          <button
            key={key}
            className={`pr-rate-tab${activeTab === key ? " pr-rate-tab--active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
            <span className="pr-rate-tab-count">
              {key === "all"
                ? orders.length
                : orders.filter(o => key === "rated" ? o.rating !== null : o.rating === null).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="pr-search-wrap">
        <span className="pr-search-icon"><IconSearch /></span>
        <input
          className="pr-search-input"
          type="text"
          placeholder="Cari berdasarkan ID order atau produk…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && <button className="pr-search-clear" onClick={() => setQuery("")}>✕</button>}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="pr-placeholder">
          <p className="pr-placeholder-title">Pesanan tidak ditemukan</p>
          <p className="pr-placeholder-sub">Coba kata kunci lain.</p>
        </div>
      ) : (
        <div className="pr-order-list">
          {filtered.map(order => {
            const total = orderTotal(order);
            const itemCount = order.products.reduce((s, p) => s + p.qty, 0);
            return (
              <div
                key={order.id}
                className="pr-order-card pr-order-card--clickable"
                onClick={() => openModal(order)}
              >
                {/* top: status */}
                <div className="pr-order-top">
                  <span className="pr-order-status" style={{ color: "#5aab6d", background: "#f0faf3" }}>
                    ✓ Selesai
                  </span>
                </div>

                {/* thumbnail strip */}
                <div className="pr-order-thumbs">
                  {order.products.slice(0, 3).map((p, i) => (
                    <img key={i} src={p.image} alt={p.name} className="pr-order-thumb" />
                  ))}
                  {order.products.length > 3 && (
                    <span className="pr-order-thumb-more">+{order.products.length - 3}</span>
                  )}
                </div>

                {/* item summary */}
                <p className="pr-order-summary">
                  {order.products[0].name}
                  {order.products.length > 1 && (
                    <span className="pr-order-summary-more"> &amp; {order.products.length - 1} produk lainnya</span>
                  )}
                </p>

                {/* bottom: id + date + rating + total */}
                <div className="pr-order-bottom">
                  <div className="pr-order-bottom-left">
                    <span className="pr-order-id">{order.id}</span>
                    <span className="pr-order-meta">· {itemCount} item · Terkirim {order.deliveredDate}</span>
                  </div>
                  <div className="pr-order-bottom-right">
                    {order.rating ? (
                      <span className="pr-order-rated">{"★".repeat(order.rating)}{"☆".repeat(5 - order.rating)}</span>
                    ) : (
                      <span className="pr-order-unrated">Ketuk untuk nilai ›</span>
                    )}
                    <span className="pr-order-total">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {selected && (
        <div className="pr-modal-overlay" onClick={() => setSelected(null)}>
          <div className="pr-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="pr-modal-header">
              <div>
                <p className="pr-modal-order-id">{selected.id} · {selected.date}</p>
                <h3 className="pr-modal-title">Detail Pesanan</h3>
              </div>
              <div className="pr-modal-header-right">
                <span className="pr-modal-status-badge">✓ Completed</span>
                <button className="pr-modal-close" onClick={() => setSelected(null)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="pr-modal-body">

              {/* Products */}
              <div className="pr-modal-section">
                <p className="pr-modal-section-title">Produk Dipesan</p>
                <div className="pr-modal-products">
                  {selected.products.map((p, i) => (
                    <div key={i} className="pr-modal-product">
                      <img src={p.image} alt={p.name} className="pr-modal-product-img" />
                      <div className="pr-modal-product-info">
                        <span className="pr-modal-product-brand">{p.brand}</span>
                        <p className="pr-modal-product-name">{p.name}</p>
                        <p className="pr-modal-product-meta">{p.size} · Jml {p.qty}</p>
                      </div>
                      <span className="pr-modal-product-price">{fmt(p.price * p.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="pr-modal-cost-rows">
                  <div className="pr-modal-cost-row">
                    <span>Biaya pengiriman</span><span>{fmt(selected.deliveryFee)}</span>
                  </div>
                  <div className="pr-modal-cost-row pr-modal-cost-row--total">
                    <span>Total</span><span>{fmt(orderTotal(selected))}</span>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="pr-modal-section">
                <p className="pr-modal-section-title">Informasi Pengiriman</p>
                <div className="pr-modal-info-grid">
                  <div className="pr-modal-info-item">
                    <span className="pr-modal-info-label">Kurir</span>
                    <span className="pr-modal-info-value">{selected.delivery.courier}</span>
                  </div>
                  <div className="pr-modal-info-item">
                    <span className="pr-modal-info-label">No. Resi</span>
                    <span className="pr-modal-info-value pr-modal-info-track">{selected.delivery.tracking}</span>
                  </div>
                  <div className="pr-modal-info-item">
                    <span className="pr-modal-info-label">Tanggal Terima</span>
                    <span className="pr-modal-info-value">{selected.deliveredDate}</span>
                  </div>
                  <div className="pr-modal-info-item">
                    <span className="pr-modal-info-label">Penerima</span>
                    <span className="pr-modal-info-value">{selected.delivery.recipient} · {selected.delivery.phone}</span>
                  </div>
                  <div className="pr-modal-info-item pr-modal-info-item--full">
                    <span className="pr-modal-info-label">Alamat</span>
                    <span className="pr-modal-info-value">{selected.delivery.address}</span>
                  </div>
                </div>
              </div>

              {/* Payment */}
              <div className="pr-modal-section">
                <p className="pr-modal-section-title">Metode Pembayaran</p>
                <div className="pr-modal-payment">
                  <div className="pr-modal-payment-badge">{selected.payment.method}</div>
                  <div>
                    <p className="pr-modal-payment-account">{selected.payment.account}</p>
                    <p className="pr-modal-payment-holder">a.n. {selected.payment.holder}</p>
                  </div>
                </div>
              </div>

              {/* Star rating */}
              <div className="pr-modal-section">
                <p className="pr-modal-section-title">Nilai Pesanan Ini</p>
                <div className="pr-stars">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      className={`pr-star${(hoverStar || selected.rating || 0) >= n ? " pr-star--filled" : ""}`}
                      onMouseEnter={() => setHoverStar(n)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setRating(selected.id, n)}
                    >★</button>
                  ))}
                </div>
                {selected.rating && (
                  <p className="pr-rating-label">Kamu memberi nilai {selected.rating}/5 — Terima kasih!</p>
                )}
              </div>

              {/* ── Return flow ── */}
              {returnStep === "picking" && (
                <div className="pr-modal-section pr-return-picker">
                  <p className="pr-modal-section-title">Pilih Produk untuk Dikembalikan</p>
                  {selected.products.map((p, i) => (
                    <label key={i} className={`pr-return-item-row${returnItems.includes(i) ? " pr-return-item-row--checked" : ""}`}>
                      <input
                        type="checkbox"
                        className="pr-return-checkbox"
                        checked={returnItems.includes(i)}
                        onChange={() => toggleReturnItem(i)}
                      />
                      <img src={p.image} alt={p.name} className="pr-return-item-img" />
                      <div className="pr-return-item-info">
                        <span className="pr-return-item-name">{p.name}</span>
                        <span className="pr-return-item-meta">{p.size} · Qty {p.qty}</span>
                      </div>
                    </label>
                  ))}
                  <select
                    className="pr-setting-select pr-return-reason-select"
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                  >
                    <option value="">Pilih alasan…</option>
                    <option value="damaged">Produk tiba dalam kondisi rusak</option>
                    <option value="wrong">Produk yang diterima salah</option>
                    <option value="not_as_described">Tidak sesuai deskripsi</option>
                    <option value="changed_mind">Berubah pikiran</option>
                    <option value="other">Lainnya</option>
                  </select>
                  <div className="pr-modal-actions">
                    <button className="pr-modal-btn pr-modal-btn--return" onClick={() => setReturnStep(null)}>Batal</button>
                    <button
                      className="pr-modal-btn pr-modal-btn--download"
                      disabled={returnItems.length === 0 || !returnReason}
                      onClick={submitReturn}
                    >Ajukan Pengembalian</button>
                  </div>
                </div>
              )}

              {returnMsg && <div className="pr-return-toast">{returnMsg}</div>}

              {/* Actions */}
              {returnStep !== "picking" && (
              <div className="pr-modal-actions">
                <button
                  className="pr-modal-btn pr-modal-btn--return"
                  disabled={returnStep === "done"}
                  onClick={() => setReturnStep("picking")}
                >
                  Kembalikan Produk
                </button>
                <button
                  className="pr-modal-btn pr-modal-btn--download"
                  onClick={() => handleDownload(selected)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6,verticalAlign:"middle"}}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Unduh Tagihan
                </button>
              </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings Section ───────────────────────────────────── */
function SettingSection() {
  const navigate = useNavigate();

  // Password
  const [showPw, setShowPw]   = useState(false);
  const [pwForm, setPwForm]   = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  // Toggles
  const [twoFA, setTwoFA] = useState(false);
  const [notifs, setNotifs] = useState({
    orderUpdates: true,
    promotions:   true,
    newArrivals:  false,
  });

  // Language
  const [language, setLanguage] = useState("en");

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError("Harap isi semua kolom."); return;
    }
    if (pwForm.next.length < 8) {
      setPwError("Kata sandi baru minimal 8 karakter."); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Kata sandi baru tidak cocok."); return;
    }
    setPwError("");
    setPwSaved(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setShowPw(false);
    setTimeout(() => setPwSaved(false), 3500);
  };

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      className={`pr-toggle${checked ? " pr-toggle--on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="pr-toggle-knob" />
    </button>
  );

  return (
    <div className="pr-setting-section">

      <div className="pr-setting-header">
        <h2 className="pr-section-title">Pengaturan</h2>
        <p className="pr-section-sub">Kelola preferensi akun kamu</p>
      </div>

      {pwSaved && (
        <div className="pr-setting-toast">✓ Kata sandi berhasil diperbarui.</div>
      )}

      {/* ── Account & Security ── */}
      <div className="pr-setting-group">
        <p className="pr-setting-group-label">Akun &amp; Keamanan</p>

        <div className="pr-setting-row">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Kata Sandi</span>
            <span className="pr-setting-row-sub">Terakhir diubah 3 bulan lalu</span>
          </div>
          <button
            className="pr-setting-action-btn"
            onClick={() => { setShowPw(v => !v); setPwError(""); }}
          >
            {showPw ? "Batal" : "Ubah"}
          </button>
        </div>

        {showPw && (
          <form className="pr-setting-subform" onSubmit={handlePasswordSubmit}>
            <div className="pr-form-group">
              <label className="pr-form-label">Kata Sandi Saat Ini</label>
              <input className="pr-input" type="password" placeholder="••••••••"
                value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
            </div>
            <div className="pr-form-row">
              <div className="pr-form-group">
                <label className="pr-form-label">Kata Sandi Baru</label>
                <input className="pr-input" type="password" placeholder="Min. 8 karakter"
                  value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} />
              </div>
              <div className="pr-form-group">
                <label className="pr-form-label">Konfirmasi Kata Sandi</label>
                <input className="pr-input" type="password" placeholder="Ulangi kata sandi baru"
                  value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
              </div>
            </div>
            {pwError && <p className="pr-addr-error">{pwError}</p>}
            <button type="submit" className="pr-save-btn" style={{ padding: "11px 32px", marginTop: 2 }}>
              Perbarui Kata Sandi
            </button>
          </form>
        )}

        <div className="pr-setting-row">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Autentikasi Dua Faktor</span>
            <span className="pr-setting-row-sub">
              {twoFA ? "Aktif — perlindungan tambahan sudah aktif" : "Tambahkan lapisan perlindungan login ekstra"}
            </span>
          </div>
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </div>

        <div className="pr-setting-row">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Akun Terhubung</span>
            <span className="pr-setting-row-sub">sara.tancredi@gmail.com</span>
          </div>
          <span className="pr-setting-chip pr-setting-chip--green">Terverifikasi</span>
        </div>
      </div>

      {/* ── Notifications ── */}
      <div className="pr-setting-group">
        <p className="pr-setting-group-label">Notifikasi</p>
        {[
          { key: "orderUpdates", title: "Update Pesanan",     sub: "Pengiriman, pengantaran & perubahan status" },
          { key: "promotions",   title: "Promosi & Penawaran", sub: "Diskon, voucher & penawaran spesial" },
          { key: "newArrivals",  title: "Produk Baru",         sub: "Jadilah yang pertama tahu tentang produk baru" },
        ].map(item => (
          <div key={item.key} className="pr-setting-row">
            <div className="pr-setting-row-info">
              <span className="pr-setting-row-title">{item.title}</span>
              <span className="pr-setting-row-sub">{item.sub}</span>
            </div>
            <Toggle checked={notifs[item.key]} onChange={v => setNotifs({ ...notifs, [item.key]: v })} />
          </div>
        ))}
      </div>

      {/* ── Language & Region ── */}
      <div className="pr-setting-group">
        <p className="pr-setting-group-label">Bahasa &amp; Wilayah</p>
        <div className="pr-setting-row">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Bahasa</span>
            <span className="pr-setting-row-sub">Pilih bahasa tampilan yang kamu inginkan</span>
          </div>
          <select
            className="pr-setting-select"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
        </div>
        <div className="pr-setting-row">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Mata Uang</span>
            <span className="pr-setting-row-sub">Digunakan untuk semua tampilan harga</span>
          </div>
          <span className="pr-setting-chip">IDR — Rp</span>
        </div>
        <div className="pr-setting-row">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Zona Waktu</span>
            <span className="pr-setting-row-sub">Semua waktu ditampilkan dalam zona lokal kamu</span>
          </div>
          <span className="pr-setting-chip">WITA (UTC+8)</span>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="pr-setting-group pr-setting-group--danger">
        <p className="pr-setting-group-label pr-setting-group-label--danger">Zona Bahaya</p>
        <div className="pr-setting-row pr-setting-row--last">
          <div className="pr-setting-row-info">
            <span className="pr-setting-row-title">Hapus Akun</span>
            <span className="pr-setting-row-sub">Hapus akun dan semua data secara permanen. Tindakan ini tidak dapat dibatalkan.</span>
          </div>
          <button className="pr-setting-danger-btn" onClick={() => navigate("/")}>Hapus</button>
        </div>
      </div>

    </div>
  );
}


/* ── Main component ─────────────────────────────────────── */
export default function MyProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logoutUser } = useMockData();
  const [activeNav, setActiveNav] = useState(location.state?.tab ?? "userinfo");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate("/login", { replace: true });
  };

  const renderContent = () => {
    switch (activeNav) {
      case "userinfo":     return <UserInfoSection />;
      case "myaddress":    return <MyAddressSection />;
      case "orderstatus":  return <OrderStatusSection />;
      case "setting":      return <SettingSection />;
      case "notifications":return <NotificationsSection />;
      default:             return null;
    }
  };

  return (
    <div className="pr-page">

      {/* ── LOGOUT CONFIRM POPUP ── */}
      {showLogoutConfirm && (
        <div className="pr-modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div
            className="pr-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, padding: "32px 28px", textAlign: "center" }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "rgba(214,134,124,0.12)", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <IconLogOut />
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
              Yakin mau keluar?
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#666", margin: "0 0 28px", lineHeight: 1.5 }}>
              Kamu akan keluar dari akun <strong>{session.email}</strong>.<br />
              Sesi login akan dihapus.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                className="pr-modal-btn"
                style={{ minWidth: 100, background: "#f5f5f5", color: "#444" }}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Batal
              </button>
              <button
                className="pr-modal-btn"
                style={{ minWidth: 100, background: "#c4706a", color: "#fff" }}
                onClick={handleLogout}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <Navbar
        activePage="myprofile"
        allProducts={PRODUCTS}
        onHomeClick={() => navigate("/")}
        onProductsClick={() => navigate("/products")}
      />

      {/* ── BODY ── */}
      <div className="pr-body">

        {/* Sidebar */}
        <aside className="pr-sidebar">
          <h2 className="pr-sidebar-title">Profil Pengguna</h2>
          <nav className="pr-sidebar-nav">
            {navItems.map((item) => (
              <div
                key={item.id}
                className={`pr-nav-item${activeNav === item.id ? " pr-nav-item--active" : ""}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="pr-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
          <div className="pr-sidebar-logout" onClick={() => setShowLogoutConfirm(true)}>
            <span className="pr-nav-icon"><IconLogOut /></span>
            <span>Keluar</span>
          </div>
        </aside>

        <div className="pr-sidebar-divider" />

        {/* Main + Footer */}
        <main className="pr-main">
          <div className="pr-content">
            {renderContent()}
          </div>

          <Footer />
        </main>
      </div>

    </div>
  );
}
