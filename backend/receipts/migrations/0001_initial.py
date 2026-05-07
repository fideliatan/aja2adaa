from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="EReceipt",
            fields=[
                ("id",             models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("receipt_id",     models.CharField(blank=True, default="", max_length=30, unique=True)),
                ("order_id",       models.CharField(max_length=30)),
                ("customer_name",  models.CharField(blank=True, default="", max_length=150)),
                ("customer_email", models.CharField(blank=True, default="", max_length=254)),
                ("total",          models.BigIntegerField(default=0)),
                ("signature_hash", models.CharField(max_length=64)),
                ("generated_at",   models.DateTimeField()),
                ("pdf_b64",        models.TextField()),
                ("is_revoked",     models.BooleanField(default=False)),
            ],
            options={"db_table": "e_receipts"},
        ),
        migrations.CreateModel(
            name="ReceiptVerification",
            fields=[
                ("id",              models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("verification_id", models.CharField(blank=True, default="", max_length=30, unique=True)),
                ("order_id",        models.CharField(blank=True, default="", max_length=30)),
                ("customer_name",   models.CharField(blank=True, default="", max_length=150)),
                ("customer_email",  models.CharField(blank=True, default="", max_length=254)),
                ("result",          models.CharField(max_length=10)),
                ("verified_by",     models.CharField(blank=True, default="admin", max_length=30)),
                ("file_name",       models.CharField(blank=True, default="", max_length=200)),
                ("failure_reason",  models.CharField(blank=True, default="", max_length=300)),
                ("verified_at",     models.DateTimeField()),
            ],
            options={"db_table": "receipt_verifications", "ordering": ["-verified_at"]},
        ),
    ]
