"""
Management command: seed_store
Populates the database with the initial seed data from seeds.js.
Run once after first migration: python manage.py seed_store
Use --reset to wipe and re-seed.
"""

from datetime import datetime, timezone as tz
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import (
    User,
    Order, OrderItem, OrderStatusHistory,
    ReturnRequest, ReturnProduct, ReturnStatusHistory,
    LoginAttempt, TrustedDevice,
    MonitoringFlag, ActivityTimeline,
)


def _dt(iso_str):
    if not iso_str:
        return timezone.now()
    try:
        return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    except Exception:
        return timezone.now()


class Command(BaseCommand):
    help = "Seed the database with initial store data"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Wipe existing data before seeding")

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Wiping existing store data...")
            ActivityTimeline.objects.all().delete()
            MonitoringFlag.objects.all().delete()
            TrustedDevice.objects.all().delete()
            LoginAttempt.objects.all().delete()
            ReturnRequest.objects.all().delete()
            Order.objects.all().delete()
            User.objects.all().delete()
            self.stdout.write(self.style.WARNING("All store data deleted."))

        self._seed_users()
        self._seed_orders()
        self._seed_returns()
        self._seed_login_attempts()
        self._seed_trusted_devices()
        self._seed_monitoring_flags()
        self._seed_activity_timeline()

        self.stdout.write(self.style.SUCCESS("Seed complete."))

    # ── Users ────────────────────────────────────────────────────

    def _seed_users(self):
        seed_users = [
            {
                "user_code": "USR-001", "email": "admin@gmail.com",  "password": "admin123",
                "role": "admin",    "name": "Admin CareOfYou", "phone": "0812-0000-0001",
                "two_factor_enabled": True,  "failed_login_count": 0,
                "created_at": "2024-01-01T00:00:00+00:00",
            },
            {
                "user_code": "USR-002", "email": "sara@example.com", "password": "sara123",
                "role": "customer", "name": "Sara Tancredi",   "phone": "0812-3456-7890",
                "two_factor_enabled": False, "failed_login_count": 0,
                "created_at": "2024-03-15T10:00:00+00:00",
            },
            {
                "user_code": "USR-003", "email": "rina@example.com", "password": "rina123",
                "role": "customer", "name": "Rina Kusuma",     "phone": "0821-0000-0001",
                "two_factor_enabled": False, "failed_login_count": 0,
                "created_at": "2024-04-01T08:30:00+00:00",
            },
            {
                "user_code": "USR-004", "email": "dewi@example.com", "password": "dewi123",
                "role": "customer", "name": "Dewi Larasati",   "phone": "0822-0000-0002",
                "two_factor_enabled": False, "failed_login_count": 0,
                "created_at": "2024-04-10T14:00:00+00:00",
            },
            {
                "user_code": "USR-005", "email": "budi@example.com", "password": "budi123",
                "role": "customer", "name": "Budi Santoso",    "phone": "0813-5555-1234",
                "two_factor_enabled": False, "failed_login_count": 3,
                "created_at": "2024-05-20T09:00:00+00:00",
            },
        ]
        for u in seed_users:
            user, created = User.objects.get_or_create(
                email=u["email"],
                defaults={
                    "name": u["name"],
                    "phone": u["phone"],
                    "role": u["role"],
                    "status": "active",
                    "two_factor_enabled": u["two_factor_enabled"],
                    "failed_login_count": u["failed_login_count"],
                    "user_code": u["user_code"],
                    "is_staff": u["role"] == "admin",
                    "is_superuser": u["role"] == "admin",
                },
            )
            if created:
                user.set_password(u["password"])
                user.save()
                # Force user_code since auto-generation runs after save
                User.objects.filter(pk=user.pk).update(user_code=u["user_code"])
                self.stdout.write(f"  Created user {u['email']}")
            else:
                User.objects.filter(pk=user.pk).update(
                    user_code=u["user_code"],
                    failed_login_count=u["failed_login_count"],
                )
                self.stdout.write(f"  Updated user {u['email']}")

    # ── Orders ───────────────────────────────────────────────────

    def _seed_orders(self):
        now = timezone.now()
        orders = [
            {
                "id": "ORD-011",
                "status": "pending",
                "customer": "Sara Tancredi",
                "customerId": "USR-002",
                "date": "15 Apr 2025",
                "items": [
                    {"name": "Vitamin C Serum",    "qty": 1, "price": 149000, "image": "https://placehold.co/72x72/fff3e0/c4706a?text=VitC"},
                    {"name": "Sunscreen Aqua Gel", "qty": 1, "price": 145000, "image": "https://placehold.co/72x72/fce8e6/c4706a?text=SPF"},
                ],
                "subtotal": 294000, "deliveryFee": 0, "total": 294000,
                "payment": "BCA Transfer", "paymentAccount": "1234-5678-90",
                "recipient": "Sara Tancredi", "phone": "(+98) 9123728167",
                "address": "Jl. Sudirman No. 12, Jakarta",
                "paymentProof": "bukti_tf.jpg",
                "createdAt": "2025-04-15T09:00:00+00:00",
                "statusHistory": [{"id": "HIST-ORD011-001", "status": "pending", "actorId": "USR-002", "actorRole": "customer", "note": "Order placed and waiting for approval.", "createdAt": "2025-04-15T09:00:00+00:00"}],
            },
            {
                "id": "ORD-014",
                "status": "packing",
                "customer": "Rina Kusuma",
                "customerId": "USR-003",
                "date": "15 Apr 2025",
                "items": [
                    {"name": "Retinol Night Cream", "qty": 1, "price": 210000, "image": "https://placehold.co/72x72/fdeaea/c4706a?text=RC"},
                ],
                "subtotal": 210000, "deliveryFee": 0, "total": 210000,
                "payment": "OVO", "paymentAccount": "0812-3456-7890",
                "recipient": "Rina Kusuma", "phone": "0821-0000-0001",
                "address": "Jl. Malioboro No. 88, Yogyakarta",
                "paymentProof": "bukti_ovo.jpg",
                "createdAt": "2025-04-15T10:00:00+00:00",
                "statusHistory": [
                    {"id": "HIST-ORD014-001", "status": "pending", "actorId": "USR-003", "actorRole": "customer", "note": "Order placed.", "createdAt": "2025-04-15T10:00:00+00:00"},
                    {"id": "HIST-ORD014-002", "status": "packing", "actorId": "USR-001", "actorRole": "admin",    "note": "Payment approved by admin.", "createdAt": "2025-04-17T08:00:00+00:00"},
                ],
            },
            {
                "id": "ORD-017",
                "status": "shipped",
                "customer": "Dewi Larasati",
                "customerId": "USR-004",
                "date": "14 Apr 2025",
                "items": [
                    {"name": "Hyaluronic Acid Serum",  "qty": 1, "price": 189000, "image": "https://placehold.co/72x72/fce8e6/c4706a?text=HA"},
                    {"name": "Ceramide Barrier Cream", "qty": 1, "price": 146000, "image": "https://placehold.co/72x72/fdeaea/c4706a?text=CB"},
                ],
                "subtotal": 335000, "deliveryFee": 0, "total": 335000,
                "payment": "BNI Transfer", "paymentAccount": "0987-6543-21",
                "recipient": "Dewi Larasati", "phone": "0822-0000-0002",
                "address": "Jl. Diponegoro No. 7, Medan",
                "paymentProof": "bukti_bni.jpg",
                "trackingNumber": "JNE20250414001", "courier": "JNE Regular",
                "createdAt": "2025-04-14T08:00:00+00:00",
                "statusHistory": [
                    {"id": "HIST-ORD017-001", "status": "pending", "actorId": "USR-004", "actorRole": "customer", "note": "Order placed.", "createdAt": "2025-04-14T08:00:00+00:00"},
                    {"id": "HIST-ORD017-002", "status": "packing", "actorId": "USR-001", "actorRole": "admin",    "note": "Payment approved.", "createdAt": "2025-04-15T09:00:00+00:00"},
                    {"id": "HIST-ORD017-003", "status": "shipped", "actorId": "USR-001", "actorRole": "admin",    "note": "Order marked as shipped.", "createdAt": "2025-04-16T10:00:00+00:00"},
                ],
            },
            {
                "id": "ORD-007",
                "status": "delivered",
                "customer": "Sara Tancredi",
                "customerId": "USR-002",
                "date": "5 Apr 2025",
                "items": [
                    {"name": "Sunscreen Aqua Gel SPF 50",        "qty": 2, "price": 99000,  "image": "https://placehold.co/72x72/fce8e6/c4706a?text=SPF"},
                    {"name": "5X Ceramide Barrier Moisture Gel", "qty": 1, "price": 149000, "image": "https://placehold.co/72x72/fdeaea/c4706a?text=Gel"},
                ],
                "subtotal": 347000, "deliveryFee": 15000, "total": 362000,
                "payment": "BCA Transfer", "paymentAccount": "1234-5678-90",
                "recipient": "Sara Tancredi", "phone": "(+98) 9123728167",
                "address": "123 Main Street, New York, NY 10001, USA",
                "paymentProof": "bukti_bca.jpg",
                "trackingNumber": "JNE20250405001", "courier": "JNE Regular",
                "createdAt": "2025-04-05T08:00:00+00:00",
                "statusHistory": [
                    {"id": "HIST-ORD007-001", "status": "pending",   "actorId": "USR-002", "actorRole": "customer", "note": "Order placed.", "createdAt": "2025-04-05T08:00:00+00:00"},
                    {"id": "HIST-ORD007-002", "status": "packing",   "actorId": "USR-001", "actorRole": "admin",    "note": "Payment approved.", "createdAt": "2025-04-06T09:00:00+00:00"},
                    {"id": "HIST-ORD007-003", "status": "shipped",   "actorId": "USR-001", "actorRole": "admin",    "note": "Shipped.", "createdAt": "2025-04-07T10:00:00+00:00"},
                    {"id": "HIST-ORD007-004", "status": "delivered", "actorId": "USR-001", "actorRole": "admin",    "note": "Delivered.", "createdAt": "2025-04-09T14:00:00+00:00"},
                ],
            },
        ]

        for o in orders:
            order, created = Order.objects.get_or_create(
                order_id=o["id"],
                defaults={
                    "status": o["status"],
                    "customer": o["customer"],
                    "customer_id": o.get("customerId", ""),
                    "email": o.get("email", ""),
                    "date": o.get("date", ""),
                    "subtotal": o.get("subtotal", 0),
                    "delivery_fee": o.get("deliveryFee", 0),
                    "total": o.get("total", 0),
                    "payment": o.get("payment", ""),
                    "payment_account": o.get("paymentAccount", ""),
                    "recipient": o.get("recipient", ""),
                    "phone": o.get("phone", ""),
                    "address": o.get("address", ""),
                    "payment_proof": o.get("paymentProof"),
                    "tracking_number": o.get("trackingNumber"),
                    "courier": o.get("courier"),
                    "session_snapshot": {},
                    "created_at": _dt(o.get("createdAt")),
                    "updated_at": _dt(o.get("createdAt")),
                },
            )
            if created:
                for item in o.get("items", []):
                    OrderItem.objects.create(order=order, **{k: v for k, v in item.items()})
                for h in o.get("statusHistory", []):
                    OrderStatusHistory.objects.create(
                        order=order,
                        history_id=h["id"],
                        status=h["status"],
                        actor_id=h.get("actorId"),
                        actor_role=h.get("actorRole"),
                        note=h.get("note", ""),
                        created_at=_dt(h.get("createdAt")),
                    )
                self.stdout.write(f"  Created order {o['id']}")
            else:
                self.stdout.write(f"  Skipped order {o['id']} (exists)")

    # ── Returns ──────────────────────────────────────────────────

    def _seed_returns(self):
        returns = [
            {
                "id": "RET-001", "orderId": "ORD-007", "customerId": "USR-002",
                "customer": "Sara Tancredi", "email": "sara@example.com",
                "date": "9 Apr 2025", "createdAt": "2025-04-09T10:20:00+00:00",
                "reason": "Produk rusak / cacat", "status": "pending",
                "conditionNote": "Kemasan penyok dan seal produk terlihat bocor saat paket dibuka.",
                "photos": ["https://placehold.co/320x240/fdeaea/c4706a?text=Return+Photo"],
                "products": [{"name": "5X Ceramide Barrier Moisture Gel", "qty": 1, "price": 149000, "image": "https://placehold.co/72x72/fdeaea/c4706a?text=Gel"}],
                "qrCode": "PROD-UNIT-20250405-001", "scannedQr": "PROD-UNIT-20250405-001",
                "total": 149000,
                "statusHistory": [{"id": "RET-HIST-001", "status": "pending", "actorId": "USR-002", "actorRole": "customer", "note": "Return request submitted by customer.", "createdAt": "2025-04-09T10:20:00+00:00"}],
            },
            {
                "id": "RET-002", "orderId": "ORD-017", "customerId": "USR-004",
                "customer": "Dewi Larasati", "email": "dewi@example.com",
                "date": "18 Apr 2025", "createdAt": "2025-04-18T08:45:00+00:00",
                "reason": "Barang salah dikirim", "status": "item_received",
                "monitoringFlag": "Return abuse risk",
                "conditionNote": "Produk yang datang tidak sesuai dengan item yang tercantum pada order.",
                "photos": ["https://placehold.co/320x240/fce8e6/c4706a?text=Return+Evidence"],
                "products": [{"name": "Ceramide Barrier Cream", "qty": 1, "price": 146000, "image": "https://placehold.co/72x72/fdeaea/c4706a?text=CB"}],
                "qrCode": "PROD-UNIT-20250414-017", "scannedQr": "PROD-UNIT-20250414-999", "qrStatus": "invalid",
                "total": 146000,
                "statusHistory": [
                    {"id": "RET-HIST-002", "status": "pending",       "actorId": "USR-004", "actorRole": "customer", "note": "Return request submitted by customer.", "createdAt": "2025-04-18T08:45:00+00:00"},
                    {"id": "RET-HIST-003", "status": "approved",      "actorId": "USR-001", "actorRole": "admin",    "note": "Return approved by admin.", "createdAt": "2025-04-18T10:00:00+00:00"},
                    {"id": "RET-HIST-003B", "status": "item_received","actorId": "USR-001", "actorRole": "admin",    "note": "Item received and scanned by admin.", "createdAt": "2025-04-18T15:30:00+00:00"},
                ],
            },
            {
                "id": "RET-003", "orderId": "ORD-021", "customerId": "USR-003",
                "customer": "Budi Santoso", "email": "budi@example.com",
                "date": "22 Apr 2025", "createdAt": "2025-04-22T09:10:00+00:00",
                "reason": "Produk tidak sesuai deskripsi", "status": "pending",
                "conditionNote": "Warna produk dan tekstur tidak sesuai dengan yang ditampilkan di halaman produk.",
                "photos": ["https://placehold.co/320x240/e8f0fe/4a9fd4?text=Return+Photo"],
                "products": [{"name": "Niacinamide 10% + Zinc 1% Serum", "qty": 1, "price": 189000, "image": "https://placehold.co/72x72/e8f0fe/4a9fd4?text=NZ"}],
                "qrCode": "PROD-NEW-SKN-QR-NZ10001",
                "total": 189000,
                "statusHistory": [{"id": "RET-HIST-004", "status": "pending", "actorId": "USR-003", "actorRole": "customer", "note": "Return request submitted by customer.", "createdAt": "2025-04-22T09:10:00+00:00"}],
            },
            {
                "id": "RET-004", "orderId": "ORD-025", "customerId": "USR-005",
                "customer": "Rina Marlina", "email": "rina@example.com",
                "date": "24 Apr 2025", "createdAt": "2025-04-24T14:30:00+00:00",
                "reason": "Produk rusak / cacat", "status": "pending",
                "monitoringFlag": "QR mismatch detected",
                "conditionNote": "Kemasan produk tampak sudah dibuka sebelumnya dan label QR terlihat diganti.",
                "photos": ["https://placehold.co/320x240/fff3e0/e09a3a?text=Return+Evidence"],
                "products": [{"name": "Retinol 0.5% in Squalane", "qty": 1, "price": 215000, "image": "https://placehold.co/72x72/fff3e0/e09a3a?text=RT"}],
                "total": 215000,
                "statusHistory": [
                    {"id": "RET-HIST-005", "status": "pending", "actorId": "USR-005", "actorRole": "customer", "note": "Return request submitted by customer.", "createdAt": "2025-04-24T14:30:00+00:00"},
                ],
            },
            {
                "id": "RET-005", "orderId": "ORD-029", "customerId": "USR-002",
                "customer": "Sara Tancredi", "email": "sara@example.com",
                "date": "26 Apr 2025", "createdAt": "2025-04-26T11:00:00+00:00",
                "reason": "Produk rusak saat diterima", "status": "pending",
                "conditionNote": "Botol pecah di dalam kemasan saat paket diterima. Foto terlampir.",
                "photos": ["https://placehold.co/320x240/e8fef0/22c55e?text=Return+Photo"],
                "products": [{"name": "Hyaluronic Acid 2% + B5 Serum", "qty": 2, "price": 165000, "image": "https://placehold.co/72x72/e8fef0/22c55e?text=HA"}],
                "qrCode": "PROD-NEW-SKN-QR-HA20003", "scannedQr": "PROD-NEW-SKN-QR-HA20003", "qrStatus": "valid",
                "total": 330000,
                "statusHistory": [{"id": "RET-HIST-007", "status": "pending", "actorId": "USR-002", "actorRole": "customer", "note": "Return request submitted by customer.", "createdAt": "2025-04-26T11:00:00+00:00"}],
            },
        ]

        for r in returns:
            ret, created = ReturnRequest.objects.get_or_create(
                return_id=r["id"],
                defaults={
                    "order_id": r.get("orderId", ""),
                    "customer_id": r.get("customerId", ""),
                    "customer": r["customer"],
                    "email": r.get("email", ""),
                    "date": r.get("date", ""),
                    "reason": r.get("reason", ""),
                    "status": r["status"],
                    "monitoring_flag": r.get("monitoringFlag"),
                    "condition_note": r.get("conditionNote", ""),
                    "photos": r.get("photos", []),
                    "qr_code": r.get("qrCode", ""),
                    "scanned_qr": r.get("scannedQr"),
                    "qr_status": r.get("qrStatus"),
                    "total": r.get("total", 0),
                    "session_snapshot": {},
                    "created_at": _dt(r.get("createdAt")),
                    "updated_at": _dt(r.get("createdAt")),
                },
            )
            if created:
                for p in r.get("products", []):
                    ReturnProduct.objects.create(return_request=ret, **{k: v for k, v in p.items()})
                for h in r.get("statusHistory", []):
                    ReturnStatusHistory.objects.create(
                        return_request=ret,
                        history_id=h["id"],
                        status=h["status"],
                        actor_id=h.get("actorId"),
                        actor_role=h.get("actorRole"),
                        note=h.get("note", ""),
                        created_at=_dt(h.get("createdAt")),
                    )
                self.stdout.write(f"  Created return {r['id']}")
            else:
                self.stdout.write(f"  Skipped return {r['id']} (exists)")

    # ── Login attempts ───────────────────────────────────────────

    def _seed_login_attempts(self):
        import time
        now_ms = int(time.time() * 1000)

        def ms_ago(ms):
            return datetime.fromtimestamp((now_ms - ms) / 1000, tz=tz.utc).isoformat()

        attempts = [
            {"id": "ATT-001", "userId": "USR-001", "email": "admin@gmail.com",  "role": "admin",    "success": True,  "timestamp": ms_ago(2*86400000), "ipAddress": "192.168.1.101",  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/134", "deviceFingerprint": "fp_admin_trusted_001"},
            {"id": "ATT-002", "userId": "USR-002", "email": "sara@example.com", "role": "customer", "success": False, "timestamp": ms_ago(5*86400000), "ipAddress": "203.0.113.45",   "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari",  "deviceFingerprint": "fp_sara_phone_001", "reason": "wrong_password"},
            {"id": "ATT-003", "userId": "USR-002", "email": "sara@example.com", "role": "customer", "success": False, "timestamp": ms_ago(5*86400000 - 2*60000), "ipAddress": "203.0.113.45", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari", "deviceFingerprint": "fp_sara_phone_001", "reason": "wrong_password"},
            {"id": "ATT-004", "userId": "USR-002", "email": "sara@example.com", "role": "customer", "success": True,  "timestamp": ms_ago(5*86400000 - 5*60000), "ipAddress": "203.0.113.45", "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari", "deviceFingerprint": "fp_sara_phone_001"},
            {"id": "ATT-005", "userId": "USR-005", "email": "budi@example.com", "role": "customer", "success": False, "timestamp": ms_ago(86400000), "ipAddress": "10.0.0.55", "userAgent": "Mozilla/5.0 (Android 15) Firefox/133.0", "deviceFingerprint": "fp_budi_android_001", "reason": "wrong_password"},
            {"id": "ATT-006", "userId": "USR-005", "email": "budi@example.com", "role": "customer", "success": False, "timestamp": ms_ago(86400000 - 3*60000), "ipAddress": "10.0.0.55", "userAgent": "Mozilla/5.0 (Android 15) Firefox/133.0", "deviceFingerprint": "fp_budi_android_001", "reason": "wrong_password"},
            {"id": "ATT-007", "userId": "USR-005", "email": "budi@example.com", "role": "customer", "success": False, "timestamp": ms_ago(86400000 - 6*60000), "ipAddress": "10.0.0.55", "userAgent": "Mozilla/5.0 (Android 15) Firefox/133.0", "deviceFingerprint": "fp_budi_android_001", "reason": "wrong_password"},
        ]
        for a in attempts:
            _, created = LoginAttempt.objects.get_or_create(
                attempt_id=a["id"],
                defaults={
                    "user_id": a.get("userId", ""),
                    "email": a["email"],
                    "role": a.get("role", ""),
                    "success": a.get("success", False),
                    "timestamp": _dt(a["timestamp"]),
                    "ip_address": a.get("ipAddress", ""),
                    "user_agent": a.get("userAgent", ""),
                    "device_fingerprint": a.get("deviceFingerprint", ""),
                    "reason": a.get("reason"),
                },
            )
            if created:
                self.stdout.write(f"  Created login attempt {a['id']}")

    # ── Trusted devices ──────────────────────────────────────────

    def _seed_trusted_devices(self):
        import time
        now_ms = int(time.time() * 1000)

        def ms_ago(ms):
            return datetime.fromtimestamp((now_ms - ms) / 1000, tz=tz.utc).isoformat()

        devices = [
            {
                "id": "DEV-001", "userId": "USR-001",
                "deviceToken": "dt_admin_main_laptop_001",
                "fingerprintHash": "fp_admin_trusted_001",
                "deviceLabel": "Admin MacBook Pro (Chrome 134)",
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/134",
                "firstSeenIp": "192.168.1.101", "lastSeenIp": "192.168.1.101",
                "trustedStatus": "trusted", "fingerprintSimilarity": 96, "subnetSimilarity": 94, "userAgentMatch": True,
                "firstSeenAt": "2024-01-01T00:00:00+00:00", "lastSeenAt": ms_ago(2*86400000), "lastVerificationAt": ms_ago(2*86400000),
            },
            {
                "id": "DEV-002", "userId": "USR-002",
                "deviceToken": "dt_sara_iphone_001",
                "fingerprintHash": "fp_sara_phone_001",
                "deviceLabel": "Sara iPhone (Safari 18)",
                "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile Safari",
                "firstSeenIp": "203.0.113.45", "lastSeenIp": "203.0.113.45",
                "trustedStatus": "trusted", "fingerprintSimilarity": 91, "subnetSimilarity": 88, "userAgentMatch": True,
                "firstSeenAt": "2024-03-20T10:00:00+00:00", "lastSeenAt": ms_ago(5*86400000 - 5*60000), "lastVerificationAt": ms_ago(5*86400000 - 5*60000),
            },
            {
                "id": "DEV-003", "userId": "USR-003",
                "deviceToken": "dt_rina_android_001",
                "fingerprintHash": "fp_rina_android_001",
                "deviceLabel": "Rina Android (Chrome 133)",
                "userAgent": "Mozilla/5.0 (Linux; Android 14) Chrome/133",
                "firstSeenIp": "192.168.0.15", "lastSeenIp": "192.168.0.15",
                "trustedStatus": "trusted", "fingerprintSimilarity": 93, "subnetSimilarity": 90, "userAgentMatch": True,
                "firstSeenAt": "2024-04-05T08:30:00+00:00", "lastSeenAt": ms_ago(3*86400000), "lastVerificationAt": ms_ago(3*86400000),
            },
        ]
        for d in devices:
            _, created = TrustedDevice.objects.get_or_create(
                device_id=d["id"],
                defaults={
                    "user_id": d["userId"],
                    "device_token": d["deviceToken"],
                    "fingerprint_hash": d["fingerprintHash"],
                    "device_label": d["deviceLabel"],
                    "user_agent": d["userAgent"],
                    "first_seen_ip": d["firstSeenIp"],
                    "last_seen_ip": d["lastSeenIp"],
                    "trusted_status": d["trustedStatus"],
                    "fingerprint_similarity": d["fingerprintSimilarity"],
                    "subnet_similarity": d["subnetSimilarity"],
                    "user_agent_match": d["userAgentMatch"],
                    "first_seen_at": _dt(d["firstSeenAt"]),
                    "last_seen_at": _dt(d["lastSeenAt"]),
                    "last_verification_at": _dt(d["lastVerificationAt"]),
                },
            )
            if created:
                self.stdout.write(f"  Created device {d['id']}")

    # ── Monitoring flags ─────────────────────────────────────────

    def _seed_monitoring_flags(self):
        import time
        now_ms = int(time.time() * 1000)

        def ms_ago(ms):
            return datetime.fromtimestamp((now_ms - ms) / 1000, tz=tz.utc).isoformat()

        flags = [
            {
                "id": "FLAG-001", "entityType": "account", "entityId": "USR-005",
                "ruleCode": "RISK-LOGIN-FAIL", "title": "Repeated Failed Login",
                "severity": "medium", "status": "open",
                "reason": "Akun budi@example.com mengalami 3 kali login gagal dalam 10 menit.",
                "createdAt": ms_ago(86400000),
            },
            {
                "id": "FLAG-002", "entityType": "order", "entityId": "ORD-012",
                "ruleCode": "RISK-DEVICE-NEW", "title": "New Device Detected",
                "severity": "high", "status": "open",
                "reason": "Order ORD-012 dibuat dari device baru yang belum pernah terdaftar di histori akun.",
                "createdAt": ms_ago(7*86400000),
            },
            {
                "id": "FLAG-003", "entityType": "return", "entityId": "RET-002",
                "ruleCode": "RISK-RETURN-REPEAT", "title": "Repeated Return Requests",
                "severity": "high", "status": "open",
                "reason": "Customer menunjukkan pola return yang tidak wajar — 3 request dalam 2 minggu.",
                "createdAt": ms_ago(10*86400000),
            },
            {
                "id": "FLAG-004", "entityType": "session", "entityId": "USR-001",
                "ruleCode": "RISK-OTP-RETRY", "title": "OTP Retry Abuse",
                "severity": "low", "status": "reviewed",
                "reason": "Admin login meminta resend OTP 2 kali dalam 1 sesi login.",
                "createdAt": ms_ago(14*86400000),
            },
        ]
        for f in flags:
            _, created = MonitoringFlag.objects.get_or_create(
                flag_id=f["id"],
                defaults={
                    "entity_type": f["entityType"],
                    "entity_id": f["entityId"],
                    "rule_code": f["ruleCode"],
                    "title": f["title"],
                    "severity": f["severity"],
                    "status": f["status"],
                    "reason": f["reason"],
                    "created_at": _dt(f["createdAt"]),
                },
            )
            if created:
                self.stdout.write(f"  Created flag {f['id']}")

    # ── Activity timeline ────────────────────────────────────────

    def _seed_activity_timeline(self):
        import time
        now_ms = int(time.time() * 1000)

        def ms_ago(ms):
            return datetime.fromtimestamp((now_ms - ms) / 1000, tz=tz.utc).isoformat()

        events = [
            {"id": "EVT-001", "actorId": "USR-001", "actorRole": "admin",    "eventType": "login_success",          "label": "Admin login berhasil",                              "timestamp": ms_ago(2*86400000),               "metadata": {"deviceLabel": "Admin MacBook Pro", "ip": "192.168.1.101"}},
            {"id": "EVT-002", "actorId": "USR-001", "actorRole": "admin",    "eventType": "trusted_device_matched",  "label": "Trusted device terverifikasi: Admin MacBook Pro",    "timestamp": ms_ago(2*86400000 - 30000),       "metadata": {"deviceToken": "dt_admin_main_laptop_001"}},
            {"id": "EVT-003", "actorId": "USR-002", "actorRole": "customer", "eventType": "login_failed",           "label": "Sara Tancredi: Login gagal (wrong password) — 2x",   "timestamp": ms_ago(5*86400000),               "metadata": {"reason": "wrong_password", "ip": "203.0.113.45", "count": 2}},
            {"id": "EVT-004", "actorId": "USR-002", "actorRole": "customer", "eventType": "login_success",          "label": "Sara Tancredi: Login berhasil",                      "timestamp": ms_ago(5*86400000 - 5*60000),     "metadata": {"ip": "203.0.113.45"}},
            {"id": "EVT-005", "actorId": "USR-005", "actorRole": "customer", "eventType": "risk_flag_created",      "label": "Flag dibuat: Repeated Failed Login — budi@example.com","timestamp": ms_ago(86400000 - 7*60000),    "metadata": {"flagId": "FLAG-001", "ruleCode": "RISK-LOGIN-FAIL"}},
            {"id": "EVT-006", "actorId": "USR-001", "actorRole": "admin",    "eventType": "order_approved",         "label": "Admin approve order ORD-014",                        "timestamp": ms_ago(3*86400000),               "metadata": {"orderId": "ORD-014", "entityType": "order", "entityId": "ORD-014"}},
        ]
        for e in events:
            _, created = ActivityTimeline.objects.get_or_create(
                event_id=e["id"],
                defaults={
                    "actor_id": e.get("actorId"),
                    "actor_role": e.get("actorRole"),
                    "event_type": e["eventType"],
                    "label": e["label"],
                    "timestamp": _dt(e["timestamp"]),
                    "metadata": e.get("metadata", {}),
                },
            )
            if created:
                self.stdout.write(f"  Created event {e['id']}")

