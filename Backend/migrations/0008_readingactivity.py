from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("Backend", "0007_sharedbookremovalrequest_opened_at_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReadingActivity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("pages_read", models.PositiveIntegerField(default=0, verbose_name="páginas avançadas")),
                ("books_completed", models.PositiveSmallIntegerField(default=0, verbose_name="livros concluídos")),
                ("recorded_at", models.DateTimeField(default=django.utils.timezone.now, verbose_name="registrado em")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reading_activities", to="Backend.book", verbose_name="livro")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reading_activities", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
            options={
                "verbose_name": "atividade de leitura",
                "verbose_name_plural": "atividades de leitura",
                "ordering": ["-recorded_at"],
            },
        ),
        migrations.AddIndex(
            model_name="readingactivity",
            index=models.Index(fields=["user", "recorded_at"], name="reading_activity_user_date_idx"),
        ),
    ]
