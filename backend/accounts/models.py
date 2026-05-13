import uuid as _uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email wajib diisi")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", "admin")
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser):
    ROLE_CHOICES = [("admin", "Admin"), ("customer", "Customer")]
    STATUS_CHOICES = [("active", "Active"), ("locked", "Locked"), ("inactive", "Inactive")]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True, default="")
    location = models.CharField(max_length=100, blank=True, default="Indonesia")
    postal_code = models.CharField(max_length=10, blank=True, default="")
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="customer")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    two_factor_enabled = models.BooleanField(default=False)
    failed_login_count = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    avatar = models.TextField(null=True, blank=True)
    user_code = models.CharField(max_length=20, blank=True, default="")

    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "users"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.user_code:
            self.user_code = f"USR-{self.pk:03d}"
            type(self).objects.filter(pk=self.pk).update(user_code=self.user_code)

    def __str__(self):
        return f"{self.email} ({self.role})"


# ── Store models ───────────────────────────────────────────────

class Product(models.Model):
    product_id = models.CharField(max_length=30, unique=True)
    brand      = models.CharField(max_length=100)
    name       = models.CharField(max_length=200)
    category   = models.CharField(max_length=50)
    price      = models.BigIntegerField(default=0)
    image      = models.TextField(blank=True, default="")
    desc       = models.TextField(blank=True, default="")
    qr_code    = models.CharField(max_length=50, blank=True, default="")
    bestseller = models.BooleanField(default=False)
    is_active  = models.BooleanField(default=True)

    class Meta:
        db_table = "products"

    def __str__(self):
        return f"{self.brand} — {self.name}"


class Review(models.Model):
    review_id  = models.CharField(max_length=30, unique=True)
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="product_reviews", to_field="product_id")
    user_id    = models.CharField(max_length=30)
    order_id   = models.CharField(max_length=30, blank=True, default="")
    rating     = models.IntegerField()  # 1–5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reviews"
        unique_together = [("product", "user_id", "order_id")]

    def __str__(self):
        return f"{self.user_id} → {self.product_id} ({self.rating}★)"


class Order(models.Model):
    order_id   = models.CharField(max_length=30, unique=True)
    status     = models.CharField(max_length=20)
    customer   = models.CharField(max_length=150)
    customer_id = models.CharField(max_length=30, blank=True, default="")
    email      = models.CharField(max_length=254, blank=True, default="")
    date       = models.CharField(max_length=50, blank=True, default="")
    subtotal   = models.BigIntegerField(default=0)
    delivery_fee = models.BigIntegerField(default=0)
    total      = models.BigIntegerField(default=0)
    payment    = models.CharField(max_length=100, blank=True, default="")
    payment_account = models.CharField(max_length=100, blank=True, default="")
    recipient  = models.CharField(max_length=150, blank=True, default="")
    phone      = models.CharField(max_length=30, blank=True, default="")
    address    = models.TextField(blank=True, default="")
    payment_proof    = models.TextField(null=True, blank=True)
    delivery_proof   = models.TextField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)
    cancel_reason    = models.TextField(null=True, blank=True)
    tracking_number  = models.CharField(max_length=100, null=True, blank=True)
    courier          = models.CharField(max_length=100, null=True, blank=True)
    cancel_deadline_ts = models.BigIntegerField(null=True, blank=True)
    session_snapshot = models.JSONField(default=dict)
    risk_summary     = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "orders"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    name  = models.CharField(max_length=200)
    qty   = models.IntegerField(default=1)
    price = models.BigIntegerField(default=0)
    image = models.TextField(blank=True, default="")

    class Meta:
        db_table = "order_items"


class OrderStatusHistory(models.Model):
    order      = models.ForeignKey(Order, related_name="status_history", on_delete=models.CASCADE)
    history_id = models.CharField(max_length=60)
    status     = models.CharField(max_length=20)
    actor_id   = models.CharField(max_length=30, null=True, blank=True)
    actor_role = models.CharField(max_length=20, null=True, blank=True)
    note       = models.TextField(blank=True, default="")
    created_at = models.DateTimeField()

    class Meta:
        db_table = "order_status_history"


class ReturnRequest(models.Model):
    return_id   = models.CharField(max_length=30, unique=True)
    order_id    = models.CharField(max_length=30, blank=True, default="")
    customer_id = models.CharField(max_length=30, blank=True, default="")
    customer    = models.CharField(max_length=150)
    email       = models.CharField(max_length=254, blank=True, default="")
    date        = models.CharField(max_length=50, blank=True, default="")
    reason      = models.TextField(blank=True, default="")
    status      = models.CharField(max_length=20)
    monitoring_flag    = models.CharField(max_length=200, null=True, blank=True)
    condition_note     = models.TextField(blank=True, default="")
    photos             = models.JSONField(default=list)
    receipt_b64        = models.TextField(null=True, blank=True)
    product_photo_b64  = models.TextField(null=True, blank=True)
    qr_code    = models.CharField(max_length=100, blank=True, default="")
    scanned_qr = models.CharField(max_length=100, null=True, blank=True)
    qr_status  = models.CharField(max_length=20, null=True, blank=True)
    total      = models.BigIntegerField(default=0)
    session_snapshot = models.JSONField(default=dict)
    risk_summary     = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "return_requests"


