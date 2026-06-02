import { useState } from "react";
import { useMockData } from "../../context/MockDataContext.jsx";
import { IcStore } from "../shared.jsx";

/* ═══════════════════════════════════════════════════════════
   SECTION: SETTINGS
   ═══════════════════════════════════════════════════════════ */
export default function Settings() {
  const { resetAllMockData } = useMockData();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    storeName: "Careofyou",
    storeEmail: "hello@careofyou.id",
    storePhone: "+62 812-3456-7890",
    storeAddress: "Manado, Sulawesi Utara",
    storeIG: "@careofyou.id",
    storeShopee: "careofyou.id",
    payBCA: "1234-5678-90",
    payBNI: "0987-6543-21",
    payDANA: "0812-3456-7890",
  });

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSave = e => { e.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const handleResetMockData = () => {
    resetAllMockData();
    setSaved(false);
  };

  return (
    <div className="adm-section">
      <div className="adm-section-header">
        <div>
          <h2 className="adm-section-title">Pengaturan Toko</h2>
          <p className="adm-section-sub">Kelola informasi dan konfigurasi toko.</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="adm-settings-grid">
          {/* Store Info */}
          <div className="adm-card adm-settings-card">
            <div className="adm-card-header">
              <h3 className="adm-card-title"><IcStore /> Info Toko</h3>
            </div>
            <div className="adm-settings-fields">
              {[
                { label: "Nama Toko", name: "storeName" },
                { label: "Email", name: "storeEmail" },
                { label: "No. WhatsApp", name: "storePhone" },
                { label: "Alamat", name: "storeAddress" },
              ].map(f => (
                <div key={f.name} className="adm-form-group">
                  <label>{f.label}</label>
                  <input name={f.name} value={form[f.name]} onChange={handleChange} className="adm-input" />
                </div>
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div className="adm-card adm-settings-card">
            <div className="adm-card-header">
              <h3 className="adm-card-title">Sosial Media & Toko Online</h3>
            </div>
            <div className="adm-settings-fields">
              {[
                { label: "Instagram", name: "storeIG" },
                { label: "Shopee", name: "storeShopee" },
              ].map(f => (
                <div key={f.name} className="adm-form-group">
                  <label>{f.label}</label>
                  <input name={f.name} value={form[f.name]} onChange={handleChange} className="adm-input" />
                </div>
              ))}
            </div>
            <div className="adm-card-header" style={{ marginTop: 24 }}>
              <h3 className="adm-card-title">Rekening Pembayaran</h3>
            </div>
            <div className="adm-settings-fields">
              {[
                { label: "BCA", name: "payBCA" },
                { label: "BNI", name: "payBNI" },
                { label: "DANA", name: "payDANA" },
              ].map(f => (
                <div key={f.name} className="adm-form-group">
                  <label>{f.label}</label>
                  <input name={f.name} value={form[f.name]} onChange={handleChange} className="adm-input" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="adm-settings-save">
          <button type="submit" className={`adm-primary-btn${saved ? " adm-primary-btn--saved" : ""}`}>
            {saved ? "✓ Tersimpan!" : "Simpan Perubahan"}
          </button>
          <button type="button" className="adm-ghost-btn" onClick={handleResetMockData}>
            Reset Data Mock
          </button>
        </div>
      </form>
    </div>
  );
}
