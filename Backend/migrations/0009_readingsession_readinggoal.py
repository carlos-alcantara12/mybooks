from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("Backend", "0008_readingactivity"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReadingGoal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_minutes", models.PositiveSmallIntegerField(default=30, verbose_name="meta diária em minutos")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="atualizada em")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="reading_goal", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
        ),
        migrations.CreateModel(
            name="ReadingSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("started_at", models.DateTimeField(default=django.utils.timezone.now, verbose_name="iniciada em")),
                ("ended_at", models.DateTimeField(blank=True, null=True, verbose_name="encerrada em")),
                ("duration_seconds", models.PositiveIntegerField(default=0, verbose_name="duração em segundos")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reading_sessions", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
            options={
                "verbose_name": "sessão de leitura",
                "verbose_name_plural": "sessões de leitura",
                "ordering": ["-started_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="readingsession",
            constraint=models.UniqueConstraint(condition=models.Q(("ended_at__isnull", True)), fields=("user",), name="unique_open_reading_session_per_user"),
        ),
        migrations.AddIndex(
            model_name="readingsession",
            index=models.Index(fields=["user", "started_at"], name="reading_session_user_start_idx"),
        ),
    ]
