# Generated manually to match the current Backend models.
import django.contrib.auth.models
import django.contrib.auth.validators
import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="Book",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255, verbose_name="título")),
                ("author", models.CharField(max_length=255, verbose_name="autor")),
                ("synopsis", models.TextField(blank=True, verbose_name="sinopse")),
                ("cover_url", models.URLField(blank=True, verbose_name="URL da capa")),
                ("publication_date", models.DateField(blank=True, null=True, verbose_name="data de publicação")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="cadastrado em")),
            ],
            options={
                "verbose_name": "livro",
                "verbose_name_plural": "livros",
                "ordering": ["title", "author"],
                "indexes": [models.Index(fields=["title", "author"], name="Backend_boo_title_a_0cd249_idx")],
                "constraints": [models.UniqueConstraint(Lower("title"), Lower("author"), name="unique_book_title_author_ci")],
            },
        ),
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False, help_text="Designates that this user has all permissions without explicitly assigning them.", verbose_name="superuser status")),
                ("username", models.CharField(error_messages={"unique": "A user with that username already exists."}, help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.", max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name="username")),
                ("first_name", models.CharField(blank=True, max_length=150, verbose_name="first name")),
                ("last_name", models.CharField(blank=True, max_length=150, verbose_name="last name")),
                ("email", models.EmailField(max_length=254, unique=True, verbose_name="email address")),
                ("is_staff", models.BooleanField(default=False, help_text="Designates whether the user can log into this admin site.", verbose_name="staff status")),
                ("is_active", models.BooleanField(default=True, help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.", verbose_name="active")),
                ("date_joined", models.DateTimeField(default=django.utils.timezone.now, verbose_name="date joined")),
                ("groups", models.ManyToManyField(blank=True, help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.", related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("user_permissions", models.ManyToManyField(blank=True, help_text="Specific permissions for this user.", related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
            ],
            options={
                "verbose_name": "usuário",
                "verbose_name_plural": "usuários",
            },
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.CreateModel(
            name="TrendingBook",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("position", models.PositiveIntegerField(default=0, verbose_name="posição")),
                ("featured_at", models.DateTimeField(default=django.utils.timezone.now, verbose_name="adicionado aos destaques")),
                ("book", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="trending_entry", to="Backend.book", verbose_name="livro")),
            ],
            options={
                "verbose_name": "livro em tendência",
                "verbose_name_plural": "livros em tendência",
                "ordering": ["position", "-featured_at"],
            },
        ),
        migrations.CreateModel(
            name="LibraryEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("WISHLIST", "Desejado"), ("READ", "Lido")], max_length=8, verbose_name="status")),
                ("added_at", models.DateTimeField(default=django.utils.timezone.now, editable=False, verbose_name="adicionado em")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="library_entries", to="Backend.book", verbose_name="livro")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="library_entries", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
            options={
                "verbose_name": "livro na biblioteca",
                "verbose_name_plural": "livros na biblioteca",
                "ordering": ["-added_at"],
                "constraints": [models.UniqueConstraint(fields=("user", "book"), name="unique_user_library_book")],
            },
        ),
        migrations.CreateModel(
            name="Review",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rating", models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)], verbose_name="nota")),
                ("comment", models.TextField(blank=True, verbose_name="comentário")),
                ("reviewed_at", models.DateTimeField(default=django.utils.timezone.now, editable=False, verbose_name="avaliado em")),
                ("book", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reviews", to="Backend.book", verbose_name="livro")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reviews", to=settings.AUTH_USER_MODEL, verbose_name="usuário")),
            ],
            options={
                "verbose_name": "avaliação",
                "verbose_name_plural": "avaliações",
                "ordering": ["-reviewed_at"],
                "constraints": [
                    models.UniqueConstraint(fields=("user", "book"), name="unique_user_book_review"),
                    models.CheckConstraint(condition=models.Q(("rating__gte", 1), ("rating__lte", 5)), name="review_rating_between_1_and_5"),
                ],
            },
        ),
    ]
