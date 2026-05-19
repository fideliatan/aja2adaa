import base64
import hashlib
import io


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt_idr(n: int) -> str:
    return f"Rp {n:,}".replace(",", ".")


def _generate_signature(order_id: str, email: str, total: int, generated_at_iso: str) -> str:
    raw = f"{order_id}:{email}:{total}:{generated_at_iso}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _barcode_bars(order_id: str) -> str:
    seed = 0
    for c in order_id:
        seed = ((seed << 5) - seed + ord(c)) & 0xFFFFFFFF
    if seed >= 0x80000000:
        seed -= 0x100000000
    bars = ""
    for i in range(58):
        v = abs(seed ^ (i * 2654435761)) % 100
        h = 14 + (v % 30)
        w = 3 if v % 3 == 0 else (2 if v % 2 == 0 else 1)
        bars += f'<div class="rc-bar" style="width:{w}px;height:{h}px"></div>'
    return bars


def _build_receipt_html(order) -> str:
    subtotal      = order.subtotal
    delivery_fee  = order.delivery_fee if order.delivery_fee > 0 else max(0, order.total - order.subtotal)
    recipient     = order.recipient or order.customer or "—"
    order_ref     = order.order_id.replace("-", "") + " 0 1 7 5 8 3"
    barcode       = _barcode_bars(order.order_id)
    delivery_html = (
        '<span style="color:#22c55e;font-weight:700">Gratis ✓</span>'
        if delivery_fee == 0
        else f'<span style="font-weight:700;color:#2d2d2d">{_fmt_idr(delivery_fee)}</span>'
    )

    items_html = ""
    for item in order.items.all():
        items_html += f"""
        <div class="rc-item">
          <div class="rc-item-dot"></div>
          <div class="rc-item-left">
            <span class="rc-item-name">{item.name}</span>
            <span class="rc-item-qty">{item.qty} pcs × {_fmt_idr(item.price)}</span>
          </div>
          <span class="rc-item-total">{_fmt_idr(item.price * item.qty)}</span>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>E-Receipt careofyou — {order.order_id}</title>
  <style>
    @page {{ margin: 0; size: 520px auto; }}
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      background: white;
      padding: 32px 20px 48px;
    }}
    .receipt {{
      background: white;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      border-radius: 20px;
      overflow: hidden;
      border: 1.5px solid #f0d5d2;
    }}
    .rc-head {{
      background: linear-gradient(135deg, #d6867c 0%, #c97269 40%, #b05a52 100%);
      padding: 28px 24px 20px;
      text-align: center;
      color: white;
    }}
    .rc-logo-text {{
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-bottom: 6px;
    }}
    .rc-tagline {{
      font-size: 10px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      opacity: 0.85;
    }}
    .rc-head-id {{
      display: inline-block;
      margin-top: 10px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 50px;
      padding: 4px 14px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .rc-success {{
      background: linear-gradient(90deg, #f0fdf4, #ecfdf5);
      border-bottom: 1.5px dashed #86efac;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #15803d;
      font-size: 13.5px;
      font-weight: 700;
    }}
    .rc-success-dot {{
      width: 24px; height: 24px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: white;
      font-size: 13px;
      font-weight: 900;
      flex-shrink: 0;
    }}
    .rc-body {{ padding: 20px 20px 0; }}
    .rc-section-label {{
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: #c97269;
      margin-bottom: 10px;
    }}
    .rc-info-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 18px;
    }}
    .rc-info-box {{
      background: linear-gradient(135deg, #fffaf9, #fdf5f3);
      border-radius: 10px;
      padding: 11px 13px;
      border: 1.5px solid #f0d5d2;
    }}
    .rc-info-box-label {{ font-size: 10px; color: #b0a8a6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }}
    .rc-info-box-val {{ font-size: 12.5px; font-weight: 800; color: #2d2d2d; line-height: 1.3; }}
    .rc-items {{ margin-bottom: 14px; display: flex; flex-direction: column; gap: 7px; }}
    .rc-item {{
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      background: linear-gradient(135deg, #fffaf9, #fdf5f3);
      border-radius: 10px;
      border: 1.5px solid #f0d5d2;
    }}
    .rc-item-dot {{
      width: 8px; height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, #d6867c, #c97269);
      flex-shrink: 0;
    }}
    .rc-item-left {{ display: flex; flex-direction: column; gap: 2px; flex: 1; }}
    .rc-item-name {{ font-size: 13px; font-weight: 700; color: #2d2d2d; }}
    .rc-item-qty {{ font-size: 11px; color: #b0a8a6; font-weight: 500; }}
    .rc-item-total {{ font-size: 13.5px; font-weight: 900; color: #c97269; white-space: nowrap; }}
    .rc-summary {{
      border-top: 1.5px dashed #f0d5d2;
      padding: 12px 0;
      margin: 0 20px;
    }}
    .rc-summary-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #7a7a7a;
      margin-bottom: 6px;
    }}
    .rc-total-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, rgba(201,114,105,0.1) 0%, rgba(201,114,105,0.05) 100%);
      border-top: 2px solid #f0d5d2;
      margin-top: 4px;
    }}
    .rc-total-label {{ font-size: 14px; font-weight: 700; color: #2d2d2d; }}
    .rc-total-val {{ font-size: 24px; font-weight: 900; color: #c97269; letter-spacing: -0.5px; }}
    .rc-barcode-wrap {{
      padding: 18px 20px 14px;
      text-align: center;
      border-top: 1px solid #f5eeec;
      background: #fffcfb;
    }}
    .rc-barcode {{
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 1.5px;
      height: 44px;
      margin-bottom: 8px;
    }}
    .rc-bar {{ background: #2d2d2d; border-radius: 1px; }}
    .rc-order-ref {{
      font-size: 10.5px;
      color: #b0a8a6;
      font-weight: 600;
      letter-spacing: 2px;
    }}
    .rc-footer {{
      background: linear-gradient(135deg, #fdf0ef, #fff5f3);
      border-top: 1.5px solid #f0d5d2;
      padding: 16px 24px;
      text-align: center;
    }}
    .rc-footer-main {{ font-size: 13.5px; color: #2d2d2d; font-weight: 700; margin-bottom: 4px; }}
    .rc-footer-sub {{ font-size: 11px; color: #b0a8a6; font-weight: 500; }}
    .rc-footer-brand {{
      margin-top: 10px;
      font-size: 10px;
      color: #c97269;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.7;
    }}
  </style>
</head>
<body>
  <div class="receipt">
    <div class="rc-head">
      <div class="rc-logo-text">careofyou</div>
      <div class="rc-tagline">Struk Pembelian Resmi</div>
      <div class="rc-head-id">{order.order_id}</div>
    </div>
    <div class="rc-success">
      <div class="rc-success-dot">✓</div>
      Pembayaran Berhasil Dikonfirmasi
    </div>
    <div class="rc-body">
      <p class="rc-section-label">Info Transaksi</p>
      <div class="rc-info-grid">
        <div class="rc-info-box">
          <div class="rc-info-box-label">No. Pesanan</div>
          <div class="rc-info-box-val">{order.order_id}</div>
        </div>
        <div class="rc-info-box">
          <div class="rc-info-box-label">Tanggal</div>
          <div class="rc-info-box-val">{order.date or "—"}</div>
        </div>
        <div class="rc-info-box">
          <div class="rc-info-box-label">Metode Bayar</div>
          <div class="rc-info-box-val">{order.payment or "—"}</div>
        </div>
        <div class="rc-info-box">
          <div class="rc-info-box-label">Penerima</div>
          <div class="rc-info-box-val">{recipient}</div>
        </div>
      </div>
      <p class="rc-section-label">Produk Dipesan</p>
      <div class="rc-items">{items_html}</div>
    </div>
    <div class="rc-summary">
      <div class="rc-summary-row">
        <span>Subtotal</span>
        <span style="font-weight:700;color:#2d2d2d">{_fmt_idr(subtotal)}</span>
      </div>
      <div class="rc-summary-row">
        <span>Ongkos Kirim</span>
        {delivery_html}
      </div>

    </div>
    <div class="rc-total-row">
      <span class="rc-total-label">Total Pembayaran</span>
      <span class="rc-total-val">{_fmt_idr(order.total)}</span>
    </div>
    <div class="rc-barcode-wrap">
      <div class="rc-barcode">{barcode}</div>
      <div class="rc-order-ref">{order_ref}</div>
    </div>
    <div class="rc-footer">
      <div class="rc-footer-main">Terima kasih sudah belanja di careofyou</div>
      <div class="rc-footer-sub">Simpan struk ini sebagai bukti pembelian resmi kamu</div>
      <div class="rc-footer-brand">careofyou.id</div>
    </div>
  </div>
</body>
</html>"""


