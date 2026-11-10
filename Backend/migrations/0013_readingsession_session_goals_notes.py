from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("Backend", "0012_libraryentry_position")]

    operations = [
        migrations.AddField(
            model_name="readingsession",
            name="target_minutes",
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="meta de tempo da sessão"),
        ),
        migrations.AddField(
            model_name="readingsession",
            name="target_pages",
            field=models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="meta de páginas da sessão"),
        ),
        migrations.AddField(
            model_name="readingsession",
            name="chapter_notes",
            field=models.TextField(blank=True, default="", verbose_name="anotações de capítulos"),
        ),
        migrations.AddField(
            model_name="readingsession",
            name="page_notes",
            field=models.TextField(blank=True, default="", verbose_name="anotações de páginas"),
        ),
    ]
