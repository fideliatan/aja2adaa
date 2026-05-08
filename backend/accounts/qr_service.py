"""
QR generation and verification service.

Responsibilities:
  - generate_qr_token       : build a human-readable unique token
  - generate_qr_png_base64  : render a real scannable PNG via qrcode + Pillow
  - create_product_unit     : insert one row into product_units, retry on collision
  - get_product_unit_by_token  : fetch a single unit by its QR token
  - get_product_units_for_order: fetch all units that belong to one order
  - verify_qr_token         : delegate to the verify_qr_for_return DB function
"""

import io
import base64
import secrets
import string

import qrcode
from qrcode.image.pure import PyPNGImage
from django.db import connection


# ─── Token generation ─────────────────────────────────────────────────────────

_CHARS = string.ascii_uppercase + string.digits  # 36-char alphabet


def generate_qr_token(order_id: str, product_name: str, unit_index: int) -> str:
    """
    Build a human-readable, globally-unique token.

    Format:  UNIT-{ORDER6}-{PROD4}-U{n}-{RAND7}
    Example: UNIT-ORD011-MOIS-U2-X3K9M2P

    Matches the format used in the frontend (genUnitQrToken) so tokens look
    consistent whether they were generated in the browser or on the server.
    """
    order_code = "".join(c for c in order_id  if c.isalnum()).upper()[-6:]
    prod_code  = "".join(c for c in product_name if c.isalnum()).upper()[:4]
    suffix     = "".join(secrets.choice(_CHARS) for _ in range(7))
    return f"UNIT-{order_code}-{prod_code}-U{unit_index}-{suffix}"


# ─── QR image generation ──────────────────────────────────────────────────────

