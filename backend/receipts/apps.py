from django.apps import AppConfig


class ReceiptsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "receipts"

    def ready(self):
        import threading
        def _warmup():
            try:
                from weasyprint import HTML
                HTML(string="<html><body></body></html>").write_pdf()
            except Exception:
                pass
        threading.Thread(target=_warmup, daemon=True).start()
