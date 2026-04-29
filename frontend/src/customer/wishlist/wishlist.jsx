import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./wishlist.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { PRODUCTS } from "../../data/products.js";

export default function WishlistPage() {
  const navigate = useNavigate();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [addedIds, setAddedIds] = useState([]);

  const removeItem = (id) => {
    removeFromWishlist(id);
    setAddedIds((prev) => prev.filter((i) => i !== id));
  };

  const addToBag = (id) => {
    if (!addedIds.includes(id)) {
      const item = wishlistItems.find((i) => i.id === id);
      if (item) addToCart(item);
      setAddedIds((prev) => [...prev, id]);
    }
  };

  const addAllToBag = () => {
    wishlistItems.forEach((item) => {
      if (!addedIds.includes(item.id)) addToCart(item);
    });
    setAddedIds(wishlistItems.map((i) => i.id));
  };

  return (
    <div className="wl-page">
      {/* NAVBAR */}
      <Navbar 
        activePage="wishlist"
        allProducts={PRODUCTS}
        onHomeClick={() => navigate("/")}
        onProductsClick={() => navigate("/products")}
      />

      {/* PAGE CONTENT */}
      <main className="wl-main">
        <div className="wl-container">
          {/* HEADER */}
          <div className="wl-header">
            <div>
              <h1 className="wl-title">Favorit Kamu</h1>
              <p className="wl-subtitle">{wishlistItems.length} produk tersimpan</p>
            </div>
            {wishlistItems.length > 0 && (
              <button className="wl-add-all-btn" onClick={addAllToBag}>
                Tambah semua ke keranjang
              </button>
            )}
          </div>

          {/* DIVIDER */}
          <div className="wl-divider" />

          {/* EMPTY STATE */}
          {wishlistItems.length === 0 && (
            <div className="wl-empty">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#e0b0ac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <p className="wl-empty-text">Wishlist kamu kosong</p>
              <p className="wl-empty-sub">Simpan produk favoritmu di sini</p>
              <button className="wl-browse-btn" onClick={() => navigate("/products")}>Jelajahi Produk</button>
            </div>
          )}

          {/* ITEM LIST */}
          <div className="wl-list">
            {wishlistItems.map((item) => (
              <div key={item.id} className="wl-card">
                <div className="wl-card-img-wrap">
                  <img src={item.image} alt={item.name} className="wl-card-img" />
                </div>

                <div className="wl-card-info">
                  {item.brand && <p className="wl-card-brand">{item.brand}</p>}
                  <p className="wl-card-name">{item.name}</p>
                  <p className="wl-card-price">
                    {typeof item.price === 'number' 
                      ? `Rp ${item.price.toLocaleString('id-ID')}` 
                      : item.price}
                  </p>
                  {item.category && <p className="wl-card-size">{item.category}</p>}
                  {item.size && <p className="wl-card-size">Ukuran: {item.size}</p>}

                  <button
                    className={`wl-add-btn ${addedIds.includes(item.id) ? "wl-add-btn--added" : ""}`}
                    onClick={() => addToBag(item.id)}
                    disabled={addedIds.includes(item.id)}
                  >
                    {addedIds.includes(item.id) ? "Ditambahkan ✓" : "Tambah ke Keranjang"}
                  </button>
                </div>

                <button
                  className="wl-remove-btn"
                  onClick={() => removeItem(item.id)}
                  title="Hapus dari wishlist"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
