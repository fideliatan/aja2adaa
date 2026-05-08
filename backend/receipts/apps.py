from django.apps import AppConfig


class ReceiptsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "receipts"

    def ready(self):
        import threading
        from django.db.models.signals import post_save

        from accounts.models import Order
        from .signals import handle_order_saved
        post_save.connect(handle_order_saved, sender=Order)

        def _warmup():
            try:
                from weasyprint import HTML
                HTML(string="<html><body style='font-family:sans-serif'><p>warmup</p></body></html>").write_pdf()
            except Exception:
                pass
        threading.Thread(target=_warmup, daemon=True).start()
