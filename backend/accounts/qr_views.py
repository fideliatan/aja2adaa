"""
QR code API views.

Endpoints (all under /api/qr/):
  POST   generate/              → generate one unit QR after payment approval
  GET    order/<order_id>/      → list all QR units for an order
  GET    <qr_token>/            → fetch a single unit by QR token
  POST   verify/                → verify a scanned QR for return processing
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from . import qr_service


# ─── Generate ─────────────────────────────────────────────────────────────────

@api_view(["POST"])
def generate_unit_qr(request):
    """
    Generate a real QR code for one physical product unit.

    Called by the admin dashboard after payment approval, once per unit
    (e.g. 3 calls for an order with 1 × moisturizer + 2 × serum).

    Request body:
      {
        "order_id":      "ORD-011",
        "order_item_id": "ORD-011-ITEM01",
        "product_id":    "PROD-001",
        "product_name":  "Moisturizing Cream",
        "unit_index":    1,
        "generated_by":  "USR-001"
      }

    Response (201):
      {
        "id":           "uuid",
        "qr_token":     "UNIT-ORD011-MOIS-U1-X3K9M2P",
        "qr_image_url": "data:image/png;base64,…",
        "qr_status":    "active",
        "generated_at": "2025-05-07T10:00:00+00:00"
      }
    """
    order_id      = request.data.get("order_id",      "")
    order_item_id = request.data.get("order_item_id", "")
    product_id    = request.data.get("product_id",    "")
    product_name  = request.data.get("product_name",  product_id or "Product")
    unit_index    = request.data.get("unit_index",    1)
    generated_by  = request.data.get("generated_by",  "admin")

    if not order_id or not order_item_id:
        return Response(
            {"error": "order_id dan order_item_id wajib diisi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        unit = qr_service.create_product_unit(
            order_id=order_id,
            order_item_id=order_item_id,
            product_id=product_id,
            product_name=product_name,
            unit_index=int(unit_index),
            generated_by=generated_by,
        )
        return Response(unit, status=status.HTTP_201_CREATED)
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Fetch ────────────────────────────────────────────────────────────────────

@api_view(["GET"])
def get_order_qrs(request, order_id):
    """
    Return all product_unit QR records for a given order.

    Response:
      { "units": [ { …unit fields… }, … ] }
    """
    try:
        units = qr_service.get_product_units_for_order(order_id)
        return Response({"units": units})
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_qr_detail(request, qr_token):
    """
    Fetch a single product_unit by its QR token.

    Response (200):  { …unit fields… }
    Response (404):  { "error": "QR token tidak ditemukan." }
    """
    unit = qr_service.get_product_unit_by_token(qr_token)
    if unit is None:
        return Response(
            {"error": "QR token tidak ditemukan."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(unit)


# ─── Verify ───────────────────────────────────────────────────────────────────

@api_view(["POST"])
def verify_qr(request):
    """
    Verify a scanned QR token for a return request.

    Calls the verify_qr_for_return PostgreSQL function which:
      - logs every scan to qr_verifications
      - raises fraud_flags for suspicious patterns
      - returns a structured result

    Request body:
      {
        "qr_token":          "UNIT-ORD011-MOIS-U1-X3K9M2P",
        "scanned_by":        "USR-002",
        "claimed_order_id":  "ORD-011",       ← optional cross-check
        "claimed_product_id": "PROD-001"      ← optional cross-check
      }

    Response:
      {
        "is_valid":        true | false,
        "result_code":     "valid" | "not_found" | "already_returned"
                           | "invalid" | "duplicate",
        "message":         "…user-facing Indonesian message…",
        "unit_id":         "uuid or null",
        "order_id":        "ORD-011 or null",
        "product_id":      "PROD-001 or null",
        "verification_id": "uuid of the qr_verifications row",
        "fraud_flag_id":   "uuid if a flag was raised, else null"
      }
    """
    qr_token           = request.data.get("qr_token",           "")
    scanned_by         = request.data.get("scanned_by",         "")
    claimed_order_id   = request.data.get("claimed_order_id")   or None
    claimed_product_id = request.data.get("claimed_product_id") or None

    if not qr_token or not scanned_by:
        return Response(
            {"error": "qr_token dan scanned_by wajib diisi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = qr_service.verify_qr_token(
            token=qr_token,
            scanned_by=scanned_by,
            claimed_order_id=claimed_order_id,
            claimed_product_id=claimed_product_id,
        )
        return Response(result)
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─── Approve return ───────────────────────────────────────────────────────────

@api_view(["POST"])
def approve_qr(request):
    """
    Mark a product_unit as returned after admin confirms the physical return.

    Request body:
      {
        "unit_id":     "uuid of the product_unit",
        "approved_by": "USR-001"
      }

    Response (200):
      { "unit_id": "…", "qr_token": "…", "qr_status": "returned", "is_returned": true }
    """
    unit_id     = request.data.get("unit_id",     "")
    approved_by = request.data.get("approved_by", "")

    if not unit_id:
        return Response(
            {"error": "unit_id wajib diisi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = qr_service.approve_qr_return(unit_id=unit_id, approved_by=approved_by)
        return Response(result)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
