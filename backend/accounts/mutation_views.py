import uuid
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import (
    Order, OrderItem, OrderStatusHistory,
    ReturnRequest, ReturnProduct, ReturnStatusHistory,
    MonitoringFlag, ActivityTimeline, TrustedDevice, Address,
)
from .views import (
    _log_activity, _dt, _now,
    _serialize_order, _serialize_return, _serialize_flag,
    _serialize_timeline, _serialize_trusted_device,
)

ORDER_EVENT_TYPES = {
    "pending":   "order_created",
    "packing":   "order_approved",
    "shipped":   "order_shipped",
    "delivered": "order_delivered",
    "rejected":  "order_rejected",
    "cancelled": "order_cancelled",
}

ORDER_STATUS_LABELS = {
    "pending":   "Order placed and waiting for approval",
    "packing":   "Payment approved by admin",
    "shipped":   "Order marked as shipped by admin",
    "delivered": "Order marked as delivered by admin",
    "rejected":  "Payment rejected by admin",
    "cancelled": "Order cancelled",
}

RETURN_EVENT_TYPES = {
    "pending":    "return_requested",
    "flagged":    "return_flagged",
    "processing": "return_processing",
    "completed":  "return_completed",
    "rejected":   "return_rejected",
}

RETURN_STATUS_LABELS = {
    "pending":    "Return submitted",
    "flagged":    "Return flagged for review",
    "processing": "Return moved to manual review",
    "completed":  "Return completed",
    "rejected":   "Return rejected",
}


# ── Orders ─────────────────────────────────────────────────────

@api_view(["POST"])
def create_order(request):
    data = request.data
    now = _now()
    order_id = data.get("id") or f"ORD-{uuid.uuid4().hex[:8].upper()}"
    created_at = _dt(data.get("createdAt")) or now

    with transaction.atomic():
        order = Order.objects.create(
            order_id=order_id,
            status=data.get("status", "pending"),
            customer=data.get("customer", ""),
            customer_id=data.get("customerId", ""),
            email=data.get("email", ""),
            date=data.get("date", ""),
            subtotal=data.get("subtotal", 0),
            delivery_fee=data.get("deliveryFee", 0),
            total=data.get("total", 0),
            payment=data.get("payment", ""),
            payment_account=data.get("paymentAccount", ""),
            recipient=data.get("recipient", ""),
            phone=data.get("phone", ""),
            address=data.get("address", ""),
            payment_proof=data.get("paymentProof"),
            cancel_deadline_ts=data.get("cancelDeadlineTs"),
            session_snapshot=data.get("sessionSnapshot") or {},
            risk_summary=data.get("riskSummary"),
            created_at=created_at,
            updated_at=created_at,
        )
        for item in data.get("items", []):
            OrderItem.objects.create(
                order=order,
                name=item.get("name", ""),
                qty=item.get("qty", 1),
                price=item.get("price", 0),
                image=item.get("image", ""),
            )
        OrderStatusHistory.objects.create(
            order=order,
            history_id=str(uuid.uuid4()),
            status="pending",
            actor_id=data.get("customerId", ""),
            actor_role="customer",
            note="Order placed and waiting for approval.",
            created_at=created_at,
        )
        _log_activity(
            actor_id=data.get("customerId"),
            actor_role="customer",
            event_type="order_created",
            label=f"Order placed: {order_id}",
            metadata={"entityType": "order", "entityId": order_id, "orderId": order_id, "total": data.get("total", 0)},
        )
        if data.get("paymentProof"):
            _log_activity(
                actor_id=data.get("customerId"),
                actor_role="customer",
                event_type="payment_proof_uploaded",
                label=f"Payment proof uploaded for {order_id}",
                metadata={"entityType": "order", "entityId": order_id, "orderId": order_id},
            )

    order.refresh_from_db()
    return Response({"order": _serialize_order(order)}, status=status.HTTP_201_CREATED)


