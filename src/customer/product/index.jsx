import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../home/index.css";
import "./index.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useSearch } from "../context/SearchContext";
import { PRODUCTS, FALLBACK_IMG } from "../../data/products.js";

const BROAD_CATEGORIES = ["All", "Skincare", "Makeup", "Haircare", "Body Care", "Fragrance", "Makeup Tools"];

const CATEGORY_MAP = {
  Skincare: ["Cleanser", "Toner", "Serum", "Moisturizer", "Sunscreen", "Eye Cream", "Essence", "Exfoliator", "Face Mask", "Skincare", "Night Care", "Eye Care"],
  Makeup: ["Makeup", "Foundation", "Lipstick", "Mascara", "Blush", "Eyeshadow", "Concealer", "Primer", "Setting Spray"],
  Haircare: ["Haircare", "Shampoo", "Conditioner", "Hair Mask", "Hair Oil", "Hair Serum"],
  "Body Care": ["Body Care", "Body Wash", "Body Lotion", "Body Scrub", "Tools", "Tools & Accessories"],
  Fragrance: ["Fragrance", "Perfume"],
  "Makeup Tools": ["Makeup Tools", "Tools", "Accessories"],
};

function formatRupiah(number) {
  return "Rp " + number.toLocaleString("id-ID");
}

