from django.db import migrations


_ALTER_STMTS = [
    # users
    "ALTER TABLE users ALTER COLUMN created_at TYPE timestamp without time zone",
    # orders
    "ALTER TABLE orders ALTER COLUMN created_at TYPE timestamp without time zone",
    "ALTER TABLE orders ALTER COLUMN updated_at TYPE timestamp without time zone",
    # order_status_history
    "ALTER TABLE order_status_history ALTER COLUMN created_at TYPE timestamp without time zone",
    # return_requests
    "ALTER TABLE return_requests ALTER COLUMN created_at TYPE timestamp without time zone",
    "ALTER TABLE return_requests ALTER COLUMN updated_at TYPE timestamp without time zone",
    # return_status_history
    "ALTER TABLE return_status_history ALTER COLUMN created_at TYPE timestamp without time zone",
    # login_attempts
    "ALTER TABLE login_attempts ALTER COLUMN timestamp TYPE timestamp without time zone",
    # trusted_devices
    "ALTER TABLE trusted_devices ALTER COLUMN first_seen_at TYPE timestamp without time zone",
    "ALTER TABLE trusted_devices ALTER COLUMN last_seen_at TYPE timestamp without time zone",
    "ALTER TABLE trusted_devices ALTER COLUMN last_verification_at TYPE timestamp without time zone",
    # monitoring_flags
    "ALTER TABLE monitoring_flags ALTER COLUMN created_at TYPE timestamp without time zone",
    "ALTER TABLE monitoring_flags ALTER COLUMN reviewed_at TYPE timestamp without time zone",
    "ALTER TABLE monitoring_flags ALTER COLUMN resolved_at TYPE timestamp without time zone",
    "ALTER TABLE monitoring_flags ALTER COLUMN last_triggered_at TYPE timestamp without time zone",
    # activity_timeline
    "ALTER TABLE activity_timeline ALTER COLUMN timestamp TYPE timestamp without time zone",
    # otp_sessions
    "ALTER TABLE otp_sessions ALTER COLUMN created_at TYPE timestamp without time zone",
    "ALTER TABLE otp_sessions ALTER COLUMN expires_at TYPE timestamp without time zone",
]


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_otpsession_add_metadata"),
    ]

    operations = [
        migrations.RunSQL(sql=sql, reverse_sql=migrations.RunSQL.noop)
        for sql in _ALTER_STMTS
    ]
