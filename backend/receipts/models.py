from django.db import models


class EReceipt(models.Model):
    receipt_id      = models.CharField(max_length=30, unique=True, blank=True, default="")
    order_id        = models.CharField(max_length=30)
    customer_name   = models.CharField(max_length=150, blank=True, default="")
    customer_email  = models.CharField(max_length=254, blank=True, default="")
    total           = models.BigIntegerField(default=0)
    signature_hash  = models.CharField(max_length=64)
    generated_at    = models.DateTimeField()
    pdf_b64         = models.TextField()
    is_revoked      = models.BooleanField(default=False)

    class Meta:
        db_table = "e_receipts"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.receipt_id:
            self.receipt_id = f"RCP-{self.pk:03d}"
            type(self).objects.filter(pk=self.pk).update(receipt_id=self.receipt_id)

    def __str__(self):
        return f"{self.receipt_id} ({self.order_id})"


class ReceiptVerification(models.Model):
    verification_id = models.CharField(max_length=30, unique=True, blank=True, default="")
    order_id        = models.CharField(max_length=30, blank=True, default="")
    pdf_order_id    = models.CharField(max_length=30, blank=True, default="")
    customer_name   = models.CharField(max_length=150, blank=True, default="")
    customer_email  = models.CharField(max_length=254, blank=True, default="")
    result          = models.CharField(max_length=10)  # "valid" | "invalid"
    verified_by     = models.CharField(max_length=30, blank=True, default="admin")
    file_name       = models.CharField(max_length=200, blank=True, default="")
    failure_reason  = models.CharField(max_length=500, blank=True, default="")
    verified_at     = models.DateTimeField()

    class Meta:
        db_table = "receipt_verifications"
        ordering = ["-verified_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.verification_id:
            self.verification_id = f"VRF-{self.pk:03d}"
            type(self).objects.filter(pk=self.pk).update(verification_id=self.verification_id)

    def __str__(self):
        return f"{self.verification_id} - {self.result}"
