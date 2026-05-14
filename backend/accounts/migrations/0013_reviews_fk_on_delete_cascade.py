from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0012_add_category_page_limit"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            ALTER TABLE reviews
            DROP CONSTRAINT IF EXISTS reviews_product_id_d4b78cfe_fk_products_product_id;

            ALTER TABLE reviews
            ADD CONSTRAINT reviews_product_id_fk_products_product_id
            FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE;
            """,
            reverse_sql="""
            ALTER TABLE reviews
            DROP CONSTRAINT IF EXISTS reviews_product_id_fk_products_product_id;

            ALTER TABLE reviews
            ADD CONSTRAINT reviews_product_id_d4b78cfe_fk_products_product_id
            FOREIGN KEY (product_id) REFERENCES products(product_id) DEFERRABLE INITIALLY DEFERRED;
            """,
        )
    ]