def generate_qr_png_base64(token: str) -> str:
    """
    Render a real, scannable QR code from `token` and return it as a
    base64-encoded PNG data-URL  ("data:image/png;base64,…").

    The data-URL can be set directly as <img src=…> in the browser or
    stored verbatim in the product_units.qr_image_url column.
    """
    qr = qrcode.QRCode(
        version=None,                          # auto-size
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    b64 = base64.b64encode(buf.read()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


# ─── Database helpers ─────────────────────────────────────────────────────────

def _row_to_unit(row) -> dict:
    """Map a DB cursor row to a plain dict (column order from SELECT below)."""
    return {
        "id":                 str(row[0]),
        "order_id":           row[1],
        "order_item_id":      row[2],
        "product_id":         row[3],
        "qr_token":           row[4],
        "qr_image_url":       row[5],
        "qr_status":          row[6],
        "generated_at":       row[7].isoformat() if row[7] else None,
        "generated_by":       row[8],
        "is_returned":        row[9],
        "verification_count": row[10],
    }


_SELECT_COLS = """
    id, order_id, order_item_id, product_id, qr_token,
    qr_image_url, qr_status, generated_at, generated_by,
    is_returned, verification_count
"""


def create_product_unit(
    order_id: str,
    order_item_id: str,
    product_id: str,
    product_name: str,
    unit_index: int,
    generated_by: str,
) -> dict:
    """
    Generate a QR token + PNG image, then insert a product_units row.
    Retries up to 5 times on the (extremely unlikely) case of a token collision.
    Returns the created row as a dict.
    """
    for attempt in range(5):
        token   = generate_qr_token(order_id, product_name, unit_index)
        img_b64 = generate_qr_png_base64(token)

        try:
            with connection.cursor() as cur:
                cur.execute(
                    f"""
                    INSERT INTO product_units (
                        order_id, order_item_id, product_id,
                        qr_token, qr_image_url, qr_status,
                        generated_at, generated_by, is_returned, verification_count
                    )
                    VALUES (%s, %s, %s, %s, %s, 'active', NOW(), %s, false, 0)
                    RETURNING {_SELECT_COLS}
                    """,
                    [order_id, order_item_id, product_id, token, img_b64, generated_by],
                )
                return _row_to_unit(cur.fetchone())

        except Exception as exc:
            # On a unique-constraint violation, generate a new token and retry.
            if "unique" in str(exc).lower() and attempt < 4:
                continue
            raise

    raise RuntimeError("Could not generate a unique QR token after 5 attempts.")


def get_product_unit_by_token(token: str) -> dict | None:
    """Return a product_unit dict for the given QR token, or None if not found."""
    with connection.cursor() as cur:
        cur.execute(
            f"SELECT {_SELECT_COLS} FROM product_units WHERE qr_token = %s",
            [token],
        )
        row = cur.fetchone()
    return _row_to_unit(row) if row else None


def get_product_units_for_order(order_id: str) -> list[dict]:
    """Return all product_units for an order, ordered by item + creation time."""
    with connection.cursor() as cur:
        cur.execute(
            f"""
            SELECT {_SELECT_COLS}
            FROM   product_units
            WHERE  order_id = %s
            ORDER  BY order_item_id, generated_at
            """,
            [order_id],
        )
        rows = cur.fetchall()
    return [_row_to_unit(r) for r in rows]


def approve_qr_return(unit_id: str, approved_by: str) -> dict:
    """
    Mark a product_unit as returned (qr_status → 'returned', is_returned → true).
    Called when admin completes the return process after successful QR verification.
    """
    with connection.cursor() as cur:
        cur.execute(
            """
            UPDATE product_units
            SET    qr_status   = 'returned',
                   is_returned = true
            WHERE  id = %s::uuid
            RETURNING id, qr_token, qr_status, is_returned
            """,
            [unit_id],
        )
        row = cur.fetchone()
    if not row:
        raise ValueError(f"Unit {unit_id} not found.")
    return {
        "unit_id":     str(row[0]),
        "qr_token":    row[1],
        "qr_status":   row[2],
        "is_returned": row[3],
    }


def _log_verification(cur, unit_id, token: str, scanned_by: str, result: str, notes: str) -> str | None:
    """
    Insert a row into qr_verifications. Returns the new row's UUID string, or
    None if the insert fails (e.g. schema mismatch).  Caller should never raise
    on logging failure — it must not block a legitimate scan result.
    """
    try:
        cur.execute(
            """
            INSERT INTO qr_verifications
                (product_unit_id, raw_qr_token, scanned_by, verification_result, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            [unit_id, token, scanned_by, result, notes],
        )
        row = cur.fetchone()
        return str(row[0]) if row else None
    except Exception:
        # raw_qr_token column may not exist if migration 006 was not run;
        # fall back to inserting without it.
        try:
            cur.execute(
                """
                INSERT INTO qr_verifications
                    (product_unit_id, scanned_by, verification_result, notes)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                [unit_id, scanned_by, result, notes],
            )
            row = cur.fetchone()
            return str(row[0]) if row else None
        except Exception:
            return None


def verify_qr_token(
    token: str,
    scanned_by: str,
    claimed_order_id: str | None = None,
    claimed_product_id: str | None = None,
) -> dict:
    """
    Verify a scanned QR token directly in Python (no stored procedure dependency).

    Checks:
      1. Token exists in product_units
      2. qr_status is 'active' and unit not already returned
      3. Optional: order_id cross-check if claimed_order_id is supplied
    Logs every scan to qr_verifications regardless of outcome.
    """
    with connection.cursor() as cur:
        # ── Step 1: token lookup ────────────────────────────────────────────
        cur.execute(
            """
            SELECT id, order_id, product_id, qr_status, is_returned
            FROM   product_units
            WHERE  qr_token = %s
            """,
            [token],
        )
        row = cur.fetchone()

        if not row:
            _log_verification(cur, None, token, scanned_by, "not_found",
                              "Token tidak ditemukan dalam sistem")
            return {
                "is_valid":        False,
                "result_code":     "not_found",
                "message":         "QR code tidak ditemukan. Pastikan kode QR benar dan belum rusak.",
                "unit_id":         None,
                "order_id":        None,
                "product_id":      None,
                "verification_id": None,
                "fraud_flag_id":   None,
            }

        unit_id, order_id, product_id, qr_status, is_returned = row
        unit_id_str = str(unit_id)

        # ── Step 2: lifecycle status ────────────────────────────────────────
        if is_returned or qr_status == "returned":
            _log_verification(cur, unit_id, token, scanned_by, "already_returned",
                              "Unit sudah dikembalikan sebelumnya")
            return {
                "is_valid":        False,
                "result_code":     "already_returned",
                "message":         "Produk ini sudah pernah dikembalikan sebelumnya.",
                "unit_id":         unit_id_str,
                "order_id":        order_id,
                "product_id":      product_id,
                "verification_id": None,
                "fraud_flag_id":   None,
            }

        if qr_status != "active":
            _log_verification(cur, unit_id, token, scanned_by, "invalid",
                              f"qr_status bukan active: {qr_status}")
            return {
                "is_valid":        False,
                "result_code":     "invalid",
                "message":         "QR code ini tidak aktif dan tidak dapat digunakan.",
                "unit_id":         unit_id_str,
                "order_id":        order_id,
                "product_id":      product_id,
                "verification_id": None,
                "fraud_flag_id":   None,
            }

        # ── Step 3: optional order cross-check ─────────────────────────────
        if claimed_order_id and order_id != claimed_order_id:
            _log_verification(cur, unit_id, token, scanned_by, "invalid",
                              f"Order mismatch — QR: {order_id}, klaim: {claimed_order_id}")
            return {
                "is_valid":        False,
                "result_code":     "invalid",
                "message":         (
                    f"QR ini terdaftar untuk pesanan {order_id}, "
                    f"bukan {claimed_order_id}. Pastikan QR sesuai dengan produk yang di-return."
                ),
                "unit_id":         unit_id_str,
                "order_id":        order_id,
                "product_id":      product_id,
                "verification_id": None,
                "fraud_flag_id":   None,
            }

        # ── All clear ───────────────────────────────────────────────────────
        verification_id = _log_verification(
            cur, unit_id, token, scanned_by, "valid", "Verifikasi berhasil"
        )
        return {
            "is_valid":        True,
            "result_code":     "valid",
            "message":         "Verifikasi berhasil. Produk dapat diproses untuk pengembalian.",
            "unit_id":         unit_id_str,
            "order_id":        order_id,
            "product_id":      product_id,
            "verification_id": verification_id,
            "fraud_flag_id":   None,
        }
