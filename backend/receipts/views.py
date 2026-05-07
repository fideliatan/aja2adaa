import base64

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import Order
from .models import EReceipt, ReceiptVerification
from .services import generate_receipt_pdf, verify_receipt_pdf


# ── Endpoint 1: Generate receipt ───────────────────────────────────────────────

@api_view(["POST"])
def generate_receipt(request):
    """
    Generate and store an e-receipt PDF for an order.
    Idempotent — returns the existing receipt if one already exists.
    """
    order_id = request.data.get("order_id", "").strip()
    if not order_id:
        return Response({"error": "order_id diperlukan"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.prefetch_related("items").get(order_id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    existing = EReceipt.objects.filter(order_id=order_id, is_revoked=False).first()
    if existing:
        return Response({
            "receipt_id":    existing.receipt_id,
            "order_id":      existing.order_id,
            "generated_at":  existing.generated_at.isoformat(),
            "already_exists": True,
        })

    pdf_b64, signature, generated_at = generate_receipt_pdf(order)

    receipt = EReceipt.objects.create(
        order_id=order.order_id,
        customer_name=order.customer,
        customer_email=order.email,
        total=order.total,
        signature_hash=signature,
        generated_at=generated_at,
        pdf_b64=pdf_b64,
    )

    return Response({
        "receipt_id":    receipt.receipt_id,
        "order_id":      receipt.order_id,
        "generated_at":  receipt.generated_at.isoformat(),
        "already_exists": False,
    }, status=status.HTTP_201_CREATED)


# ── Endpoint 2: Download receipt PDF ──────────────────────────────────────────

@api_view(["GET"])
def download_receipt(request, order_id):
    """
    Return the PDF file for download.
    Auto-generates the receipt if it doesn't exist yet (lazy generation).
    """
    receipt = EReceipt.objects.filter(order_id=order_id, is_revoked=False).first()

    if not receipt:
        try:
            order = Order.objects.prefetch_related("items").get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

        if order.status not in ("packing", "shipped", "delivered"):
            return Response(
                {"error": "E-receipt belum tersedia. Tunggu hingga pesanan dikonfirmasi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        pdf_b64, signature, generated_at = generate_receipt_pdf(order)
        receipt = EReceipt.objects.create(
            order_id=order.order_id,
            customer_name=order.customer,
            customer_email=order.email,
            total=order.total,
            signature_hash=signature,
            generated_at=generated_at,
            pdf_b64=pdf_b64,
        )

    pdf_bytes = base64.b64decode(receipt.pdf_b64)
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="e-receipt-{order_id}.pdf"'
    response["Access-Control-Expose-Headers"] = "Content-Disposition"
    return response


# ── Endpoint 3: Verify receipt ─────────────────────────────────────────────────

@api_view(["POST"])
def verify_receipt(request):
    """
    Verify the authenticity of an uploaded PDF receipt.
    Extracts the hidden SHA-256 signature and compares it to the database.
    Stores a record in ReceiptVerification for audit trail.
    """
    pdf_file = request.FILES.get("pdf_file")
    if not pdf_file:
        return Response({"error": "File PDF diperlukan"}, status=status.HTTP_400_BAD_REQUEST)

    result = verify_receipt_pdf(pdf_file)

    ReceiptVerification.objects.create(
        order_id=result.get("order_id", ""),
        customer_name=result.get("customer_name", ""),
        customer_email=result.get("customer_email", ""),
        result="valid" if result["valid"] else "invalid",
        verified_by=request.data.get("verified_by", "admin"),
        file_name=pdf_file.name,
        failure_reason=result.get("failure_reason", ""),
        verified_at=timezone.now(),
    )

    return Response(result)


# ── Endpoint 4: Verification history ──────────────────────────────────────────

@api_view(["GET"])
def verify_history(request):
    """Return all past verification records, newest first."""
    records = ReceiptVerification.objects.order_by("-verified_at")
    data = [
        {
            "id":            r.verification_id,
            "orderId":       r.order_id,
            "customer":      r.customer_name,
            "email":         r.customer_email,
            "result":        r.result,
            "verifiedBy":    r.verified_by,
            "file":          r.file_name,
            "failureReason": r.failure_reason,
            "date":          r.verified_at.strftime("%d %b %Y %H:%M"),
        }
        for r in records
    ]
    return Response({"history": data})
