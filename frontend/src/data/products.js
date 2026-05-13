const u = (id, crop = "center") =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=400&q=80&crop=${crop}`;

const A = u("1556228578-8c89e6adf883");
const E = u("1620916566398-39f1143ab7be");
const C = u("1598440947619-2c35fc9aa908");
const K = u("1571781926291-c477ebfd024b");
const M = u("1512290923902-8a9f81dc236c");
const N = u("1596755389378-c31d21fd1273");
const P1 = u("1512496522827-84765143aa95");
const P2 = u("1522335789-8b3af9c8f853");
const P3 = u("1596462502278-27bfdc228f4a");
const P4 = u("1541643600914-78b84acb6357");
const P8 = u("1570194065650-d99fb4bedf0a");

export const FALLBACK_IMG = A;

export const PRODUCTS = [
  // ── SKINCARE ─────────────────────────────────────────────────
  { id: 1, brand: "COSRX",      name: "Low pH Good Morning Cleanser",          category: "Skincare", price: 125000,  image: A,  rating: 4.9, reviews: 487,  desc: "Pembersih wajah dengan pH rendah yang lembut namun efektif, tidak merusak skin barrier. Favorit skincare enthusiast dunia.",               qrCode: "PROD-001-SKN-QR-BW4JMQRP", bestseller: true  },
  { id: 2, brand: "Skintific",  name: "5% Niacinamide Barrier Serum",          category: "Skincare", price: 149000,  image: E,  rating: 4.8, reviews: 534,  desc: "Serum niacinamide 5% paling viral dari Skintific. Mencerahkan, mengecilkan pori, dan memperbaiki skin barrier.",                           qrCode: "PROD-002-SKN-QR-GX2MVRLE", bestseller: true  },
  { id: 3, brand: "Laneige",   name: "Water Sleeping Mask",                    category: "Skincare", price: 285000,  image: C,  rating: 4.9, reviews: 654,  desc: "Sleeping mask ikonik dari Laneige. Menghidrasi dan memperbaiki kulit saat tidur dengan teknologi Water Science.",                           qrCode: "PROD-003-SKN-QR-LN5WSLMK", bestseller: true  },

  // ── MAKEUP ───────────────────────────────────────────────────
  { id: 4, brand: "Rhode",      name: "Peptide Lip Treatment",                 category: "Makeup",   price: 395000,  image: P1, rating: 4.9, reviews: 1243, desc: "Lip treatment peptide viral dari Rhode. Formula glassy yang melembapkan, plumping, dan memberikan efek glass lips.",                       qrCode: "PROD-004-MKP-QR-RH4PLT",   bestseller: true  },
  { id: 5, brand: "Rare Beauty", name: "Soft Pinch Liquid Blush",             category: "Makeup",   price: 440000,  image: P3, rating: 4.9, reviews: 2678, desc: "Liquid blush viral Selena Gomez's Rare Beauty. Formula ultra-lightweight yang blendable. Warna intens tahan lama.",                         qrCode: "PROD-005-MKP-QR-RB15SPL",  bestseller: true  },
  { id: 6, brand: "Maybelline", name: "Fit Me Luminous + Smooth Foundation",  category: "Makeup",   price: 175000,  image: P3, rating: 4.7, reviews: 1534, desc: "Foundation drugstore favorit dengan formula yang merata sempurna dan memberikan finish natural luminous.",                                 qrCode: "PROD-006-MKP-QR-MB8FMF",   bestseller: false },

  // ── TOOLS ────────────────────────────────────────────────────
  { id: 7, brand: "FOREO",      name: "LUNA Mini 3 Facial Device",             category: "Tools",    price: 1750000, image: K,  rating: 4.9, reviews: 543,  desc: "Alat pembersih wajah sonic dari FOREO dengan T-Sonic pulsation yang membersihkan pori secara mendalam dan meningkatkan penyerapan skincare.", qrCode: "PROD-007-TLS-QR-FR41LM3",  bestseller: true  },
  { id: 8, brand: "Sigma Beauty", name: "F80 Kabuki Face Brush",              category: "Tools",    price: 380000,  image: P2, rating: 4.8, reviews: 876,  desc: "Kabuki brush premium dari Sigma Beauty dengan SigmaFUSE technology untuk buffing foundation dengan flawless airbrushed finish.",         qrCode: "PROD-008-TLS-QR-SG40KFB",  bestseller: false },
  { id: 9, brand: "Real Techniques", name: "Miracle Complexion Sponge",      category: "Tools",    price: 135000,  image: P2, rating: 4.7, reviews: 2134, desc: "Beauty blender dari Real Techniques untuk aplikasi foundation, concealer, dan blush yang flawless. Pakai kering atau lembap.",            qrCode: "PROD-009-TLS-QR-RT39MCS",  bestseller: false },

  // ── BODY CARE ────────────────────────────────────────────────
  { id: 10, brand: "CeraVe",    name: "Moisturizing Cream Body",              category: "Body Care", price: 285000, image: P8, rating: 4.9, reviews: 3421, desc: "Krim tubuh dermatologist-recommended dengan ceramide dan hyaluronic acid untuk hidrasi 24 jam. Cocok untuk kulit kering dan sensitif.", qrCode: "PROD-010-BDY-QR-CV20MCB",   bestseller: true  },
  { id: 11, brand: "Sol de Janeiro", name: "Brazilian Bum Bum Body Butter",  category: "Body Care", price: 620000, image: M,  rating: 4.9, reviews: 2345, desc: "Body butter viral dengan guaraná dan cupuaçu butter dari Brazil. Aroma karamel manis yang khas, kulit menjadi super lembap dan glowing.", qrCode: "PROD-011-BDY-QR-SJ19BBB",   bestseller: true  },
  { id: 12, brand: "Scarlett Whitening", name: "Body Lotion Freshy",         category: "Body Care", price: 65000,  image: N,  rating: 4.7, reviews: 4532, desc: "Body lotion whitening terlaris Indonesia dari Scarlett. Formula lightweight dengan niacinamide dan glutathione untuk kulit cerah merata.", qrCode: "PROD-012-BDY-QR-SC24BLF",   bestseller: true  },
];