class ReturnProduct(models.Model):
    return_request = models.ForeignKey(ReturnRequest, related_name="products", on_delete=models.CASCADE)
    name  = models.CharField(max_length=200)
    qty   = models.IntegerField(default=1)
    price = models.BigIntegerField(default=0)
    image = models.TextField(blank=True, default="")

    class Meta:
        db_table = "return_products"


class ReturnStatusHistory(models.Model):
    return_request = models.ForeignKey(ReturnRequest, related_name="status_history", on_delete=models.CASCADE)
    history_id = models.CharField(max_length=60)
    status     = models.CharField(max_length=20)
    actor_id   = models.CharField(max_length=30, null=True, blank=True)
    actor_role = models.CharField(max_length=20, null=True, blank=True)
    note       = models.TextField(blank=True, default="")
    created_at = models.DateTimeField()

    class Meta:
        db_table = "return_status_history"


class LoginAttempt(models.Model):
    attempt_id         = models.CharField(max_length=60, unique=True)
    user_id            = models.CharField(max_length=30, blank=True, default="")
    email              = models.CharField(max_length=254)
    role               = models.CharField(max_length=20, blank=True, default="")
    success            = models.BooleanField(default=False)
    timestamp          = models.DateTimeField()
    ip_address         = models.CharField(max_length=50, blank=True, default="")
    user_agent         = models.TextField(blank=True, default="")
    device_fingerprint = models.CharField(max_length=100, blank=True, default="")
    reason             = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = "login_attempts"


class TrustedDevice(models.Model):
    device_id              = models.CharField(max_length=60, unique=True)
    user_id                = models.CharField(max_length=30)
    device_token           = models.CharField(max_length=100)
    fingerprint_hash       = models.CharField(max_length=100)
    device_label           = models.CharField(max_length=200)
    user_agent             = models.TextField(blank=True, default="")
    first_seen_ip          = models.CharField(max_length=50, blank=True, default="")
    last_seen_ip           = models.CharField(max_length=50, blank=True, default="")
    trusted_status         = models.CharField(max_length=20, default="trusted")
    fingerprint_similarity = models.IntegerField(default=0)
    subnet_similarity      = models.IntegerField(default=0)
    user_agent_match       = models.BooleanField(default=False)
    first_seen_at          = models.DateTimeField()
    last_seen_at           = models.DateTimeField()
    last_verification_at   = models.DateTimeField()

    class Meta:
        db_table = "trusted_devices"


class MonitoringFlag(models.Model):
    flag_id           = models.CharField(max_length=60, unique=True)
    entity_type       = models.CharField(max_length=20)
    entity_id         = models.CharField(max_length=60)
    rule_code         = models.CharField(max_length=30)
    title             = models.CharField(max_length=200)
    severity          = models.CharField(max_length=10)
    status            = models.CharField(max_length=20, default="open")
    reason            = models.TextField(blank=True, default="")
    created_at        = models.DateTimeField()
    reviewed_at       = models.DateTimeField(null=True, blank=True)
    resolved_at       = models.DateTimeField(null=True, blank=True)
    trigger_count     = models.IntegerField(default=1)
    last_triggered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "monitoring_flags"


class ActivityTimeline(models.Model):
    event_id   = models.CharField(max_length=60, unique=True)
    actor_id   = models.CharField(max_length=30, null=True, blank=True)
    actor_role = models.CharField(max_length=20, null=True, blank=True)
    event_type = models.CharField(max_length=50)
    label      = models.TextField()
    timestamp  = models.DateTimeField()
    metadata   = models.JSONField(default=dict)

    class Meta:
        db_table = "activity_timeline"
        ordering = ["-timestamp"]


class OtpSession(models.Model):
    session_id  = models.CharField(max_length=60, unique=True)
    user_id     = models.CharField(max_length=30)
    purpose     = models.CharField(max_length=30, default="login")
    attempts    = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    is_expired  = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    expires_at  = models.DateTimeField()
    metadata    = models.JSONField(default=dict)

    class Meta:
        db_table = "otp_sessions"


class Address(models.Model):
    id            = models.UUIDField(primary_key=True, default=_uuid.uuid4)
    user_id       = models.TextField()
    label         = models.TextField()
    receiver_name = models.TextField()
    phone         = models.TextField()
    address       = models.TextField()
    is_primary    = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "addresses"
        managed  = False
