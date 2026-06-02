import { useState, useEffect } from "react";
import { PackagePlus } from "lucide-react";
import { useMockData } from "../../context/MockDataContext.jsx";
import {
  fmt,
  IcSearch,
  IcStar,
  IcEdit,
  IcTrash,
  ImageDropInput,
} from "../shared.jsx";

/* ═══════════════════════════════════════════════════════════
   SECTION: PRODUCTS
   ═══════════════════════════════════════════════════════════ */
export default function Products() {
  const { products: apiProducts, categories: apiCategories, refresh } = useMockData();
  const [localProducts, setLocalProducts] = useState([]);
  const [query, setQuery]       = useState("");
  const [catFilter, setCat]     = useState("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [newProd, setNewProd]   = useState({ name: "", category: "", price: "", image: "" });
  const [newCatCustom, setNewCatCustom] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // product being edited
  const [editProd, setEditProd]     = useState({ name: "", category: "", price: "", stock: "", image: "" });
  const [editLoading, setEditLoading] = useState(false);

  const _base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  useEffect(() => { setLocalProducts(apiProducts); }, [apiProducts]);

  const products = localProducts;
  const cats = ["all", ...Array.from(new Set(products.map(p => p.category)))];
  const dbCatNames = (apiCategories ?? []).map(c => c.name);
  const allCatOptions = Array.from(new Set([...dbCatNames, ...products.map(p => p.category).filter(Boolean)]));
  const filtered = products.filter(p => {
    const matchCat = catFilter === "all" || p.category === catFilter;
    const q = query.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const remove = async (id) => {
    setLocalProducts(prev => prev.filter(p => p.id !== id));
    try {
      await fetch(`${_base}/api/store/products/${id}/delete/`, { method: "DELETE" });
    } catch (_) {}
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const finalCategory = newProd.category === "Lainnya" ? newCatCustom.trim() : newProd.category;
    if (!newProd.name || !finalCategory || !newProd.price) return;
    setAddLoading(true);
    try {
      const res = await fetch(`${_base}/api/store/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProd.name,
          brand: newProd.brand || "",
          category: finalCategory,
          price: Number(newProd.price),
          stock: Number(newProd.stock) || 0,
          image: newProd.image || `https://placehold.co/300x300/f9f0ef/c87a74?text=${encodeURIComponent(newProd.name)}`,
        }),
      });
      const json = await res.json();
      if (res.ok && json.product) {
        setLocalProducts(prev => [...prev, { ...json.product, rating: 0, reviews: 0 }]);
        refresh();
      }
    } catch (_) {}
    setAddLoading(false);
    setNewProd({ name: "", category: "", price: "", image: "" });
    setNewCatCustom("");
    setShowAdd(false);
  };

  const openEdit = (p) => {
    setEditTarget(p);
    setEditProd({ name: p.name, category: p.category, price: String(p.price), stock: String(p.stock ?? 0), image: p.image });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${_base}/api/store/products/${editTarget.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProd.name,
          category: editProd.category,
          price: Number(editProd.price),
          stock: Number(editProd.stock) || 0,
          image: editProd.image,
        }),
      });
      const json = await res.json();
      if (res.ok && json.product) {
        setLocalProducts(prev => prev.map(p => p.id === editTarget.id ? { ...p, ...json.product } : p));
      }
    } catch (_) {}
    setEditLoading(false);
    setEditTarget(null);
  };

  return (
    <>
      <div className="adm-section">
        <div className="adm-section-header">
          <div>
            <h2 className="adm-section-title">Manajemen Produk</h2>
            <p className="adm-section-sub">{products.length} produk terdaftar</p>
          </div>
          <button className="adm-primary-btn" onClick={() => setShowAdd(v => !v)}>
            <PackagePlus size={17} style={{ marginRight: 6, verticalAlign: "middle" }} /> Tambah Produk
          </button>
        </div>

        {/* Add Product Form */}
        {showAdd && (
          <div className="adm-card adm-add-form-card">
            <h3 className="adm-card-title" style={{ marginBottom: 20 }}>Produk Baru</h3>
            <form className="adm-add-form" onSubmit={handleAdd}>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Nama Produk *</label>
                  <input placeholder="e.g. Vitamin C Serum" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} className="adm-input" />
                </div>
                <div className="adm-form-group">
                  <label>Kategori *</label>
                  <select
                    value={newProd.category}
                    onChange={e => { setNewProd(p => ({ ...p, category: e.target.value })); setNewCatCustom(""); }}
                    className="adm-input"
                  >
                    <option value="">-- Pilih Kategori --</option>
                    <option value="Skincare">Skincare</option>
                    <option value="Makeup">Makeup</option>
                    <option value="Tools">Tools</option>
                    <option value="Body Care">Body Care</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {newProd.category === "Lainnya" && (
                    <input
                      placeholder="Tulis kategori..."
                      value={newCatCustom}
                      onChange={e => setNewCatCustom(e.target.value)}
                      className="adm-input"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group">
                  <label>Harga per Pcs (Rp) *</label>
                  <input type="number" placeholder="e.g. 150000" value={newProd.price} onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} className="adm-input" />
                </div>
                <div className="adm-form-group">
                  <label>Stok (pcs)</label>
                  <input type="number" placeholder="e.g. 50" min="0" value={newProd.stock} onChange={e => setNewProd(p => ({ ...p, stock: e.target.value }))} className="adm-input" />
                </div>
              </div>
              <div className="adm-form-row">
                <div className="adm-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Foto Produk</label>
                  <ImageDropInput value={newProd.image} onChange={v => setNewProd(p => ({ ...p, image: v }))} />
                </div>
              </div>
              <div className="adm-form-actions">
                <button type="submit" className="adm-primary-btn" disabled={addLoading}>{addLoading ? "Menyimpan…" : "Simpan Produk"}</button>
                <button type="button" className="adm-ghost-btn" onClick={() => setShowAdd(false)}>Batal</button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="adm-filter-row">
          <div className="adm-search-bar">
            <IcSearch />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari produk…" className="adm-search-input" />
            {query && <button className="adm-search-clear" onClick={() => setQuery("")}>✕</button>}
          </div>
          <div className="adm-cat-pills">
            {cats.map(c => (
              <button key={c} className={`adm-cat-pill${catFilter === c ? " adm-cat-pill--active" : ""}`} onClick={() => setCat(c)}>
                {c === "all" ? "Semua" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Product table */}
        <div className="adm-card adm-table-card">
          <table className="adm-table adm-table--products">
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga / Pcs</th>
                <th>Stok</th>
                <th>Rating</th>
                <th>Ulasan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="adm-product-cell">
                      <img src={p.image} alt={p.name} className="adm-product-thumb" />
                      <span className="adm-product-name">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="adm-cat-badge">{p.category}</span></td>
                  <td><strong>{fmt(p.price)}</strong></td>
                  <td>{p.stock ?? 0} pcs</td>
                  <td>
                    <span className="adm-rating-cell"><IcStar /> {p.rating}</span>
                  </td>
                  <td className="adm-date-cell">{p.reviews}</td>
                  <td>
                    <div className="adm-action-btns">
                      <button className="adm-act-btn adm-act-btn--edit" title="Edit" onClick={() => openEdit(p)}><IcEdit /></button>
                      <button className="adm-act-btn adm-act-btn--danger" title="Hapus" onClick={() => remove(p.id)}><IcTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editTarget && (
        <div className="adm-modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="adm-ep-modal" onClick={e => e.stopPropagation()}>

            {/* Left — image panel */}
            <div className="adm-ep-img-panel">
              <div className="adm-ep-img-panel-bg" style={editProd.image ? { backgroundImage: `url(${editProd.image})` } : {}} />
              <div className="adm-ep-img-panel-overlay" />
              <div className="adm-ep-img-top">
                <span className="adm-ep-badge">Edit Produk</span>
                <button type="button" className="adm-ep-close" onClick={() => setEditTarget(null)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="adm-ep-img-center">
                <ImageDropInput value={editProd.image} onChange={v => setEditProd(p => ({ ...p, image: v }))} editMode />
              </div>
              <div className="adm-ep-img-bottom">
                <p className="adm-ep-prod-name">{editProd.name || editTarget.name}</p>
                <p className="adm-ep-prod-cat">{editProd.category || editTarget.category}</p>
              </div>
            </div>

            {/* Right — form panel */}
            <form className="adm-ep-form" onSubmit={handleEditSave}>
              <div className="adm-ep-form-header">
                <h3 className="adm-ep-form-title">Detail Produk</h3>
                <p className="adm-ep-form-sub">Ubah informasi produk di bawah ini</p>
              </div>

              <div className="adm-ep-fields">
                <div className="adm-ep-field">
                  <label className="adm-ep-label">Nama Produk <span>*</span></label>
                  <div className="adm-ep-input-wrap">
                    <svg className="adm-ep-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    <input
                      className="adm-ep-input"
                      placeholder="Masukkan nama produk"
                      value={editProd.name}
                      onChange={e => setEditProd(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="adm-ep-field">
                  <label className="adm-ep-label">Kategori <span>*</span></label>
                  <div className="adm-ep-input-wrap">
                    <svg className="adm-ep-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <select
                      className="adm-ep-input adm-ep-select"
                      value={editProd.category}
                      onChange={e => setEditProd(p => ({ ...p, category: e.target.value }))}
                    >
                      <option value="">— Pilih kategori —</option>
                      {apiCategories.map(c => (
                        <option key={c.id} value={c.name}>{c.label || c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="adm-ep-row">
                  <div className="adm-ep-field">
                    <label className="adm-ep-label">Harga (Rp) <span>*</span></label>
                    <div className="adm-ep-input-wrap">
                      <svg className="adm-ep-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <input
                        type="number"
                        className="adm-ep-input"
                        placeholder="0"
                        value={editProd.price}
                        onChange={e => setEditProd(p => ({ ...p, price: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="adm-ep-field">
                    <label className="adm-ep-label">Stok (pcs)</label>
                    <div className="adm-ep-input-wrap">
                      <svg className="adm-ep-input-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      <input
                        type="number"
                        min="0"
                        className="adm-ep-input"
                        placeholder="0"
                        value={editProd.stock}
                        onChange={e => setEditProd(p => ({ ...p, stock: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="adm-ep-actions">
                <button type="button" className="adm-ep-cancel" onClick={() => setEditTarget(null)}>Batal</button>
                <button type="submit" className="adm-ep-save" disabled={editLoading}>
                  {editLoading
                    ? <><span className="adm-ep-spinner" /> Menyimpan…</>
                    : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Simpan Perubahan</>
                  }
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
