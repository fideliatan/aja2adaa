export const SHOP_CATEGORIES = [
  {
    id: "skincare",
    name: "Skincare",
    label: "Glow",
    desc: "Cleansers, toners, serums & moisturizers",
    img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&h=450&q=80",
  },
  {
    id: "makeup",
    name: "Makeup",
    label: "Tint",
    desc: "Easy everyday picks for lips, base & more",
    img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&h=450&q=80",
  },
  {
    id: "tools",
    name: "Tools",
    label: "Tools",
    desc: "Brushes, sponges & skincare devices",
    img: "https://images.unsplash.com/photo-1522335789-8b3af9c8f853?auto=format&fit=crop&w=600&h=450&q=80",
  },
  {
    id: "bodycare",
    name: "Body Care",
    label: "Body",
    desc: "Body wash, scrubs & everything in between",
    img: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=600&h=450&q=80",
  },
];

export const MAIN_PRODUCT_CATEGORIES = SHOP_CATEGORIES.map((category) => category.name);

export const PRODUCT_PAGE_LIMIT = 3;

const CATEGORY_MAP = {
  Skincare: [
    "Cleanser",
    "Toner",
    "Serum",
    "Moisturizer",
    "Sunscreen",
    "Eye Cream",
    "Essence",
    "Exfoliator",
    "Face Mask",
    "Skincare",
    "Night Care",
    "Eye Care",
  ],
  Makeup: [
    "Makeup",
    "Foundation",
    "Lipstick",
    "Mascara",
    "Blush",
    "Eyeshadow",
    "Concealer",
    "Primer",
    "Setting Spray",
  ],
  Tools: ["Tools", "Makeup Tools", "Tools & Accessories"],
  "Body Care": ["Body Care", "Body Wash", "Body Lotion", "Body Scrub"],
};

export function getMainCategory(categoryName) {
  const normalizedCategory = categoryName?.toLowerCase();

  if (!normalizedCategory) {
    return null;
  }

  for (const mainCategory of MAIN_PRODUCT_CATEGORIES) {
    const aliases = CATEGORY_MAP[mainCategory] ?? [mainCategory];
    const matchesCategory = aliases.some((alias) => alias.toLowerCase() === normalizedCategory);

    if (matchesCategory) {
      return mainCategory;
    }
  }

  return null;
}
