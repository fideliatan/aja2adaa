import threading


def handle_order_saved(sender, instance, **kwargs):
    """Auto-generate e-receipt in background when order is confirmed by admin."""
    if instance.status not in ("packing", "shipped", "delivered"):
        return

    def _generate():
        try:
            from .models import EReceipt
            from .services import generate_receipt_pdf
            from accounts.models import Order

            if EReceipt.objects.filter(order_id=instance.order_id, is_revoked=False).exists():
                return

            order = Order.objects.prefetch_related("items").get(pk=instance.pk)
            pdf_b64, signature, generated_at = generate_receipt_pdf(order)

            EReceipt.objects.get_or_create(
                order_id=order.order_id,
                defaults=dict(
                    customer_name=order.recipient or order.customer,
                    customer_email=order.email,
                    total=order.total,
                    signature_hash=signature,
                    generated_at=generated_at,
                    pdf_b64=pdf_b64,
                ),
            )
        except Exception:
            pass

    threading.Thread(target=_generate, daemon=True).start()