# ── PDF Generation ─────────────────────────────────────────────────────────────

def generate_receipt_pdf(order):
    """
    Build a PDF receipt matching the HTML preview design.
    SHA-256 signature embedded in /Keywords metadata (steganography).
    Returns: tuple(pdf_b64, signature_hash, generated_at)
    """
    from django.utils import timezone
    from weasyprint import HTML
    from pypdf import PdfWriter, PdfReader

    generated_at     = timezone.now()
    generated_at_iso = generated_at.isoformat()

    signature = _generate_signature(
        order.order_id,
        order.email,
        order.total,
        generated_at_iso,
    )

    # 1. Render HTML → PDF with WeasyPrint (exact visual match to the preview)
    html_content = _build_receipt_html(order)
    pdf_bytes    = HTML(string=html_content).write_pdf()

    # 2. Inject steganography signature into /Keywords PDF metadata
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    writer.append(reader)
    writer.add_metadata({
        "/Title":    f"E-Receipt careofyou — {order.order_id}",
        "/Author":   "careofyou",
        "/Subject":  "CAREOFYOU-VERIFIED",
        "/Keywords": f"sig:{signature}:end",
    })

    final_buf = io.BytesIO()
    writer.write(final_buf)
    final_buf.seek(0)

    pdf_b64 = base64.b64encode(final_buf.read()).decode("utf-8")
    return pdf_b64, signature, generated_at