const HeartIcon = ({ filled }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function ProductPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { favorites, toggleFavorite, addToWishlist } = useWishlist();
  const { searchQuery, searchResults, shouldOpenSearch, closeSearchPanel, clearSearch } = useSearch();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [quickView, setQuickView] = useState(null);

  useEffect(() => {
    if (shouldOpenSearch) {
      setSearchOpen(true);
      closeSearchPanel();
    }
  }, [shouldOpenSearch, closeSearchPanel]);

  const filteredProducts = searchQuery.trim()
    ? searchResults
    : activeCategory === "All"
    ? PRODUCTS
    : PRODUCTS.filter((p) => {
        const mapped = CATEGORY_MAP[activeCategory];
        return mapped
          ? mapped.some(c => p.category?.toLowerCase() === c.toLowerCase())
          : p.category === activeCategory;
      });

  const handleToggleFavorite = (product) => {
    if (favorites.has(product.id)) {
      toggleFavorite(product.id);
    } else {
      addToWishlist(product);
    }
  };

  // close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setQuickView(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resultCount = filteredProducts.length;

  return (
    <div className="product-page">
      <Navbar
        activePage="products"
        allProducts={PRODUCTS}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        onHomeClick={() => navigate("/")}
        onProductsClick={() => {
          setSearchOpen(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      <section className="product-hero">
        <div className="product-hero-copy">
          <span className="product-kicker">Careofyou Catalog</span>
          <h1 className="product-title">
            {searchQuery.trim() ? `Results for "${searchQuery}"` : "Explore Our Products"}
          </h1>
          <p className="product-desc">
            Semua katalog sekarang ada di page khusus Products biar browsing, filter, dan search terasa lebih fokus.
          </p>
          <div className="product-stats">
            <div className="product-stat">
              <strong>{searchQuery.trim() ? resultCount : PRODUCTS.length}</strong>
              <span>{searchQuery.trim() ? "matching items" : "products ready"}</span>
            </div>
            <div className="product-stat">
              <strong>{BROAD_CATEGORIES.length - 1}</strong>
              <span>categories</span>
            </div>
            <div className="product-stat">
              <strong>4.9/5</strong>
              <span>customer picks</span>
            </div>
          </div>
        </div>

        <div className="product-hero-card">
          <p className="product-hero-card-label">Popular Categories</p>
          <div className="product-chip-list">
            {BROAD_CATEGORIES.slice(1, 5).map((category) => (
              <span key={category} className="product-chip">{category}</span>
            ))}
          </div>
          <p className="product-hero-card-note">
            Pakai tombol search di navbar kalau kamu mau cari produk, brand, atau kategori tertentu.
          </p>
        </div>
      </section>

      <section className="home-section product-catalog">
        <div className="home-section-header product-catalog-header">
          <div>
            <h2 className="home-section-title">
              {searchQuery.trim() ? `Results for "${searchQuery}"` : "All Products"}
            </h2>
            <p className="product-subline">
              {searchQuery.trim()
                ? `${resultCount} item${resultCount !== 1 ? "s" : ""} ditemukan`
                : "Browse semua produk beauty dalam satu halaman."}
            </p>
          </div>

          {searchQuery.trim() ? (
            <button className="product-clear-btn" onClick={clearSearch}>
              Show all products
            </button>
          ) : (
            <span className="products-count">{resultCount} products</span>
          )}
        </div>

        {!searchQuery.trim() && (
          <div className="category-tabs">
            {BROAD_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`category-tab${activeCategory === cat ? " category-tab--active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {searchQuery.trim() && searchResults.length === 0 ? (
          <div className="empty-search product-empty-search">
            <p className="empty-search-title">No products found</p>
            <p className="empty-search-sub">Try searching with a different keyword or show all products again.</p>
            <button className="product-clear-btn" onClick={clearSearch}>
              Reset search
            </button>
          </div>
        ) : (
          <div className="all-products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="prod-card" onClick={() => setQuickView(product)} style={{ cursor: "pointer" }}>
                <div className="prod-img-wrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="prod-img"
                    onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }}
                  />
                  {product.bestseller && <span className="prod-badge">Bestseller</span>}
                  <button
                    className={`cat-fav-btn${favorites.has(product.id) ? " cat-fav-btn--active" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(product); }}
                  >
                    <HeartIcon filled={favorites.has(product.id)} />
                  </button>
                </div>
                <div className="prod-info">
                  <p className="prod-brand">{product.brand}</p>
                  <p className="prod-name">{product.name}</p>
                  <p className="prod-cat-tag">{product.category}</p>
                  <div className="prod-bottom">
                    <div>
                      <p className="prod-rating">★ {product.rating} <span>({product.reviews})</span></p>
                      <p className="prod-price">{formatRupiah(product.price)}</p>
                    </div>
                    <button className="prod-cart-btn" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Footer />

      {/* ── QUICK VIEW MODAL (same as home page) ── */}
      {quickView && (
        <div className="qv-overlay" onClick={() => setQuickView(null)}>
          <div className="qv-modal" onClick={e => e.stopPropagation()}>
            <button className="qv-close" onClick={() => setQuickView(null)}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
            <div className="qv-body">
              <div className="qv-img-wrap">
                <img src={quickView.image} alt={quickView.name} onError={e => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                <div className="qv-img-gradient" />
                {quickView.bestseller && <span className="qv-img-badge">✦ Bestseller</span>}
                <div className="qv-img-category">{quickView.category}</div>
              </div>
              <div className="qv-info">
                <div className="qv-info-top">
                  <p className="qv-brand">{quickView.brand}</p>
                  <h3 className="qv-name">{quickView.name}</h3>
                  <div className="qv-stars-row">
                    <div className="qv-stars-visual">
                      {Array.from({ length: 5 }, (_, i) => {
                        const filled = i < Math.floor(quickView.rating);
                        const half   = !filled && i < quickView.rating;
                        return (
                          <svg key={i} width="14" height="14" viewBox="0 0 24 24" className={`qv-star${filled ? " qv-star--full" : half ? " qv-star--half" : ""}`}>
                            <defs>
                              {half && <linearGradient id={`hgp${i}`} x1="0" x2="1" y1="0" y2="0">
                                <stop offset="50%" stopColor="#f59e0b"/>
                                <stop offset="50%" stopColor="#e5e7eb"/>
                              </linearGradient>}
                            </defs>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                              fill={filled ? "#f59e0b" : half ? `url(#hgp${i})` : "#e5e7eb"} stroke="none" />
                          </svg>
                        );
                      })}
                    </div>
                    <span className="qv-rating-num">{quickView.rating}</span>
                    <span className="qv-review-count">({quickView.reviews.toLocaleString("id-ID")} ulasan)</span>
                  </div>
                </div>
                <div className="qv-divider" />
                <p className="qv-desc">{quickView.desc}</p>
                <div className="qv-divider" />
                <div className="qv-price-row">
                  <span className="qv-price">Rp {quickView.price.toLocaleString("id-ID")}</span>
                  <span className="qv-price-note">Free ongkir</span>
                </div>
                <div className="qv-actions">
                  <button className="qv-add-btn" onClick={() => { addToCart(quickView); setQuickView(null); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    Tambah ke Keranjang
                  </button>
                  <button
                    className={`qv-fav-btn${favorites.has(quickView.id) ? " qv-fav-btn--active" : ""}`}
                    onClick={() => handleToggleFavorite(quickView)}
                    title="Simpan ke wishlist"
                  >
                    <HeartIcon filled={favorites.has(quickView.id)} />
                  </button>
                </div>
                <div className="qv-trust-row">
                  <span className="qv-trust-item">✓ Produk original</span>
                  <span className="qv-trust-item">✓ Aman & terpercaya</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
