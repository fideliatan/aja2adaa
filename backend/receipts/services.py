import base64
import hashlib
import io

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas as rl_canvas


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt_idr(n: int) -> str:
    """Format integer as Indonesian Rupiah: Rp 335.000"""
    return f"Rp {n:,}".replace(",", ".")


def _generate_signature(order_id: str, email: str, total: int, generated_at_iso: str) -> str:
    """SHA-256 from order data — this is the hidden steganography payload."""
    raw = f"{order_id}:{email}:{total}:{generated_at_iso}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# ── PDF Generation ─────────────────────────────────────────────────────────────

def generate_receipt_pdf(order):
    """
    Build a PDF receipt and embed SHA-256 signature inside /Keywords metadata.
    Signature is invisible to normal PDF viewers (steganography via metadata).

    Returns:
        tuple(pdf_b64: str, signature_hash: str, generated_at: datetime)
    """
    from django.utils import timezone
    generated_at = timezone.now()
    generated_at_iso = generated_at.isoformat()

    signature = _generate_signature(
        order.order_id,
        order.email,
        order.total,
        generated_at_iso,
    )

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    # ── PDF Metadata (steganography layer) ──────────────────────────────
    # The signature is hidden here — invisible to end users
    c.setTitle(f"E-Receipt careofyou — {order.order_id}")
    c.setAuthor("careofyou")
    c.setSubject("CAREOFYOU-VERIFIED")
    c.setKeywords(f"sig:{signature}:end")

    # ── Header ──────────────────────────────────────────────────────────
    c.setFillColorRGB(0.839, 0.525, 0.486)
    c.rect(0, height - 115, width, 115, fill=True, stroke=False)

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(width / 2, height - 48, "careofyou")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, height - 66, "STRUK PEMBELIAN RESMI")
    c.setFont("Helvetica-Bold", 10)
    c.roundRect(width / 2 - 55, height - 105, 110, 22, 10, fill=False, stroke=True)
    c.setStrokeColorRGB(1, 1, 1)
    c.setFillColorRGB(1, 1, 1)
    c.drawCentredString(width / 2, height - 97, order.order_id)

    # ── Success banner ───────────────────────────────────────────────────
    c.setFillColorRGB(0.94, 0.99, 0.96)
    c.rect(40, height - 148, width - 80, 24, fill=True, stroke=False)
    c.setFillColorRGB(0.08, 0.50, 0.24)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, height - 140, "Pembayaran Berhasil Dikonfirmasi")

    # ── Info grid: 2-column, 2-row ───────────────────────────────────────
    y_grid = height - 175
    info_pairs = [
        ("NO. PESANAN",  order.order_id),
        ("TANGGAL",      order.date or "—"),
        ("METODE BAYAR", order.payment or "—"),
        ("PENERIMA",     order.recipient or order.customer or "—"),
    ]
    col_w = (width - 100) / 2
    for idx, (label, val) in enumerate(info_pairs):
        col = 50 + (idx % 2) * (col_w + 10)
        row = 0 if idx < 2 else 1
        y_box = y_grid - row * 52

        c.setFillColorRGB(1, 0.98, 0.97)
        c.setStrokeColorRGB(0.94, 0.84, 0.82)
        c.roundRect(col, y_box - 36, col_w, 40, 6, fill=True, stroke=True)

        c.setFillColorRGB(0.69, 0.66, 0.65)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(col + 10, y_box - 14, label)

        c.setFillColorRGB(0.17, 0.17, 0.17)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(col + 10, y_box - 29, str(val)[:32])

    # ── Products ─────────────────────────────────────────────────────────
    y = y_grid - 115
    c.setFillColorRGB(0.17, 0.17, 0.17)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, y, "PRODUK DIPESAN")
    c.setStrokeColorRGB(0.94, 0.84, 0.82)
    c.setLineWidth(0.8)
    c.line(50, y - 4, width - 50, y - 4)
    y -= 18

    items = list(order.items.all())
    for item in items:
        c.setFillColorRGB(1, 0.98, 0.97)
        c.setStrokeColorRGB(0.94, 0.84, 0.82)
        c.roundRect(50, y - 30, width - 100, 36, 6, fill=True, stroke=True)

        c.setFillColorRGB(0.79, 0.45, 0.41)
        c.circle(66, y - 12, 3.5, fill=True, stroke=False)

        c.setFillColorRGB(0.17, 0.17, 0.17)
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(78, y - 9, item.name[:42])
        c.setFont("Helvetica", 9)
        c.setFillColorRGB(0.55, 0.55, 0.55)
        c.drawString(78, y - 22, f"{item.qty} pcs × {_fmt_idr(item.price)}")

        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColorRGB(0.79, 0.45, 0.41)
        c.drawRightString(width - 60, y - 14, _fmt_idr(item.price * item.qty))

        y -= 44

    # ── Summary ───────────────────────────────────────────────────────────
    y -= 8
    c.setStrokeColorRGB(0.94, 0.84, 0.82)
    c.setLineWidth(0.8)
    c.setDash(4, 4)
    c.line(50, y, width - 50, y)
    c.setDash()
    y -= 18

    c.setFont("Helvetica", 10.5)
    c.setFillColorRGB(0.47, 0.47, 0.47)
    c.drawString(50, y, "Subtotal")
    c.setFont("Helvetica-Bold", 10.5)
    c.setFillColorRGB(0.17, 0.17, 0.17)
    c.drawRightString(width - 50, y, _fmt_idr(order.subtotal))
    y -= 18

    c.setFont("Helvetica", 10.5)
    c.setFillColorRGB(0.47, 0.47, 0.47)
    c.drawString(50, y, "Ongkos Kirim")
    if order.delivery_fee == 0:
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColorRGB(0.13, 0.77, 0.37)
        c.drawRightString(width - 50, y, "Gratis")
    else:
        c.setFont("Helvetica-Bold", 10.5)
        c.setFillColorRGB(0.17, 0.17, 0.17)
        c.drawRightString(width - 50, y, _fmt_idr(order.delivery_fee))
    y -= 12

    # ── Total box ─────────────────────────────────────────────────────────
    c.setFillColorRGB(0.97, 0.92, 0.92)
    c.setStrokeColorRGB(0.94, 0.84, 0.82)
    c.rect(40, y - 38, width - 80, 44, fill=True, stroke=True)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColorRGB(0.17, 0.17, 0.17)
    c.drawString(55, y - 20, "Total Pembayaran")
    c.setFont("Helvetica-Bold", 19)
    c.setFillColorRGB(0.79, 0.45, 0.41)
    c.drawRightString(width - 55, y - 24, _fmt_idr(order.total))

    # ── Footer ────────────────────────────────────────────────────────────
    c.setFillColorRGB(0.99, 0.94, 0.94)
    c.rect(0, 0, width, 70, fill=True, stroke=False)
    c.setFillColorRGB(0.17, 0.17, 0.17)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(width / 2, 48, "Terima kasih sudah belanja di careofyou")
    c.setFont("Helvetica", 9)
    c.setFillColorRGB(0.55, 0.55, 0.55)
    c.drawCentredString(width / 2, 33, "Simpan struk ini sebagai bukti pembelian resmi kamu")
    c.setFont("Helvetica-Bold", 9)
    c.setFillColorRGB(0.79, 0.45, 0.41)
    c.drawCentredString(width / 2, 16, "careofyou.id")

    c.save()
    buf.seek(0)
    pdf_b64 = base64.b64encode(buf.read()).decode("utf-8")

    return pdf_b64, signature, generated_at


