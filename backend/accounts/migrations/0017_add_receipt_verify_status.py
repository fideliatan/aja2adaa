from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_add_receipt_file_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='returnrequest',
            name='receipt_verify_status',
            field=models.CharField(blank=True, max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='returnrequest',
            name='receipt_verify_reason',
            field=models.TextField(blank=True, null=True),
        ),
    ]
