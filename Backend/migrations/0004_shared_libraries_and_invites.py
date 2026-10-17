import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Backend", "0003_book_genre_total_pages_libraryentry_pages_read"),
    ]

    operations = [
        migrations.CreateModel(
            name="SharedLibrary",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120, verbose_name="nome")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="criada em")),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="owned_shared_libraries", to=settings.AUTH_USER_MODEL, verbose_name="proprietário")),
            ],
            options={
                "verbose_name": "biblioteca compartilhada",
                "verbose_name_plural": "bibliotecas compartilhadas",
                "ordering": ["name", "created_at"],
            },
        ),
        migrations.CreateModel(
            name="SharedLibraryMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("joined_at", models.DateTimeField(auto_now_add=True, verbose_name="entrou em")),
                ("shared_library", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="Backend.sharedlibrary", verbose_name="biblioteca compartilhada")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_library_memberships", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
            options={
                "verbose_name": "participante de biblioteca compartilhada",
                "verbose_name_plural": "participantes de bibliotecas compartilhadas",
                "ordering": ["joined_at"],
                "constraints": [models.UniqueConstraint(fields=("shared_library", "user"), name="unique_shared_library_member")],
            },
        ),
        migrations.CreateModel(
            name="SharedLibraryBook",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("added_at", models.DateTimeField(auto_now_add=True, verbose_name="adicionado em")),
                ("added_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="shared_books_added", to=settings.AUTH_USER_MODEL, verbose_name="adicionado por")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_library_entries", to="Backend.book", verbose_name="livro")),
                ("shared_library", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="books", to="Backend.sharedlibrary", verbose_name="biblioteca compartilhada")),
            ],
            options={
                "verbose_name": "livro em biblioteca compartilhada",
                "verbose_name_plural": "livros em bibliotecas compartilhadas",
                "ordering": ["-added_at"],
                "constraints": [models.UniqueConstraint(fields=("shared_library", "book"), name="unique_book_per_shared_library")],
            },
        ),
        migrations.CreateModel(
            name="SharedLibraryReading",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("WANT_TO_READ", "Quero ler"), ("READING", "Lendo"), ("READ", "Lido")], default="WANT_TO_READ", max_length=12, verbose_name="status")),
                ("pages_read", models.PositiveIntegerField(default=0, verbose_name="páginas lidas")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="atualizado em")),
                ("shared_book", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reading_states", to="Backend.sharedlibrarybook", verbose_name="livro compartilhado")),
                ("shared_library", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reading_history", to="Backend.sharedlibrary", verbose_name="biblioteca compartilhada")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_reading_states", to="Backend.book", verbose_name="livro")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_reading_states", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
            options={
                "verbose_name": "progresso em livro compartilhado",
                "verbose_name_plural": "progressos em livros compartilhados",
                "ordering": ["user__username"],
                "constraints": [models.UniqueConstraint(fields=("shared_library", "user", "book"), name="unique_shared_library_reading_user_book")],
            },
        ),
        migrations.CreateModel(
            name="SharedLibraryInvitation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("PENDING", "Pendente"), ("ACCEPTED", "Aceito"), ("DECLINED", "Recusado")], default="PENDING", max_length=8, verbose_name="status")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="enviada em")),
                ("responded_at", models.DateTimeField(blank=True, null=True, verbose_name="respondida em")),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_invitations_received", to=settings.AUTH_USER_MODEL, verbose_name="destinatário")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_invitations_sent", to=settings.AUTH_USER_MODEL, verbose_name="remetente")),
                ("shared_library", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invitations", to="Backend.sharedlibrary", verbose_name="biblioteca compartilhada")),
            ],
            options={
                "verbose_name": "convite de biblioteca compartilhada",
                "verbose_name_plural": "convites de bibliotecas compartilhadas",
                "ordering": ["-created_at"],
                "constraints": [models.UniqueConstraint(condition=models.Q(("status", "PENDING")), fields=("shared_library", "recipient"), name="unique_pending_shared_library_invitation")],
            },
        ),
    ]