# ── PDF Verification ───────────────────────────────────────────────────────────

def verify_receipt_pdf(pdf_file, expected_order_id=None) -> dict:
    """
    Extract the hidden SHA-256 signature from PDF /Keywords metadata
    and compare it against the database.
    If expected_order_id is given, also validates that the receipt belongs
    to that specific order (prevents cross-order e-receipt fraud).
    """
    from pypdf import PdfReader
    from .models import EReceipt

    try:
        reader   = PdfReader(pdf_file)
        metadata = reader.metadata or {}
        keywords = metadata.get("/Keywords", "") or ""
    except Exception:
        return _invalid("File tidak dapat dibaca atau bukan PDF yang valid")

    sig_hash = None
    if "sig:" in keywords and ":end" in keywords:
        try:
            start    = keywords.index("sig:") + 4
            end      = keywords.index(":end", start)
            sig_hash = keywords[start:end].strip()
        except ValueError:
            pass

    if not sig_hash:
        return _invalid("Signature tidak ditemukan dalam file")

    try:
        receipt = EReceipt.objects.get(signature_hash=sig_hash, is_revoked=False)
    except EReceipt.DoesNotExist:
        return _invalid("Signature tidak cocok dengan database")

    if expected_order_id and receipt.order_id != expected_order_id:
        return {
            "valid":          False,
            "failure_reason": (
                f"E-receipt bukan milik pesanan ini "
                f"(PDF: {receipt.order_id}, Retur: {expected_order_id})"
            ),
            "order_id":       expected_order_id,
            "pdf_order_id":   receipt.order_id,
            "customer_name":  receipt.customer_name,
            "customer_email": receipt.customer_email,
            "total":          receipt.total,
            "generated_at":   receipt.generated_at.isoformat(),
            "receipt_id":     receipt.receipt_id,
        }

    return {
        "valid":          True,
        "failure_reason": "",
        "order_id":       receipt.order_id,
        "customer_name":  receipt.customer_name,
        "customer_email": receipt.customer_email,
        "total":          receipt.total,
        "generated_at":   receipt.generated_at.isoformat(),
        "receipt_id":     receipt.receipt_id,
    }


def _invalid(reason: str) -> dict:
    return {
        "valid":          False,
        "failure_reason": reason,
        "order_id":       "",
        "customer_name":  "",
        "customer_email": "",
        "total":          0,
        "generated_at":   None,
        "receipt_id":     "",
    }
