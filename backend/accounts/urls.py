from django.urls import path
from . import views
from . import qr_views
from . import mutation_views

urlpatterns = [
    path("register/", views.register),
    path("login/", views.login),
    path("me/", views.me),
    path("otp/request/", views.otp_request),
    path("otp/verify/", views.otp_verify),
    path("profile/", views.update_profile),
    path("logout/", mutation_views.logout),
]

store_urlpatterns = [
    path("init/", views.store_init, name="store_init"),
    path("sync/", views.store_sync, name="store_sync"),
    path("revenue/", views.revenue_stats, name="revenue_stats"),
    # Orders
    path("orders/", mutation_views.create_order, name="order_create"),
    path("orders/<str:order_id>/approve/", mutation_views.approve_order, name="order_approve"),
    path("orders/<str:order_id>/reject/", mutation_views.reject_order, name="order_reject"),
    path("orders/<str:order_id>/ship/", mutation_views.ship_order, name="order_ship"),
    path("orders/<str:order_id>/deliver/", mutation_views.deliver_order, name="order_deliver"),
    path("orders/<str:order_id>/cancel/", mutation_views.cancel_order, name="order_cancel"),
    # Returns
    path("returns/", mutation_views.create_return, name="return_create"),
    path("returns/<str:return_id>/", mutation_views.update_return, name="return_update"),
    # Flags
    path("flags/", mutation_views.create_flag, name="flag_create"),
    path("flags/<str:flag_id>/resolve/", mutation_views.resolve_flag, name="flag_resolve"),
    path("flags/<str:flag_id>/review/", mutation_views.review_flag, name="flag_review"),
    # Reviews
    path("reviews/", views.submit_review, name="review_submit"),
    # Timeline & devices
    path("timeline/", mutation_views.add_timeline_event, name="timeline_add"),
    path("devices/trust/", mutation_views.trust_device, name="device_trust"),
    # Addresses
    path("addresses/", mutation_views.address_list, name="address_list"),
    path("addresses/<str:address_id>/", mutation_views.address_detail, name="address_detail"),
    path("addresses/<str:address_id>/set-primary/", mutation_views.address_set_primary, name="address_set_primary"),
    # Products
    path("products/", mutation_views.create_product, name="product_create"),
    path("products/<str:product_id>/", mutation_views.update_product, name="product_update"),
    path("products/<str:product_id>/delete/", mutation_views.delete_product, name="product_delete"),
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
