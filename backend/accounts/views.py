import logging
import secrets
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings as django_settings
from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncYear
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

logger = logging.getLogger(__name__)

_WIB = ZoneInfo("Asia/Jakarta")

def _now():
    return datetime.now(_WIB).replace(tzinfo=None)

from .models import (
    User, Product, Review,
    Order, OrderItem, OrderStatusHistory,
    ReturnRequest, ReturnProduct, ReturnStatusHistory,
    LoginAttempt, TrustedDevice,
    MonitoringFlag, ActivityTimeline, OtpSession,
)
from .serializers import RegisterSerializer, UserSerializer


# ── Helpers ───────────────────────────────────────────────────

def _log_activity(actor_id, actor_role, event_type, label, metadata=None):

    ActivityTimeline.objects.create(
        event_id=str(uuid.uuid4()),
        actor_id=actor_id,
        actor_role=actor_role,
        event_type=event_type,
        label=label,
        timestamp=_now(),
        metadata=metadata or {},
    )


# ── Auth views ────────────────────────────────────────────────

def _parse_device_label(ua):
    if "Edg" in ua:
        browser = "Edge"
    elif "Chrome" in ua:
        browser = "Chrome"
    elif "Firefox" in ua:
        browser = "Firefox"
    elif "Safari" in ua:
        browser = "Safari"
    else:
        browser = "Browser"

    if "Android" in ua:
        os = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os = "iOS"
    elif "Windows" in ua:
        os = "Windows"
    elif "Mac" in ua:
        os = "macOS"
    elif "Linux" in ua:
        os = "Linux"
    else:
        os = "Unknown OS"

    return f"{browser} · {os}"


