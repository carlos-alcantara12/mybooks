import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Backend", "0002_libraryentry_reading_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="genre",
            field=models.CharField(blank=True, max_length=100, verbose_name="gênero"),
        ),
        migrations.AddField(
            model_name="book",
            name="total_pages",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                validators=[django.core.validators.MinValueValidator(1)],
                verbose_name="total de páginas",
            ),
        ),
        migrations.AddField(
            model_name="libraryentry",
            name="pages_read",
            field=models.PositiveIntegerField(default=0, verbose_name="páginas lidas"),
        ),
    ]