# ── PDF Verification ───────────────────────────────────────────────────────────

def verify_receipt_pdf(pdf_file) -> dict:
    """
    Extract the hidden SHA-256 signature from PDF /Keywords metadata
    and compare it against the database.
    """
    from pypdf import PdfReader
    from .models import EReceipt

    try:
        reader = PdfReader(pdf_file)
        metadata = reader.metadata or {}
        keywords = metadata.get("/Keywords", "") or ""
    except Exception:
        return _invalid("File tidak dapat dibaca atau bukan PDF yang valid")

    # Parse sig:HASH:end pattern from Keywords metadata
    sig_hash = None
    if "sig:" in keywords and ":end" in keywords:
        try:
            start = keywords.index("sig:") + 4
            end = keywords.index(":end", start)
            sig_hash = keywords[start:end].strip()
        except ValueError:
            pass

    if not sig_hash:
        return _invalid("Signature tidak ditemukan dalam file")

    try:
        receipt = EReceipt.objects.get(signature_hash=sig_hash, is_revoked=False)
    except EReceipt.DoesNotExist:
        return _invalid("Signature tidak cocok dengan database")

    return {
        "valid": True,
        "failure_reason": "",
        "order_id": receipt.order_id,
        "customer_name": receipt.customer_name,
        "customer_email": receipt.customer_email,
        "total": receipt.total,
        "generated_at": receipt.generated_at.isoformat(),
        "receipt_id": receipt.receipt_id,
    }


def _invalid(reason: str) -> dict:
    return {
        "valid": False,
        "failure_reason": reason,
        "order_id": "",
        "customer_name": "",
        "customer_email": "",
        "total": 0,
        "generated_at": None,
        "receipt_id": "",
    }
