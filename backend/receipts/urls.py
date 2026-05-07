from django.urls import path
from . import views

urlpatterns = [
    path("generate/",                views.generate_receipt, name="receipt-generate"),
    path("<str:order_id>/download/", views.download_receipt, name="receipt-download"),
    path("verify/",                  views.verify_receipt,   name="receipt-verify"),
    path("history/",                 views.verify_history,   name="receipt-history"),
]
