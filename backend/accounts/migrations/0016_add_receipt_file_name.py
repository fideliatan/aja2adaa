from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_add_cart_wishlist'),
    ]

    operations = [
        migrations.AddField(
            model_name='returnrequest',
            name='receipt_file_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
