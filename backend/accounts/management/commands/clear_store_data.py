from django.core.management.base import BaseCommand
from accounts.models import (
    User,
    Order, OrderItem, OrderStatusHistory,
    ReturnRequest, ReturnProduct, ReturnStatusHistory,
    LoginAttempt, TrustedDevice,
    MonitoringFlag, ActivityTimeline, OtpSession,
)


class Command(BaseCommand):
    help = "Hapus semua data store kecuali akun admin"

    def handle(self, *args, **options):
        # Orders & related
        deleted, _ = OrderStatusHistory.objects.all().delete()
        self.stdout.write(f"  OrderStatusHistory: {deleted} deleted")
        deleted, _ = OrderItem.objects.all().delete()
        self.stdout.write(f"  OrderItem: {deleted} deleted")
        deleted, _ = Order.objects.all().delete()
        self.stdout.write(f"  Order: {deleted} deleted")

        # Returns & related
        deleted, _ = ReturnStatusHistory.objects.all().delete()
        self.stdout.write(f"  ReturnStatusHistory: {deleted} deleted")
        deleted, _ = ReturnProduct.objects.all().delete()
        self.stdout.write(f"  ReturnProduct: {deleted} deleted")
        deleted, _ = ReturnRequest.objects.all().delete()
        self.stdout.write(f"  ReturnRequest: {deleted} deleted")

        # Auth / security
        deleted, _ = OtpSession.objects.all().delete()
        self.stdout.write(f"  OtpSession: {deleted} deleted")
        deleted, _ = TrustedDevice.objects.all().delete()
        self.stdout.write(f"  TrustedDevice: {deleted} deleted")
        deleted, _ = LoginAttempt.objects.all().delete()
        self.stdout.write(f"  LoginAttempt: {deleted} deleted")

        # Monitoring
        deleted, _ = MonitoringFlag.objects.all().delete()
        self.stdout.write(f"  MonitoringFlag: {deleted} deleted")
        deleted, _ = ActivityTimeline.objects.all().delete()
        self.stdout.write(f"  ActivityTimeline: {deleted} deleted")

        # Users — keep admin only
        deleted, _ = User.objects.filter(role="customer").delete()
        self.stdout.write(f"  User (customer): {deleted} deleted")

        remaining = list(User.objects.values_list("email", flat=True))
        self.stdout.write(self.style.SUCCESS(f"\nDone. User tersisa: {remaining}"))
