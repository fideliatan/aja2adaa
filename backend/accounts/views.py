from django.contrib.auth import authenticate
from django.db import transaction
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    User,
    Order, OrderItem, OrderStatusHistory,
    ReturnRequest, ReturnProduct, ReturnStatusHistory,
    LoginAttempt, TrustedDevice,
    MonitoringFlag, ActivityTimeline, ApprovalStatusChange,
)
from .serializers import RegisterSerializer, UserSerializer


# ── Auth views ────────────────────────────────────────────────

@api_view(["POST"])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    return Response(
        {"message": "Registrasi berhasil", "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")

    if not email or not password:
        return Response({"error": "Email dan password wajib diisi"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=email, password=password)
    if user is None:
        return Response({"error": "Email atau password salah"}, status=status.HTTP_401_UNAUTHORIZED)

    if user.status == "locked":
        return Response({"error": "Akun dikunci. Hubungi admin."}, status=status.HTTP_403_FORBIDDEN)

    return Response({"message": "Login berhasil", "user": _serialize_user(user)})


@api_view(["GET"])
def me(request):
    email = request.query_params.get("email")
    if not email:
        return Response({"error": "Parameter email diperlukan"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(email=email)
        return Response(UserSerializer(user).data)
    except User.DoesNotExist:
        return Response({"error": "User tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)


# ── Serializer helpers ────────────────────────────────────────

def _serialize_user(u):
    return {
        "id": u.user_code or f"USR-{u.pk:03d}",
        "email": u.email,
        "name": u.name,
        "phone": u.phone,
        "role": u.role,
        "status": u.status,
        "twoFactorEnabled": u.two_factor_enabled,
        "failedLoginCount": u.failed_login_count,
        "lockedUntil": u.locked_until.isoformat() if u.locked_until else None,
        "avatar": u.avatar,
        "createdAt": u.created_at.isoformat(),
    }


def _serialize_order(o):
    items = [
        {"name": i.name, "qty": i.qty, "price": i.price, "image": i.image}
        for i in o.items.all()
    ]
    history = [
        {
            "id": h.history_id,
            "status": h.status,
            "actorId": h.actor_id,
            "actorRole": h.actor_role,
            "note": h.note,
            "createdAt": h.created_at.isoformat(),
        }
        for h in o.status_history.order_by("created_at")
    ]
    return {
        "id": o.order_id,
        "status": o.status,
        "customer": o.customer,
        "customerId": o.customer_id,
        "email": o.email,
        "date": o.date,
        "items": items,
        "subtotal": o.subtotal,
        "deliveryFee": o.delivery_fee,
        "total": o.total,
        "payment": o.payment,
        "paymentAccount": o.payment_account,
        "recipient": o.recipient,
        "phone": o.phone,
        "address": o.address,
        "paymentProof": o.payment_proof,
        "deliveryProof": o.delivery_proof,
        "rejectionReason": o.rejection_reason,
        "cancelReason": o.cancel_reason,
        "trackingNumber": o.tracking_number,
        "courier": o.courier,
        "cancelDeadlineTs": o.cancel_deadline_ts,
        "sessionSnapshot": o.session_snapshot,
        "riskSummary": o.risk_summary,
        "statusHistory": history,
        "createdAt": o.created_at.isoformat(),
        "updatedAt": o.updated_at.isoformat(),
    }


def _serialize_return(r):
    products = [
        {"name": p.name, "qty": p.qty, "price": p.price, "image": p.image}
        for p in r.products.all()
    ]
    history = [
        {
            "id": h.history_id,
            "status": h.status,
            "actorId": h.actor_id,
            "actorRole": h.actor_role,
            "note": h.note,
            "createdAt": h.created_at.isoformat(),
        }
        for h in r.status_history.order_by("created_at")
    ]
    return {
        "id": r.return_id,
        "orderId": r.order_id,
        "customerId": r.customer_id,
        "customer": r.customer,
        "email": r.email,
        "date": r.date,
        "reason": r.reason,
        "status": r.status,
        "monitoringFlag": r.monitoring_flag,
        "products": products,
        "conditionNote": r.condition_note,
        "photos": r.photos,
        "receiptB64": r.receipt_b64,
        "productPhotoB64": r.product_photo_b64,
        "qrCode": r.qr_code,
        "scannedQr": r.scanned_qr,
        "qrStatus": r.qr_status,
        "total": r.total,
        "sessionSnapshot": r.session_snapshot,
        "riskSummary": r.risk_summary,
        "statusHistory": history,
        "createdAt": r.created_at.isoformat(),
        "updatedAt": r.updated_at.isoformat(),
    }


def _serialize_login_attempt(a):
    return {
        "id": a.attempt_id,
        "userId": a.user_id,
        "email": a.email,
        "role": a.role,
        "success": a.success,
        "timestamp": a.timestamp.isoformat(),
        "ipAddress": a.ip_address,
        "userAgent": a.user_agent,
        "deviceFingerprint": a.device_fingerprint,
        "reason": a.reason,
    }


def _serialize_trusted_device(d):
    return {
        "id": d.device_id,
        "userId": d.user_id,
        "deviceToken": d.device_token,
        "fingerprintHash": d.fingerprint_hash,
        "deviceLabel": d.device_label,
        "userAgent": d.user_agent,
        "firstSeenIp": d.first_seen_ip,
        "lastSeenIp": d.last_seen_ip,
        "trustedStatus": d.trusted_status,
        "fingerprintSimilarity": d.fingerprint_similarity,
        "subnetSimilarity": d.subnet_similarity,
        "userAgentMatch": d.user_agent_match,
        "firstSeenAt": d.first_seen_at.isoformat(),
        "lastSeenAt": d.last_seen_at.isoformat(),
        "lastVerificationAt": d.last_verification_at.isoformat(),
    }


def _serialize_flag(f):
    return {
        "id": f.flag_id,
        "entityType": f.entity_type,
        "entityId": f.entity_id,
        "ruleCode": f.rule_code,
        "title": f.title,
        "severity": f.severity,
        "status": f.status,
        "reason": f.reason,
        "createdAt": f.created_at.isoformat(),
        "reviewedAt": f.reviewed_at.isoformat() if f.reviewed_at else None,
        "resolvedAt": f.resolved_at.isoformat() if f.resolved_at else None,
        "triggerCount": f.trigger_count,
        "lastTriggeredAt": f.last_triggered_at.isoformat() if f.last_triggered_at else None,
    }


def _serialize_timeline(e):
    return {
        "id": e.event_id,
        "actorId": e.actor_id,
        "actorRole": e.actor_role,
        "eventType": e.event_type,
        "label": e.label,
        "timestamp": e.timestamp.isoformat(),
        "metadata": e.metadata,
    }


def _serialize_approval_change(c):
    return {
        "id": c.change_id,
        "entityType": c.entity_type,
        "entityId": c.entity_id,
        "fromStatus": c.from_status,
        "toStatus": c.to_status,
        "actorId": c.actor_id,
        "actorRole": c.actor_role,
        "note": c.note,
        "metadata": c.metadata,
        "createdAt": c.created_at.isoformat(),
    }


# ── Store views ───────────────────────────────────────────────

@api_view(["GET"])
def store_init(request):
    """Return full store state from database."""
    users = [_serialize_user(u) for u in User.objects.all()]

    orders = [
        _serialize_order(o)
        for o in Order.objects.prefetch_related("items", "status_history").order_by("-created_at")
    ]

    returns = [
        _serialize_return(r)
        for r in ReturnRequest.objects.prefetch_related("products", "status_history").order_by("-created_at")
    ]

    login_attempts = [
        _serialize_login_attempt(a)
        for a in LoginAttempt.objects.order_by("timestamp")
    ]

    trusted_devices = [
        _serialize_trusted_device(d)
        for d in TrustedDevice.objects.order_by("first_seen_at")
    ]

    monitoring_flags = [
        _serialize_flag(f)
        for f in MonitoringFlag.objects.order_by("-created_at")
    ]

    activity_timeline = [
        _serialize_timeline(e)
        for e in ActivityTimeline.objects.order_by("-timestamp")[:200]
    ]

    approval_changes = [
        _serialize_approval_change(c)
        for c in ApprovalStatusChange.objects.order_by("-created_at")
    ]

    return Response({
        "users": users,
        "orders": orders,
        "returns": returns,
        "loginAttempts": login_attempts,
        "trustedDevices": trusted_devices,
        "monitoringFlags": monitoring_flags,
        "activityTimeline": activity_timeline,
        "approvalStatusChanges": approval_changes,
    })


def _dt(val):
    """Parse ISO datetime string, return None if blank/None."""
    if not val:
        return None
    try:
        return parse_datetime(str(val).replace("Z", "+00:00"))
    except Exception:
        return None


def _upsert_order(data):
    order_id = data.get("id") or data.get("order_id")
    if not order_id:
        return

    created_at = _dt(data.get("createdAt")) or _dt(data.get("created_at"))
    updated_at = _dt(data.get("updatedAt")) or _dt(data.get("updated_at")) or created_at

    from django.utils import timezone
    now = timezone.now()
    if not created_at:
        created_at = now
    if not updated_at:
        updated_at = now

    order, _ = Order.objects.update_or_create(
        order_id=order_id,
        defaults={
            "status": data.get("status", "pending"),
            "customer": data.get("customer", ""),
            "customer_id": data.get("customerId", ""),
            "email": data.get("email", ""),
            "date": data.get("date", ""),
            "subtotal": data.get("subtotal", 0),
            "delivery_fee": data.get("deliveryFee", 0),
            "total": data.get("total", 0),
            "payment": data.get("payment", ""),
            "payment_account": data.get("paymentAccount", ""),
            "recipient": data.get("recipient", ""),
            "phone": data.get("phone", ""),
            "address": data.get("address", ""),
            "payment_proof": data.get("paymentProof"),
            "delivery_proof": data.get("deliveryProof"),
            "rejection_reason": data.get("rejectionReason"),
            "cancel_reason": data.get("cancelReason"),
            "tracking_number": data.get("trackingNumber"),
            "courier": data.get("courier"),
            "cancel_deadline_ts": data.get("cancelDeadlineTs"),
            "session_snapshot": data.get("sessionSnapshot") or {},
            "risk_summary": data.get("riskSummary"),
            "created_at": created_at,
            "updated_at": updated_at,
        },
    )

    order.items.all().delete()
    for item in data.get("items", []):
        OrderItem.objects.create(
            order=order,
            name=item.get("name", ""),
            qty=item.get("qty", 1),
            price=item.get("price", 0),
            image=item.get("image", ""),
        )

    existing_hist_ids = set(order.status_history.values_list("history_id", flat=True))
    for h in data.get("statusHistory", []):
        hist_id = h.get("id", "")
        if hist_id and hist_id not in existing_hist_ids:
            OrderStatusHistory.objects.create(
                order=order,
                history_id=hist_id,
                status=h.get("status", ""),
                actor_id=h.get("actorId"),
                actor_role=h.get("actorRole"),
                note=h.get("note", ""),
                created_at=_dt(h.get("createdAt")) or created_at,
            )


def _upsert_return(data):
    return_id = data.get("id") or data.get("return_id")
    if not return_id:
        return

    from django.utils import timezone
    now = timezone.now()
    created_at = _dt(data.get("createdAt")) or now
    updated_at = _dt(data.get("updatedAt")) or created_at

    ret, _ = ReturnRequest.objects.update_or_create(
        return_id=return_id,
        defaults={
            "order_id": data.get("orderId", ""),
            "customer_id": data.get("customerId", ""),
            "customer": data.get("customer", ""),
            "email": data.get("email", ""),
            "date": data.get("date", ""),
            "reason": data.get("reason", ""),
            "status": data.get("status", "pending"),
            "monitoring_flag": data.get("monitoringFlag"),
            "condition_note": data.get("conditionNote", ""),
            "photos": data.get("photos") or [],
            "receipt_b64": data.get("receiptB64"),
            "product_photo_b64": data.get("productPhotoB64"),
            "qr_code": data.get("qrCode", ""),
            "scanned_qr": data.get("scannedQr"),
            "qr_status": data.get("qrStatus"),
            "total": data.get("total", 0),
            "session_snapshot": data.get("sessionSnapshot") or {},
            "risk_summary": data.get("riskSummary"),
            "created_at": created_at,
            "updated_at": updated_at,
        },
    )

    ret.products.all().delete()
    for p in data.get("products", []):
        ReturnProduct.objects.create(
            return_request=ret,
            name=p.get("name", ""),
            qty=p.get("qty", 1),
            price=p.get("price", 0),
            image=p.get("image", ""),
        )

    existing_hist_ids = set(ret.status_history.values_list("history_id", flat=True))
    for h in data.get("statusHistory", []):
        hist_id = h.get("id", "")
        if hist_id and hist_id not in existing_hist_ids:
            ReturnStatusHistory.objects.create(
                return_request=ret,
                history_id=hist_id,
                status=h.get("status", ""),
                actor_id=h.get("actorId"),
                actor_role=h.get("actorRole"),
                note=h.get("note", ""),
                created_at=_dt(h.get("createdAt")) or created_at,
            )


@api_view(["POST"])
def store_sync(request):
    """Accept full store state and upsert all entities to the database."""
    data = request.data
    if not isinstance(data, dict):
        return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

    from django.utils import timezone
    now = timezone.now()

    try:
        with transaction.atomic():
            # Upsert users (skip password fields)
            for u in data.get("users", []):
                email = u.get("email")
                if not email:
                    continue
                user_code = u.get("id", "")
                User.objects.filter(email=email).update(
                    name=u.get("name", ""),
                    phone=u.get("phone", ""),
                    status=u.get("status", "active"),
                    failed_login_count=u.get("failedLoginCount", 0),
                    locked_until=_dt(u.get("lockedUntil")),
                    avatar=u.get("avatar"),
                    user_code=user_code,
                )

            # Upsert orders
            for order_data in data.get("orders", []):
                _upsert_order(order_data)

            # Upsert returns
            for return_data in data.get("returns", []):
                _upsert_return(return_data)

            # Upsert login attempts
            for a in data.get("loginAttempts", []):
                attempt_id = a.get("id")
                if not attempt_id:
                    continue
                LoginAttempt.objects.update_or_create(
                    attempt_id=attempt_id,
                    defaults={
                        "user_id": a.get("userId", ""),
                        "email": a.get("email", ""),
                        "role": a.get("role", ""),
                        "success": a.get("success", False),
                        "timestamp": _dt(a.get("timestamp")) or now,
                        "ip_address": a.get("ipAddress", ""),
                        "user_agent": a.get("userAgent", ""),
                        "device_fingerprint": a.get("deviceFingerprint", ""),
                        "reason": a.get("reason"),
                    },
                )

            # Upsert trusted devices
            for d in data.get("trustedDevices", []):
                device_id = d.get("id")
                if not device_id:
                    continue
                TrustedDevice.objects.update_or_create(
                    device_id=device_id,
                    defaults={
                        "user_id": d.get("userId", ""),
                        "device_token": d.get("deviceToken", ""),
                        "fingerprint_hash": d.get("fingerprintHash", ""),
                        "device_label": d.get("deviceLabel", ""),
                        "user_agent": d.get("userAgent", ""),
                        "first_seen_ip": d.get("firstSeenIp", ""),
                        "last_seen_ip": d.get("lastSeenIp", ""),
                        "trusted_status": d.get("trustedStatus", "trusted"),
                        "fingerprint_similarity": d.get("fingerprintSimilarity", 0),
                        "subnet_similarity": d.get("subnetSimilarity", 0),
                        "user_agent_match": d.get("userAgentMatch", False),
                        "first_seen_at": _dt(d.get("firstSeenAt")) or now,
                        "last_seen_at": _dt(d.get("lastSeenAt")) or now,
                        "last_verification_at": _dt(d.get("lastVerificationAt")) or now,
                    },
                )

            # Upsert monitoring flags
            for f in data.get("monitoringFlags", []):
                flag_id = f.get("id")
                if not flag_id:
                    continue
                MonitoringFlag.objects.update_or_create(
                    flag_id=flag_id,
                    defaults={
                        "entity_type": f.get("entityType", ""),
                        "entity_id": f.get("entityId", ""),
                        "rule_code": f.get("ruleCode", ""),
                        "title": f.get("title", ""),
                        "severity": f.get("severity", "low"),
                        "status": f.get("status", "open"),
                        "reason": f.get("reason", ""),
                        "created_at": _dt(f.get("createdAt")) or now,
                        "reviewed_at": _dt(f.get("reviewedAt")),
                        "resolved_at": _dt(f.get("resolvedAt")),
                        "trigger_count": f.get("triggerCount", 1),
                        "last_triggered_at": _dt(f.get("lastTriggeredAt")),
                    },
                )

            # Upsert activity timeline
            for e in data.get("activityTimeline", []):
                event_id = e.get("id")
                if not event_id:
                    continue
                ActivityTimeline.objects.update_or_create(
                    event_id=event_id,
                    defaults={
                        "actor_id": e.get("actorId"),
                        "actor_role": e.get("actorRole"),
                        "event_type": e.get("eventType", ""),
                        "label": e.get("label", ""),
                        "timestamp": _dt(e.get("timestamp")) or now,
                        "metadata": e.get("metadata") or {},
                    },
                )

            # Upsert approval status changes
            for c in data.get("approvalStatusChanges", []):
                change_id = c.get("id")
                if not change_id:
                    continue
                ApprovalStatusChange.objects.update_or_create(
                    change_id=change_id,
                    defaults={
                        "entity_type": c.get("entityType", ""),
                        "entity_id": c.get("entityId", ""),
                        "from_status": c.get("fromStatus"),
                        "to_status": c.get("toStatus", ""),
                        "actor_id": c.get("actorId"),
                        "actor_role": c.get("actorRole"),
                        "note": c.get("note", ""),
                        "metadata": c.get("metadata") or {},
                        "created_at": _dt(c.get("createdAt")) or now,
                    },
                )

    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"ok": True})
