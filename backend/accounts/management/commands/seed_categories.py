from django.core.management.base import BaseCommand
from accounts.models import Category

CATEGORIES = [
    dict(
        name="Skincare",
        label="Glow",
        desc="Cleansers, toners, serums & moisturizers",
        image="https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&h=450&q=80",
        display_order=1,
    ),
    dict(
        name="Makeup",
        label="Tint",
        desc="Easy everyday picks for lips, base & more",
        image="https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&h=450&q=80",
        display_order=2,
    ),
    dict(
        name="Tools",
        label="Tools",
        desc="Brushes, sponges & skincare devices",
        image="https://images.unsplash.com/photo-1522335789-8b3af9c8f853?auto=format&fit=crop&w=600&h=450&q=80",
        display_order=3,
    ),
    dict(
        name="Body Care",
        label="Body",
        desc="Body wash, scrubs & everything in between",
        image="https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=600&h=450&q=80",
        display_order=4,
    ),
]


class Command(BaseCommand):
    help = "Seed product categories into the database"

    def handle(self, *args, **options):
        created = updated = 0
        for c in CATEGORIES:
            _, is_new = Category.objects.update_or_create(
                name=c["name"],
                defaults={k: v for k, v in c.items() if k != "name"},
            )
            if is_new:
                created += 1
            else:
                updated += 1
        self.stdout.write(self.style.SUCCESS(
            f"Done. {created} created, {updated} updated. Total: {Category.objects.count()}"
        ))
