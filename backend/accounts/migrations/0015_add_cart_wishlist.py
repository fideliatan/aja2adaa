from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0014_add_product_stock'),
    ]

    operations = [
        migrations.CreateModel(
            name='CartItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('user_id', models.CharField(max_length=30)),
                ('product_id', models.CharField(max_length=30)),
                ('name', models.CharField(max_length=200)),
                ('brand', models.CharField(blank=True, default='', max_length=100)),
                ('category', models.CharField(blank=True, default='', max_length=100)),
                ('price', models.BigIntegerField(default=0)),
                ('image', models.TextField(blank=True, default='')),
                ('qty', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'cart_items'},
        ),
        migrations.AddConstraint(
            model_name='cartitem',
            constraint=models.UniqueConstraint(fields=('user_id', 'product_id'), name='unique_cart_user_product'),
        ),
        migrations.CreateModel(
            name='WishlistItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('user_id', models.CharField(max_length=30)),
                ('product_id', models.CharField(max_length=30)),
                ('name', models.CharField(max_length=200)),
                ('brand', models.CharField(blank=True, default='', max_length=100)),
                ('category', models.CharField(blank=True, default='', max_length=100)),
                ('price', models.BigIntegerField(default=0)),
                ('image', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'wishlist_items'},
        ),
        migrations.AddConstraint(
            model_name='wishlistitem',
            constraint=models.UniqueConstraint(fields=('user_id', 'product_id'), name='unique_wishlist_user_product'),
        ),
    ]
