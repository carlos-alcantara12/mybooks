import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("Backend", "0004_shared_libraries_and_invites"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SharedBookRemovalRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("PENDING", "Pendente"), ("APPROVED", "Aprovado"), ("DENIED", "Recusado")], default="PENDING", max_length=8, verbose_name="status")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="solicitada em")),
                ("responded_at", models.DateTimeField(blank=True, null=True, verbose_name="respondida em")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_removal_requests", to="Backend.book", verbose_name="livro")),
                ("recipient", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="shared_book_removal_requests_received", to=settings.AUTH_USER_MODEL, verbose_name="responsável pela decisão")),
                ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_book_removal_requests_sent", to=settings.AUTH_USER_MODEL, verbose_name="solicitante")),
                ("shared_book", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="removal_requests", to="Backend.sharedlibrarybook", verbose_name="livro compartilhado")),
                ("shared_library", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="book_removal_requests", to="Backend.sharedlibrary", verbose_name="biblioteca compartilhada")),
            ],
            options={
                "verbose_name": "solicitação de remoção de livro compartilhado",
                "verbose_name_plural": "solicitações de remoção de livros compartilhados",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="sharedbookremovalrequest",
            constraint=models.UniqueConstraint(
                condition=Q(status="PENDING", shared_book__isnull=False),
                fields=("shared_book",),
                name="unique_pending_shared_book_removal_request",
            ),
        ),
    ]