@api_view(["POST"])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    _log_activity(
        actor_id=user.user_code or f"USR-{user.pk:03d}",
        actor_role="customer",
        event_type="user_registered",
        label=f"New user registered: {user.email}",
        metadata={"email": user.email, "name": user.name},
    )
    return Response(
        {"message": "Registrasi berhasil", "user": UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login(request):


    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")
    ip_address = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    device_fingerprint = request.data.get("deviceFingerprint", "")

    if not email or not password:
        return Response({"error": "Email dan password wajib diisi"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(request, username=email, password=password)

    if user is None:
        # Try to find the user to attach the attempt to a userId
        try:
            found_user = User.objects.get(email=email)
            user_id = found_user.user_code or f"USR-{found_user.pk:03d}"
            user_role = found_user.role
            found_user.failed_login_count = (found_user.failed_login_count or 0) + 1
            found_user.save(update_fields=["failed_login_count"])
        except User.DoesNotExist:
            user_id = ""
            user_role = "unknown"

        LoginAttempt.objects.create(
            attempt_id=str(uuid.uuid4()),
            user_id=user_id,
            email=email,
            role=user_role,
            success=False,
            timestamp=_now(),
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
            reason="wrong_password",
        )
        _log_activity(
            actor_id=user_id or None,
            actor_role=user_role,
            event_type="login_failed",
            label=f"Login failed for {email}",
            metadata={"email": email, "reason": "wrong_password", "ipAddress": ip_address},
        )
        return Response({"error": "Email atau password salah"}, status=status.HTTP_401_UNAUTHORIZED)

    if user.status == "locked":
        return Response({"error": "Akun dikunci. Hubungi admin."}, status=status.HTTP_403_FORBIDDEN)

    user_id = user.user_code or f"USR-{user.pk:03d}"
    user.failed_login_count = 0
    user.save(update_fields=["failed_login_count"])

    device_status = "new"
    device_match = None
    if device_fingerprint:
        matched = TrustedDevice.objects.filter(
            user_id=user_id,
            fingerprint_hash=device_fingerprint,
            trusted_status="trusted",
        ).first()
        if matched:
            device_status = "trusted"
            ua_match = bool(user_agent and user_agent == matched.user_agent)
            device_match = {
                "trustedDeviceId":       matched.device_id,
                "deviceToken":           matched.device_token,
                "deviceLabel":           matched.device_label,
                "fingerprintSimilarity": 100,
                "userAgentMatch":        ua_match,
                "subnetSimilarity":      matched.subnet_similarity,
            }
            matched.last_seen_at = _now()
            matched.last_seen_ip = ip_address
            matched.user_agent_match = ua_match
            matched.save(update_fields=["last_seen_at", "last_seen_ip", "user_agent_match"])
        else:
            # Only auto-trust if this is the user's very first device.
            # If they already have trusted devices, a new fingerprint means an
            # unrecognized device — treat it as suspicious (deviceStatus stays "new").
            already_has_device = TrustedDevice.objects.filter(
                user_id=user_id, trusted_status="trusted"
            ).exists()
            if not already_has_device:
                device_id    = f"DEV-{uuid.uuid4().hex[:12].upper()}"
                device_token = f"dt_{user_id}_{int(_now().timestamp())}"
                device_label = _parse_device_label(user_agent)
                now = _now()
                TrustedDevice.objects.create(
                    device_id=device_id,
                    user_id=user_id,
                    device_token=device_token,
                    fingerprint_hash=device_fingerprint,
                    device_label=device_label,
                    user_agent=user_agent,
                    first_seen_ip=ip_address,
                    last_seen_ip=ip_address,
                    trusted_status="trusted",
                    fingerprint_similarity=100,
                    subnet_similarity=90,
                    user_agent_match=True,
                    first_seen_at=now,
                    last_seen_at=now,
                    last_verification_at=now,
                )
                _log_activity(
                    actor_id=user_id,
                    actor_role=user.role,
                    event_type="device_trusted",
                    label=f"First device auto-trusted on registration: {device_label}",
                    metadata={"deviceId": device_id, "deviceLabel": device_label, "fingerprint": device_fingerprint},
                )
            else:
                # User already has trusted devices + this fingerprint is unknown
                # → require OTP to verify identity before trusting new device
                # (skip for twoFactorEnabled users — their 2FA flow handles it)
                if not user.two_factor_enabled:
                    otp_session_id = str(uuid.uuid4())
                    otp_code = f"{secrets.randbelow(1000000):06d}"
                    OtpSession.objects.filter(
                        user_id=user_id, purpose="device_verification",
                        is_expired=False, is_verified=False,
                    ).update(is_expired=True)
                    OtpSession.objects.create(
                        session_id=otp_session_id,
                        user_id=user_id,
                        purpose="device_verification",
                        expires_at=_now() + timedelta(minutes=5),
                        metadata={
                            "otpCode": otp_code,
                            "deviceFingerprint": device_fingerprint,
                            "userAgent": user_agent,
                            "ipAddress": ip_address,
                        },
                    )
                    if django_settings.DEBUG:
                        print(f"\n[DEV] OTP for {email}: {otp_code}\n")
                        logger.warning("[DEV] OTP for %s: %s", email, otp_code)
                    try:
                        _send_otp_email(user.email, otp_code, "device_verification")
                    except Exception as exc:
                        logger.error("Failed to send OTP email to %s: %s", user.email, exc)
                    LoginAttempt.objects.create(
                        attempt_id=str(uuid.uuid4()),
                        user_id=user_id, email=email, role=user.role,
                        success=True, timestamp=_now(),
                        ip_address=ip_address, user_agent=user_agent,
                        device_fingerprint=device_fingerprint, reason=None,
                    )
                    _log_activity(
                        actor_id=user_id, actor_role=user.role,
                        event_type="new_device_otp_required",
                        label=f"New device detected for {email} — OTP required",
                        metadata={"email": email, "ipAddress": ip_address, "deviceFingerprint": device_fingerprint},
                    )
                    return Response({
                        "requireDeviceOtp": True,
                        "sessionId": otp_session_id,
                        "user": _serialize_user(user),
                        "deviceStatus": "new",
                        "deviceMatch": None,
                    })

    LoginAttempt.objects.create(
        attempt_id=str(uuid.uuid4()),
        user_id=user_id,
        email=email,
        role=user.role,
        success=True,
        timestamp=_now(),
        ip_address=ip_address,
        user_agent=user_agent,
        device_fingerprint=device_fingerprint,
        reason=None,
    )
    _log_activity(
        actor_id=user_id,
        actor_role=user.role,
        event_type="login_success",
        label=f"Login success for {email}",
        metadata={"email": email, "ipAddress": ip_address, "deviceStatus": device_status, "deviceFingerprint": device_fingerprint},
    )

    return Response({
        "message": "Login berhasil",
        "user": _serialize_user(user),
        "deviceStatus": device_status,
        "deviceMatch": device_match,
    })


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


@api_view(["PATCH"])
def update_profile(request):
    """PATCH { userId, name, phone, location, postalCode } → update user profile."""
    data = request.data
    user_code = data.get("userId")
    if not user_code:
        return Response({"error": "userId required"}, status=400)
    try:
        user = User.objects.get(user_code=user_code)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if "name" in data:
        user.name = data["name"].strip()
    if "phone" in data:
        user.phone = data["phone"].strip()
    if "location" in data:
        user.location = data["location"].strip()
    if "postalCode" in data:
        user.postal_code = data["postalCode"].strip()
    user.save()
    return Response({"ok": True, "user": _serialize_user(user)})


def _send_otp_email(to_email, otp_code, purpose):
    from django.core.mail import send_mail
    from django.conf import settings

    if purpose == "device_verification":
        subject = "careofyou — Verifikasi Perangkat Baru"
        body = (
            f"Hai,\n\n"
            f"Login dari perangkat baru terdeteksi di akun careofyou kamu.\n\n"
            f"Kode OTP kamu: {otp_code}\n\n"
            f"Kode berlaku selama 5 menit. Jangan bagikan kode ini ke siapapun.\n\n"
            f"Jika kamu tidak merasa melakukan ini, abaikan email ini.\n\n"
            f"— Tim careofyou"
        )
    else:
        subject = "careofyou — Kode Verifikasi Login"
        body = (
            f"Hai,\n\n"
            f"Kode OTP untuk login ke careofyou:\n\n"
            f"Kode OTP kamu: {otp_code}\n\n"
            f"Kode berlaku selama 5 menit. Jangan bagikan kode ini ke siapapun.\n\n"
            f"— Tim careofyou"
        )

    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to_email], fail_silently=False)
    except Exception as e:
        raise RuntimeError(f"Gagal mengirim email OTP: {e}")


@api_view(["POST"])
def otp_request(request):


    user_id = request.data.get("userId", "")
    purpose = request.data.get("purpose", "login")

    if not user_id:
        return Response({"error": "userId wajib diisi"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(user_code=user_id)
    except User.DoesNotExist:
        return Response({"error": "User tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    # Expire any active sessions for same user+purpose
    OtpSession.objects.filter(
        user_id=user_id, purpose=purpose, is_expired=False, is_verified=False
    ).update(is_expired=True)

    otp_code = f"{secrets.randbelow(1000000):06d}"
    session_id = str(uuid.uuid4())
    expires_at = _now() + timedelta(minutes=5)
    OtpSession.objects.create(
        session_id=session_id,
        user_id=user_id,
        purpose=purpose,
        expires_at=expires_at,
        metadata={
            "otpCode": otp_code,
            "deviceFingerprint": request.data.get("deviceFingerprint", ""),
            "userAgent": request.META.get("HTTP_USER_AGENT", ""),
            "ipAddress": request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", "")),
        },
    )

    if django_settings.DEBUG:
        print(f"\n[DEV] OTP for {user.email}: {otp_code}\n")
        logger.warning("[DEV] OTP for %s: %s", user.email, otp_code)
    try:
        _send_otp_email(user.email, otp_code, purpose)
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", user.email, e)

    _log_activity(
        actor_id=user_id,
        actor_role=None,
        event_type="otp_requested",
        label=f"OTP requested for {purpose}",
        metadata={"userId": user_id, "purpose": purpose},
    )

    return Response({"sessionId": session_id})


@api_view(["POST"])
def otp_verify(request):
    MAX_ATTEMPTS = 3

    session_id = request.data.get("sessionId", "")
    code = request.data.get("code", "").strip()

    if not session_id or not code:
        return Response({"error": "sessionId dan code wajib diisi"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        session = OtpSession.objects.get(session_id=session_id)
    except OtpSession.DoesNotExist:
        return Response({"error": "Sesi OTP tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    if session.is_verified:
        return Response({"error": "OTP sudah digunakan"}, status=status.HTTP_400_BAD_REQUEST)

    if session.is_expired or _now() > session.expires_at:
        session.is_expired = True
        session.save(update_fields=["is_expired"])
        _log_activity(
            actor_id=session.user_id,
            actor_role=None,
            event_type="otp_expired",
            label="OTP session expired",
            metadata={"userId": session.user_id, "purpose": session.purpose},
        )
        return Response({"error": "OTP sudah kadaluarsa", "reason": "otp_expired"}, status=status.HTTP_400_BAD_REQUEST)

    expected_code = session.metadata.get("otpCode", "")
    session.attempts += 1
    if not expected_code or code != expected_code:
        session.save(update_fields=["attempts"])
        _log_activity(
            actor_id=session.user_id,
            actor_role=None,
            event_type="otp_failed",
            label="OTP verification failed",
            metadata={"userId": session.user_id, "purpose": session.purpose, "attempts": session.attempts},
        )
        if session.attempts >= MAX_ATTEMPTS:
            session.is_expired = True
            session.save(update_fields=["is_expired"])
            return Response(
                {"error": "OTP salah 3 kali. Sesi dikunci.", "reason": "otp_max_attempts"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        remaining = MAX_ATTEMPTS - session.attempts
        return Response(
            {"error": f"OTP salah. Sisa {remaining} percobaan.", "reason": "otp_wrong", "attemptsLeft": remaining},
            status=status.HTTP_400_BAD_REQUEST,
        )

    session.is_verified = True
    session.save(update_fields=["attempts", "is_verified"])
    _log_activity(
        actor_id=session.user_id,
        actor_role=None,
        event_type="otp_verified",
        label=f"OTP verified for {session.purpose}",
        metadata={"userId": session.user_id, "purpose": session.purpose},
    )

    try:
        user = User.objects.get(user_code=session.user_id)
    except User.DoesNotExist:
        return Response({"error": "User tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    # Auto-trust device after successful OTP verification
    device_status = "trusted"
    device_match = None
    fp = session.metadata.get("deviceFingerprint", "")
    ua = session.metadata.get("userAgent", "")
    ip = session.metadata.get("ipAddress", "")

    if fp:
        existing = TrustedDevice.objects.filter(
            user_id=session.user_id, fingerprint_hash=fp, trusted_status="trusted"
        ).first()
        if existing:
            ua_match = bool(ua and ua == existing.user_agent)
            device_match = {
                "trustedDeviceId":       existing.device_id,
                "deviceToken":           existing.device_token,
                "deviceLabel":           existing.device_label,
                "fingerprintSimilarity": 100,
                "userAgentMatch":        ua_match,
                "subnetSimilarity":      existing.subnet_similarity,
            }
            existing.last_seen_at = _now()
            existing.save(update_fields=["last_seen_at"])
        else:
            device_id    = f"DEV-{uuid.uuid4().hex[:12].upper()}"
            device_token = f"dt_{session.user_id}_{int(_now().timestamp())}"
            device_label = _parse_device_label(ua) if ua else "Browser session"
            now = _now()
            new_dev = TrustedDevice.objects.create(
                device_id=device_id, user_id=session.user_id,
                device_token=device_token, fingerprint_hash=fp,
                device_label=device_label, user_agent=ua,
                first_seen_ip=ip, last_seen_ip=ip,
                trusted_status="trusted",
                fingerprint_similarity=100, subnet_similarity=90,
                user_agent_match=True,
                first_seen_at=now, last_seen_at=now, last_verification_at=now,
            )
            device_match = {
                "trustedDeviceId":       new_dev.device_id,
                "deviceToken":           new_dev.device_token,
                "deviceLabel":           new_dev.device_label,
                "fingerprintSimilarity": 100,
                "userAgentMatch":        True,
                "subnetSimilarity":      90,
            }
            _log_activity(
                actor_id=session.user_id, actor_role=None,
                event_type="device_trusted",
                label=f"Device trusted after OTP: {device_label}",
                metadata={"deviceId": device_id, "deviceLabel": device_label, "purpose": session.purpose},
            )

    return Response({
        "success": True,
        "user": _serialize_user(user),
        "deviceStatus": device_status,
        "deviceMatch": device_match,
    })


# ── Serializer helpers ────────────────────────────────────────

def _serialize_user(u):
    return {
        "id": u.user_code or f"USR-{u.pk:03d}",
        "email": u.email,
        "name": u.name,
        "phone": u.phone,
        "location": u.location,
        "postalCode": u.postal_code,
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


def _serialize_product(p):
    avg = p.avg_rating if hasattr(p, "avg_rating") and p.avg_rating is not None else 0
    cnt = p.review_count if hasattr(p, "review_count") else 0
    return {
        "id":          p.product_id,
        "brand":       p.brand,
        "name":        p.name,
        "category":    p.category,
        "price":       p.price,
        "image":       p.image,
        "rating":      round(avg, 1),
        "reviews":     cnt,
        "desc":        p.desc,
        "qrCode":      p.qr_code,
        "bestseller":  p.bestseller,
        "isActive":    p.is_active,
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


# ── Store views ───────────────────────────────────────────────

@api_view(["GET"])
def revenue_stats(request):
    """GET /api/store/revenue/?period=daily|monthly|yearly"""
    period = request.query_params.get("period", "monthly")
    from datetime import timedelta

    PAID = ["packing", "shipped", "delivered"]
    qs = Order.objects.filter(status__in=PAID)

    now = _now()

    if period == "daily":
        # Current ISO week Mon–Sun
        week_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)
        rows = (
            qs.filter(created_at__gte=week_start, created_at__lt=week_end)
            .annotate(day=TruncDay("created_at"))
            .values("day")
            .annotate(val=Sum("total"))
            .order_by("day")
        )
        day_map = {r["day"].weekday(): r["val"] for r in rows}
        LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
        return Response([{"label": LABELS[i], "val": day_map.get(i, 0)} for i in range(7)])

    if period == "monthly":
        year = now.year
        rows = (
            qs.filter(created_at__year=year)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(val=Sum("total"))
            .order_by("month")
        )
        month_map = {r["month"].month: r["val"] for r in rows}
        LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]
        return Response([{"label": LABELS[m - 1], "val": month_map.get(m, 0)} for m in range(1, 13)])

    if period == "yearly":
        rows = (
            qs.annotate(year=TruncYear("created_at"))
            .values("year")
            .annotate(val=Sum("total"))
            .order_by("year")
        )
        if not rows:
            return Response([{"label": str(now.year), "val": 0}])
        return Response([{"label": str(r["year"].year), "val": r["val"]} for r in rows])

    return Response({"error": "Invalid period"}, status=400)


@api_view(["GET"])
def store_init(request):
    """Return full store state from database."""
    users = [_serialize_user(u) for u in User.objects.all()]
    products = [
        _serialize_product(p)
        for p in Product.objects.filter(is_active=True)
        .annotate(
            avg_rating=Avg("product_reviews__rating"),
            review_count=Count("product_reviews"),
        )
        .order_by("product_id")
    ]

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

    product_reviews = list(
        Review.objects.values("review_id", "product_id", "user_id", "order_id", "rating")
    )
    serialized_reviews = [
        {
            "reviewId":  r["review_id"],
            "productId": r["product_id"],
            "userId":    r["user_id"],
            "orderId":   r["order_id"],
            "rating":    r["rating"],
        }
        for r in product_reviews
    ]

    return Response({
        "users": users,
        "products": products,
        "productReviews": serialized_reviews,
        "orders": orders,
        "returns": returns,
        "loginAttempts": login_attempts,
        "trustedDevices": trusted_devices,
        "monitoringFlags": monitoring_flags,
        "activityTimeline": activity_timeline,
    })


@api_view(["POST"])
def submit_review(request):
    """POST { productId, userId, orderId, rating } → save a 1-5 star review."""
    data = request.data
    product_id = data.get("productId")
    user_id    = data.get("userId")
    order_id   = data.get("orderId", "")
    rating     = data.get("rating")

    if not product_id or not user_id or rating is None:
        return Response({"error": "productId, userId, and rating are required"}, status=400)

    try:
        rating = int(rating)
        if not (1 <= rating <= 5):
            raise ValueError
    except (ValueError, TypeError):
        return Response({"error": "rating must be an integer 1–5"}, status=400)

    try:
        product = Product.objects.get(product_id=product_id)
    except Product.DoesNotExist:
        return Response({"error": "Product not found"}, status=404)

    review_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
    review, created = Review.objects.update_or_create(
        product=product,
        user_id=user_id,
        order_id=order_id,
        defaults={"rating": rating, "review_id": review_id},
    )
    if not created:
        review.rating = rating
        review.save(update_fields=["rating"])

    product_with_stats = (
        Product.objects.filter(product_id=product_id)
        .annotate(avg_rating=Avg("product_reviews__rating"), review_count=Count("product_reviews"))
        .first()
    )
    return Response({"ok": True, "product": _serialize_product(product_with_stats)}, status=200)


def _dt(val):
    """Parse ISO datetime string → naive WIB datetime, or None."""
    if not val:
        return None
    try:
        dt = parse_datetime(str(val).replace("Z", "+00:00"))
        if dt is None:
            return None
        if dt.tzinfo is not None:
            dt = dt.astimezone(_WIB).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def _upsert_order(data):
    order_id = data.get("id") or data.get("order_id")
    if not order_id:
        return

    created_at = _dt(data.get("createdAt")) or _dt(data.get("created_at"))
    updated_at = _dt(data.get("updatedAt")) or _dt(data.get("updated_at")) or created_at

    now = _now()
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

    now = _now()
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

    now = _now()

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

    except Exception as exc:
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"ok": True})
