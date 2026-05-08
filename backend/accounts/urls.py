from django.urls import path
from . import views
from . import qr_views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("me/", views.me),
]

store_urlpatterns = [
    path("init/", views.store_init, name="store_init"),
    path("sync/", views.store_sync, name="store_sync"),
]

qr_urlpatterns = [
    # POST  /api/qr/generate/           → generate one unit QR
    path("generate/",               qr_views.generate_unit_qr, name="qr_generate"),
    # GET   /api/qr/order/<order_id>/   → list all QRs for an order
    path("order/<str:order_id>/",   qr_views.get_order_qrs,    name="qr_order"),
    # POST  /api/qr/verify/             → verify a scanned QR
    path("verify/",                 qr_views.verify_qr,        name="qr_verify"),
    # POST  /api/qr/approve/            → mark unit as returned after admin confirms
    path("approve/",                qr_views.approve_qr,       name="qr_approve"),
    # GET   /api/qr/<qr_token>/         → fetch single unit by token (catch-all — must be last)
    path("<str:qr_token>/",         qr_views.get_qr_detail,    name="qr_detail"),
]
