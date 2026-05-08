from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_cleanup_unused_tables'),
    ]

    operations = [
        migrations.CreateModel(
            name='OtpSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(max_length=60, unique=True)),
                ('user_id', models.CharField(max_length=30)),
                ('purpose', models.CharField(default='login', max_length=30)),
                ('attempts', models.IntegerField(default=0)),
                ('is_verified', models.BooleanField(default=False)),
                ('is_expired', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
            ],
            options={
                'db_table': 'otp_sessions',
            },
        ),
    ]
