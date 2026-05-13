from django.core.management.base import BaseCommand
from accounts.models import Product

_u = lambda id, crop="center": (
    f"https://images.unsplash.com/photo-{id}"
    f"?auto=format&fit=crop&w=400&h=400&q=80&crop={crop}"
)

PRODUCTS = [
    # ── SKINCARE ──────────────────────────────────────────────────
    dict(product_id="PROD-001", brand="COSRX",      name="Low pH Good Morning Cleanser",         category="Skincare",   price=125000,  image=_u("1556228578-8c89e6adf883"), desc="Pembersih wajah dengan pH rendah yang lembut namun efektif, tidak merusak skin barrier. Favorit skincare enthusiast dunia.",               qr_code="PROD-001-SKN-QR-BW4JMQRP", bestseller=True),
    dict(product_id="PROD-002", brand="Skintific",  name="5% Niacinamide Barrier Serum",         category="Skincare",   price=149000,  image=_u("1620916566398-39f1143ab7be"), desc="Serum niacinamide 5% paling viral dari Skintific. Mencerahkan, mengecilkan pori, dan memperbaiki skin barrier.",                           qr_code="PROD-002-SKN-QR-GX2MVRLE", bestseller=True),
    dict(product_id="PROD-003", brand="Laneige",    name="Water Sleeping Mask",                  category="Skincare",   price=285000,  image=_u("1598440947619-2c35fc9aa908"), desc="Sleeping mask ikonik dari Laneige. Menghidrasi dan memperbaiki kulit saat tidur dengan teknologi Water Science.",                           qr_code="PROD-003-SKN-QR-LN5WSLMK", bestseller=True),
    # ── MAKEUP ────────────────────────────────────────────────────
    dict(product_id="PROD-004", brand="Rhode",       name="Peptide Lip Treatment",                category="Makeup",     price=395000,  image=_u("1512496522827-84765143aa95"), desc="Lip treatment peptide viral dari Rhode. Formula glassy yang melembapkan, plumping, dan memberikan efek glass lips.",                       qr_code="PROD-004-MKP-QR-RH4PLT",   bestseller=True),
    dict(product_id="PROD-005", brand="Rare Beauty",  name="Soft Pinch Liquid Blush",             category="Makeup",     price=440000,  image=_u("1596462502278-27bfdc228f4a"), desc="Liquid blush viral Selena Gomez's Rare Beauty. Formula ultra-lightweight yang blendable. Warna intens tahan lama.",                         qr_code="PROD-005-MKP-QR-RB15SPL",  bestseller=True),
    dict(product_id="PROD-006", brand="Maybelline",   name="Fit Me Luminous + Smooth Foundation", category="Makeup",     price=175000,  image=_u("1596462502278-27bfdc228f4a"), desc="Foundation drugstore favorit dengan formula yang merata sempurna dan memberikan finish natural luminous.",                                 qr_code="PROD-006-MKP-QR-MB8FMF",   bestseller=False),
    # ── TOOLS ─────────────────────────────────────────────────────
    dict(product_id="PROD-007", brand="FOREO",        name="LUNA Mini 3 Facial Device",           category="Tools",      price=1750000, image=_u("1571781926291-c477ebfd024b"), desc="Alat pembersih wajah sonic dari FOREO dengan T-Sonic pulsation yang membersihkan pori secara mendalam dan meningkatkan penyerapan skincare.", qr_code="PROD-007-TLS-QR-FR41LM3",  bestseller=True),
    dict(product_id="PROD-008", brand="Sigma Beauty",  name="F80 Kabuki Face Brush",              category="Tools",      price=380000,  image=_u("1522335789-8b3af9c8f853"), desc="Kabuki brush premium dari Sigma Beauty dengan SigmaFUSE technology untuk buffing foundation dengan flawless airbrushed finish.",         qr_code="PROD-008-TLS-QR-SG40KFB",  bestseller=False),
    dict(product_id="PROD-009", brand="Real Techniques", name="Miracle Complexion Sponge",       category="Tools",      price=135000,  image=_u("1522335789-8b3af9c8f853"), desc="Beauty blender dari Real Techniques untuk aplikasi foundation, concealer, dan blush yang flawless. Pakai kering atau lembap.",            qr_code="PROD-009-TLS-QR-RT39MCS",  bestseller=False),
    # ── BODY CARE ─────────────────────────────────────────────────
    dict(product_id="PROD-010", brand="CeraVe",       name="Moisturizing Cream Body",             category="Body Care",  price=285000,  image=_u("1570194065650-d99fb4bedf0a"), desc="Krim tubuh dermatologist-recommended dengan ceramide dan hyaluronic acid untuk hidrasi 24 jam. Cocok untuk kulit kering dan sensitif.", qr_code="PROD-010-BDY-QR-CV20MCB",   bestseller=True),
    dict(product_id="PROD-011", brand="Sol de Janeiro", name="Brazilian Bum Bum Body Butter",    category="Body Care",  price=620000,  image=_u("1512290923902-8a9f81dc236c"), desc="Body butter viral dengan guaraná dan cupuaçu butter dari Brazil. Aroma karamel manis yang khas, kulit menjadi super lembap dan glowing.", qr_code="PROD-011-BDY-QR-SJ19BBB",   bestseller=True),
    dict(product_id="PROD-012", brand="Scarlett Whitening", name="Body Lotion Freshy",           category="Body Care",  price=65000,   image=_u("1596755389378-c31d21fd1273"), desc="Body lotion whitening terlaris Indonesia dari Scarlett. Formula lightweight dengan niacinamide dan glutathione untuk kulit cerah merata.", qr_code="PROD-012-BDY-QR-SC24BLF",   bestseller=True),
]


class Command(BaseCommand):
    help = "Seed 12 products into the database"

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for p in PRODUCTS:
            _, is_new = Product.objects.update_or_create(
                product_id=p["product_id"],
                defaults=p,
            )
            if is_new:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. {created} created, {updated} updated. Total products: {Product.objects.count()}"
        ))