def _change_order_status(request, order_id_str, new_status, extra_fields, note):
    try:
        order = Order.objects.prefetch_related("items", "status_history").get(order_id=order_id_str)
    except Order.DoesNotExist:
        return Response({"error": "Order tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    actor_id = request.data.get("actorId", "")
    actor_role = request.data.get("actorRole", "admin")
    now = _now()

    with transaction.atomic():
        order.status = new_status
        order.updated_at = now
        for field, value in extra_fields.items():
            setattr(order, field, value)
        order.save()
        OrderStatusHistory.objects.create(
            order=order,
            history_id=str(uuid.uuid4()),
            status=new_status,
            actor_id=actor_id,
            actor_role=actor_role,
            note=note,
            created_at=now,
        )
        _log_activity(
            actor_id=actor_id,
            actor_role=actor_role,
            event_type=ORDER_EVENT_TYPES.get(new_status, "order_updated"),
            label=f"{ORDER_STATUS_LABELS.get(new_status, 'Order updated')}: {order_id_str}",
            metadata={"entityType": "order", "entityId": order_id_str, "orderId": order_id_str, "toStatus": new_status},
        )

    order.refresh_from_db()
    return Response({"order": _serialize_order(order)})


@api_view(["PATCH"])
def approve_order(request, order_id):
    return _change_order_status(request, order_id, "packing", {"cancel_deadline_ts": None}, "Payment approved by admin.")


@api_view(["PATCH"])
def reject_order(request, order_id):
    return _change_order_status(
        request, order_id, "rejected",
        {"rejection_reason": request.data.get("reason", ""), "cancel_deadline_ts": None},
        "Payment rejected by admin.",
    )


@api_view(["PATCH"])
def ship_order(request, order_id):
    return _change_order_status(
        request, order_id, "shipped",
        {"courier": request.data.get("courier", ""), "tracking_number": request.data.get("trackingNumber", "")},
        "Order marked as shipped by admin.",
    )


@api_view(["PATCH"])
def deliver_order(request, order_id):
    return _change_order_status(
        request, order_id, "delivered",
        {"delivery_proof": request.data.get("deliveryProof")},
        "Order marked as delivered by admin.",
    )


@api_view(["PATCH"])
def cancel_order(request, order_id):
    return _change_order_status(
        request, order_id, "cancelled",
        {"cancel_reason": request.data.get("reason", ""), "cancel_deadline_ts": None},
        "Order cancelled by customer.",
    )


# ── Returns ────────────────────────────────────────────────────

@api_view(["POST"])
def create_return(request):
    data = request.data
    now = _now()
    return_id = data.get("id") or f"RET-{uuid.uuid4().hex[:8].upper()}"
    created_at = _dt(data.get("createdAt")) or now

    with transaction.atomic():
        ret = ReturnRequest.objects.create(
            return_id=return_id,
            order_id=data.get("orderId", ""),
            customer_id=data.get("customerId", ""),
            customer=data.get("customer", ""),
            email=data.get("email", ""),
            date=data.get("date", ""),
            reason=data.get("reason", ""),
            status=data.get("status", "pending"),
            monitoring_flag=data.get("monitoringFlag"),
            condition_note=data.get("conditionNote", ""),
            photos=data.get("photos") or [],
            receipt_b64=data.get("receiptB64"),
            product_photo_b64=data.get("productPhotoB64"),
            qr_code=data.get("qrCode", "-"),
            scanned_qr=data.get("scannedQr", "-"),
            qr_status=data.get("qrStatus"),
            total=data.get("total", 0),
            session_snapshot=data.get("sessionSnapshot") or {},
            risk_summary=data.get("riskSummary"),
            created_at=created_at,
            updated_at=created_at,
        )
        for p in data.get("products", []):
            ReturnProduct.objects.create(
                return_request=ret,
                name=p.get("name", ""),
                qty=p.get("qty", 1),
                price=p.get("price", 0),
                image=p.get("image", ""),
            )
        ReturnStatusHistory.objects.create(
            return_request=ret,
            history_id=str(uuid.uuid4()),
            status="pending",
            actor_id=data.get("customerId", ""),
            actor_role="customer",
            note="Return request submitted by customer.",
            created_at=created_at,
        )
        _log_activity(
            actor_id=data.get("customerId"),
            actor_role="customer",
            event_type="return_requested",
            label=f"Return requested: {return_id}",
            metadata={"entityType": "return", "entityId": return_id, "orderId": data.get("orderId", "")},
        )
        if data.get("receiptB64") or (data.get("photos") and len(data.get("photos", [])) > 0):
            _log_activity(
                actor_id=data.get("customerId"),
                actor_role="customer",
                event_type="return_evidence_uploaded",
                label=f"Return evidence uploaded for {return_id}",
                metadata={"entityType": "return", "entityId": return_id, "orderId": data.get("orderId", "")},
            )

    ret.refresh_from_db()
    return Response({"return": _serialize_return(ret)}, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def update_return(request, return_id):
    try:
        ret = ReturnRequest.objects.prefetch_related("products", "status_history").get(return_id=return_id)
    except ReturnRequest.DoesNotExist:
        return Response({"error": "Return tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    actor_id = data.get("actorId", "")
    actor_role = data.get("actorRole", "admin")
    now = _now()
    old_status = ret.status
    new_status = data.get("status", old_status)
    status_changed = new_status != old_status

    with transaction.atomic():
        for field, db_field in [("status", "status"), ("qrStatus", "qr_status"), ("scannedQr", "scanned_qr"), ("monitoringFlag", "monitoring_flag"), ("conditionNote", "condition_note"), ("qrCode", "qr_code")]:
            if field in data:
                setattr(ret, db_field, data[field])
        ret.updated_at = now
        ret.save()

        if status_changed:
            ReturnStatusHistory.objects.create(
                return_request=ret,
                history_id=str(uuid.uuid4()),
                status=new_status,
                actor_id=actor_id,
                actor_role=actor_role,
                note=RETURN_STATUS_LABELS.get(new_status, "Return status updated"),
                created_at=now,
            )
            _log_activity(
                actor_id=actor_id,
                actor_role=actor_role,
                event_type=RETURN_EVENT_TYPES.get(new_status, "return_updated"),
                label=f"{RETURN_STATUS_LABELS.get(new_status, 'Return updated')}: {return_id}",
                metadata={"entityType": "return", "entityId": return_id, "orderId": ret.order_id, "fromStatus": old_status, "toStatus": new_status},
            )

        if data.get("qrStatus") == "invalid":
            if not ret.monitoring_flag:
                ret.monitoring_flag = "QR verification mismatch"
                ret.save(update_fields=["monitoring_flag"])
            MonitoringFlag.objects.update_or_create(
                flag_id=f"FLAG-QR-{return_id}",
                defaults={
                    "entity_type": "return", "entity_id": return_id,
                    "rule_code": "RISK-QR-MISMATCH", "title": "QR Verification Failed",
                    "severity": "high", "status": "open",
                    "reason": "Return package QR does not match the order record.",
                    "created_at": now, "trigger_count": 1, "last_triggered_at": now,
                },
            )
            _log_activity(
                actor_id=actor_id, actor_role=actor_role,
                event_type="risk_flag_created", label="Flag created: QR Verification Failed",
                metadata={"entityType": "return", "entityId": return_id, "ruleCode": "RISK-QR-MISMATCH"},
            )

        if data.get("qrStatus") == "valid":
            _log_activity(
                actor_id=actor_id, actor_role=actor_role,
                event_type="qr_verified", label=f"QR verification passed for {return_id}",
                metadata={"entityType": "return", "entityId": return_id, "orderId": ret.order_id},
            )

        if data.get("monitoringFlag") == "E-receipt tidak cocok":
            MonitoringFlag.objects.update_or_create(
                flag_id=f"FLAG-RECEIPT-{return_id}",
                defaults={
                    "entity_type": "return", "entity_id": return_id,
                    "rule_code": "RISK-RECEIPT-MISMATCH", "title": "E-Receipt Verification Failed",
                    "severity": "high", "status": "open",
                    "reason": "E-receipt submitted by customer does not match the order record.",
                    "created_at": now, "trigger_count": 1, "last_triggered_at": now,
                },
            )
            _log_activity(
                actor_id=actor_id, actor_role=actor_role,
                event_type="risk_flag_created", label="Flag created: E-Receipt Verification Failed",
                metadata={"entityType": "return", "entityId": return_id, "ruleCode": "RISK-RECEIPT-MISMATCH"},
            )

    ret.refresh_from_db()
    return Response({"return": _serialize_return(ret)})


# ── Monitoring flags ───────────────────────────────────────────

@api_view(["POST"])
def create_flag(request):
    data = request.data
    now = _now()
    actor_id = data.get("actorId", "")
    actor_role = data.get("actorRole", "system")

    existing = MonitoringFlag.objects.filter(
        entity_type=data.get("entityType", ""),
        entity_id=data.get("entityId", ""),
        rule_code=data.get("ruleCode", ""),
        status__in=["open", "reviewed"],
    ).first()

    if existing:
        from django.db.models import F
        existing.trigger_count = F("trigger_count") + 1
        existing.last_triggered_at = now
        existing.title = data.get("title", existing.title)
        existing.reason = data.get("reason", existing.reason)
        existing.save()
        existing.refresh_from_db()
        return Response({"flag": _serialize_flag(existing)})

    flag_id = data.get("id") or f"FLAG-{uuid.uuid4().hex[:12].upper()}"
    flag = MonitoringFlag.objects.create(
        flag_id=flag_id,
        entity_type=data.get("entityType", ""),
        entity_id=data.get("entityId", ""),
        rule_code=data.get("ruleCode", "RISK-GENERIC"),
        title=data.get("title", "Risk flag"),
        severity=data.get("severity", "low"),
        status="open",
        reason=data.get("reason", ""),
        created_at=now,
        trigger_count=1,
        last_triggered_at=now,
    )
    _log_activity(
        actor_id=actor_id, actor_role=actor_role,
        event_type="risk_flag_created", label=f"Flag created: {flag.title}",
        metadata={"entityType": flag.entity_type, "entityId": flag.entity_id, "ruleCode": flag.rule_code, "flagId": flag.flag_id},
    )
    return Response({"flag": _serialize_flag(flag)}, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def resolve_flag(request, flag_id):
    try:
        flag = MonitoringFlag.objects.get(flag_id=flag_id)
    except MonitoringFlag.DoesNotExist:
        return Response({"error": "Flag tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
    now = _now()
    flag.status = "resolved"
    flag.resolved_at = now
    flag.save(update_fields=["status", "resolved_at"])
    _log_activity(
        actor_id=request.data.get("actorId", ""), actor_role=request.data.get("actorRole", "admin"),
        event_type="flag_resolved", label=f"Flag resolved: {flag.title}",
        metadata={"flagId": flag.flag_id, "entityType": flag.entity_type, "entityId": flag.entity_id},
    )
    return Response({"flag": _serialize_flag(flag)})


@api_view(["PATCH"])
def review_flag(request, flag_id):
    try:
        flag = MonitoringFlag.objects.get(flag_id=flag_id)
    except MonitoringFlag.DoesNotExist:
        return Response({"error": "Flag tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
    now = _now()
    flag.status = "reviewed"
    flag.reviewed_at = now
    flag.save(update_fields=["status", "reviewed_at"])
    _log_activity(
        actor_id=request.data.get("actorId", ""), actor_role=request.data.get("actorRole", "admin"),
        event_type="flag_reviewed", label=f"Flag reviewed: {flag.title}",
        metadata={"flagId": flag.flag_id, "entityType": flag.entity_type, "entityId": flag.entity_id},
    )
    return Response({"flag": _serialize_flag(flag)})


# ── Timeline ───────────────────────────────────────────────────

@api_view(["POST"])
def add_timeline_event(request):
    data = request.data
    event_id = data.get("id") or str(uuid.uuid4())
    event = ActivityTimeline.objects.create(
        event_id=event_id,
        actor_id=data.get("actorId"),
        actor_role=data.get("actorRole"),
        event_type=data.get("eventType", "system_event"),
        label=data.get("label", ""),
        timestamp=_dt(data.get("timestamp")) or _now(),
        metadata=data.get("metadata") or {},
    )
    return Response({"event": _serialize_timeline(event)}, status=status.HTTP_201_CREATED)


# ── Auth ───────────────────────────────────────────────────────

@api_view(["POST"])
def logout(request):
    user_id = request.data.get("userId", "")
    user_role = request.data.get("userRole", "customer")
    email = request.data.get("email", "")
    _log_activity(
        actor_id=user_id or None, actor_role=user_role,
        event_type="logout",
        label=f"Logout: {email}" if email else "User logged out",
        metadata={"email": email} if email else {},
    )
    return Response({"ok": True})


# ── Trusted devices ────────────────────────────────────────────

@api_view(["POST"])
def trust_device(request):
    data = request.data
    now = _now()
    user_id = data.get("userId", "")
    device_id = data.get("id") or f"DEV-{uuid.uuid4().hex[:8].upper()}"

    device, _ = TrustedDevice.objects.update_or_create(
        device_id=device_id,
        defaults={
            "user_id": user_id,
            "device_token": data.get("deviceToken", ""),
            "fingerprint_hash": data.get("fingerprintHash", ""),
            "device_label": data.get("deviceLabel", "Browser session"),
            "user_agent": data.get("userAgent", ""),
            "first_seen_ip": data.get("firstSeenIp", ""),
            "last_seen_ip": data.get("lastSeenIp", ""),
            "trusted_status": "trusted",
            "fingerprint_similarity": data.get("fingerprintSimilarity", 95),
            "subnet_similarity": data.get("subnetSimilarity", 90),
            "user_agent_match": data.get("userAgentMatch", True),
            "first_seen_at": now,
            "last_seen_at": now,
            "last_verification_at": now,
        },
    )
    _log_activity(
        actor_id=user_id, actor_role=None,
        event_type="device_trusted", label=f"Trusted device added: {device.device_label}",
        metadata={"deviceId": device.device_id, "deviceToken": device.device_token},
    )
    return Response({"device": _serialize_trusted_device(device)}, status=status.HTTP_201_CREATED)


# ── Addresses ──────────────────────────────────────────────────

def _serialize_address(a):
    return {
        "id":           str(a.id),
        "userId":       a.user_id,
        "label":        a.label,
        "name":         a.receiver_name,
        "phone":        a.phone,
        "address":      a.address,
        "isMain":       a.is_primary,
        "created_at":   a.created_at.isoformat(),
    }


@api_view(["GET", "POST"])
def address_list(request):
    user_id = request.query_params.get("userId") or request.data.get("userId", "")
    if not user_id:
        return Response({"error": "userId diperlukan"}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == "GET":
        addresses = Address.objects.filter(user_id=user_id).order_by("-is_primary", "created_at")
        return Response({"addresses": [_serialize_address(a) for a in addresses]})

    # POST — create new address
    data = request.data
    is_first = not Address.objects.filter(user_id=user_id).exists()
    addr = Address.objects.create(
        user_id=user_id,
        label=data.get("label", ""),
        receiver_name=data.get("receiver_name", ""),
        phone=data.get("phone", ""),
        address=data.get("address", ""),
        is_primary=is_first,
    )
    return Response({"address": _serialize_address(addr)}, status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
def address_detail(request, address_id):
    user_id = request.query_params.get("userId") or request.data.get("userId", "")
    try:
        addr = Address.objects.get(id=address_id, user_id=user_id)
    except Address.DoesNotExist:
        return Response({"error": "Alamat tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        was_primary = addr.is_primary
        addr.delete()
        if was_primary:
            first = Address.objects.filter(user_id=user_id).order_by("created_at").first()
            if first:
                first.is_primary = True
                first.save(update_fields=["is_primary"])
        return Response({"ok": True})

    # PATCH — update fields
    data = request.data
    if "label"         in data: addr.label         = data["label"]
    if "receiver_name" in data: addr.receiver_name = data["receiver_name"]
    if "phone"         in data: addr.phone         = data["phone"]
    if "address"       in data: addr.address       = data["address"]
    addr.save()
    return Response({"address": _serialize_address(addr)})


@api_view(["PATCH"])
def address_set_primary(request, address_id):
    user_id = request.query_params.get("userId") or request.data.get("userId", "")
    if not user_id:
        return Response({"error": "userId diperlukan"}, status=status.HTTP_400_BAD_REQUEST)
    Address.objects.filter(user_id=user_id).update(is_primary=False)
    try:
        addr = Address.objects.get(id=address_id, user_id=user_id)
    except Address.DoesNotExist:
        return Response({"error": "Alamat tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
    addr.is_primary = True
    addr.save(update_fields=["is_primary"])
    return Response({"address": _serialize_address(addr)})
