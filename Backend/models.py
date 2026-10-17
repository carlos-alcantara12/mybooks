from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.utils import timezone


class User(AbstractUser):
    """Conta de usuário do MyBooks; use AUTH_USER_MODEL = 'Backend.User'."""

    email = models.EmailField(unique=True)

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"


class Book(models.Model):
    title = models.CharField("título", max_length=255)
    author = models.CharField("autor", max_length=255)
    synopsis = models.TextField("sinopse", blank=True)
    genre = models.CharField("gênero", max_length=100, blank=True)
    total_pages = models.PositiveIntegerField(
        "total de páginas",
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
    )
    cover_url = models.URLField("URL da capa", blank=True)
    publication_date = models.DateField("data de publicação", null=True, blank=True)
    created_at = models.DateTimeField("cadastrado em", auto_now_add=True)

    class Meta:
        ordering = ["title", "author"]
        indexes = [models.Index(fields=["title", "author"])]
        constraints = [models.UniqueConstraint(Lower("title"), Lower("author"), name="unique_book_title_author_ci")]
        verbose_name = "livro"
        verbose_name_plural = "livros"

    def clean(self):
        super().clean()
        if self.title and self.author:
            duplicate = Book.objects.filter(title__iexact=self.title, author__iexact=self.author)
            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)
            if duplicate.exists():
                raise ValidationError({"title": "Este livro já existe no catálogo."})
        if self.pk:
            previous_total = Book.objects.filter(pk=self.pk).values_list("total_pages", flat=True).first()
            if previous_total != self.total_pages:
                entries = LibraryEntry.objects.filter(book_id=self.pk, pages_read__gt=0)
                shared_reading = SharedLibraryReading.objects.filter(book_id=self.pk, pages_read__gt=0)
                if self.total_pages is None:
                    if entries.exists() or shared_reading.exists():
                        raise ValidationError({"total_pages": "Não é possível remover o total de páginas após o início do progresso de leitura."})
                else:
                    if entries.filter(pages_read__gt=self.total_pages).exists() or shared_reading.filter(pages_read__gt=self.total_pages).exists():
                        raise ValidationError({"total_pages": "O total de páginas não pode ser menor que o progresso registrado."})
                    personal_completed_mismatch = entries.filter(status=LibraryEntry.Status.READ).exclude(pages_read=self.total_pages).exists()
                    shared_completed_mismatch = shared_reading.filter(status=LibraryEntry.Status.READ).exclude(pages_read=self.total_pages).exists()
                    if personal_completed_mismatch or shared_completed_mismatch:
                        raise ValidationError({"total_pages": "O total deve corresponder às páginas registradas nos livros já concluídos."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} — {self.author}"


class LibraryEntry(models.Model):
    class Status(models.TextChoices):
        WANT_TO_READ = "WANT_TO_READ", "Quero ler"
        READING = "READING", "Lendo"
        READ = "READ", "Lido"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="library_entries",
        verbose_name="usuário",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="library_entries",
        verbose_name="livro",
    )
    status = models.CharField("status", max_length=12, choices=Status.choices)
    pages_read = models.PositiveIntegerField("páginas lidas", default=0)
    added_at = models.DateTimeField("adicionado em", default=timezone.now, editable=False)

    def clean(self):
        super().clean()
        if self.user_id and self.book_id:
            duplicate = LibraryEntry.objects.filter(user_id=self.user_id, book_id=self.book_id)
            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)
            if duplicate.exists():
                raise ValidationError({"book": "Este livro já está na sua biblioteca."})
        if (
            self.user_id
            and self.book_id
            and self.status != self.Status.READ
            and Review.objects.filter(user_id=self.user_id, book_id=self.book_id).exists()
        ):
            another_personal_read = LibraryEntry.objects.filter(
                user_id=self.user_id,
                book_id=self.book_id,
                status=self.Status.READ,
            ).exclude(pk=self.pk).exists()
            shared_read = SharedLibraryReading.objects.filter(
                user_id=self.user_id,
                book_id=self.book_id,
                status=self.Status.READ,
            ).exists()
            if not (another_personal_read or shared_read):
                raise ValidationError({"status": "Remova a avaliação antes de mover o último registro lido para outra categoria."})
        if self.book_id:
            total_pages = self.book.total_pages
            if total_pages is not None and self.pages_read > total_pages:
                raise ValidationError({"pages_read": "As páginas lidas não podem ultrapassar o total do livro."})
            if self.status == self.Status.READ:
                if total_pages is None:
                    raise ValidationError({"status": "Cadastre o total de páginas antes de marcar o livro como lido."})
                if self.pages_read != total_pages:
                    raise ValidationError({"status": "Para marcar como lido, as páginas lidas devem ser iguais ao total."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="unique_user_library_book"),
        ]
        ordering = ["-added_at"]
        verbose_name = "livro na biblioteca"
        verbose_name_plural = "livros na biblioteca"

    def __str__(self):
        return f"{self.book} ({self.get_status_display()}) — {self.user}"


class ReadingActivity(models.Model):
    """Append-only record of pages read and books completed by a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_activities",
        verbose_name="usuário",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="reading_activities",
        verbose_name="livro",
    )
    pages_read = models.PositiveIntegerField("páginas avançadas", default=0)
    books_completed = models.PositiveSmallIntegerField("livros concluídos", default=0)
    recorded_at = models.DateTimeField("registrado em", default=timezone.now)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["user", "recorded_at"], name="reading_activity_user_date_idx")]
        verbose_name = "atividade de leitura"
        verbose_name_plural = "atividades de leitura"

    def __str__(self):
        return f"{self.user}: {self.pages_read} páginas em {self.book}"


class ReadingGoal(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_goal",
        verbose_name="usuário",
    )
    target_minutes = models.PositiveSmallIntegerField("meta diária em minutos", default=30)
    updated_at = models.DateTimeField("atualizada em", auto_now=True)

    def __str__(self):
        return f"Meta de {self.user}: {self.target_minutes} min/dia"


class ReadingSession(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_sessions",
        verbose_name="usuário",
    )
    started_at = models.DateTimeField("iniciada em", default=timezone.now)
    ended_at = models.DateTimeField("encerrada em", null=True, blank=True)
    duration_seconds = models.PositiveIntegerField("duração em segundos", default=0)

    class Meta:
        ordering = ["-started_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user"],
                condition=Q(ended_at__isnull=True),
                name="unique_open_reading_session_per_user",
            ),
        ]
        indexes = [models.Index(fields=["user", "started_at"], name="reading_session_user_start_idx")]
        verbose_name = "sessão de leitura"
        verbose_name_plural = "sessões de leitura"

    def __str__(self):
        return f"Sessão de {self.user}: {self.duration_seconds}s"


class SharedLibrary(models.Model):
    name = models.CharField("nome", max_length=120)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_shared_libraries",
        verbose_name="proprietário",
    )
    created_at = models.DateTimeField("criada em", auto_now_add=True)

    class Meta:
        ordering = ["name", "created_at"]
        verbose_name = "biblioteca compartilhada"
        verbose_name_plural = "bibliotecas compartilhadas"

    def __str__(self):
        return self.name


class SharedLibraryMembership(models.Model):
    shared_library = models.ForeignKey(
        SharedLibrary,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="biblioteca compartilhada",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_library_memberships",
        verbose_name="usuário",
    )
    joined_at = models.DateTimeField("entrou em", auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["shared_library", "user"], name="unique_shared_library_member"),
        ]
        ordering = ["joined_at"]
        verbose_name = "participante de biblioteca compartilhada"
        verbose_name_plural = "participantes de bibliotecas compartilhadas"

    def __str__(self):
        return f"{self.user} — {self.shared_library}"


class SharedLibraryBook(models.Model):
    shared_library = models.ForeignKey(
        SharedLibrary,
        on_delete=models.CASCADE,
        related_name="books",
        verbose_name="biblioteca compartilhada",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="shared_library_entries",
        verbose_name="livro",
    )
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="shared_books_added",
        verbose_name="adicionado por",
    )
    added_at = models.DateTimeField("adicionado em", auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["shared_library", "book"], name="unique_book_per_shared_library"),
        ]
        ordering = ["-added_at"]
        verbose_name = "livro em biblioteca compartilhada"
        verbose_name_plural = "livros em bibliotecas compartilhadas"

    def clean(self):
        super().clean()
        if self.shared_library_id and self.added_by_id and not SharedLibraryMembership.objects.filter(
            shared_library_id=self.shared_library_id,
            user_id=self.added_by_id,
        ).exists():
            raise ValidationError({"added_by": "Quem adiciona o livro deve participar da biblioteca compartilhada."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.book} — {self.shared_library}"


class SharedLibraryReading(models.Model):
    shared_book = models.ForeignKey(
        SharedLibraryBook,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reading_states",
        verbose_name="livro compartilhado",
    )
    shared_library = models.ForeignKey(
        SharedLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reading_history",
        verbose_name="biblioteca compartilhada",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="shared_reading_states",
        verbose_name="livro",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_reading_states",
        verbose_name="usuário",
    )
    status = models.CharField(
        "status",
        max_length=12,
        choices=LibraryEntry.Status.choices,
        default=LibraryEntry.Status.WANT_TO_READ,
    )
    pages_read = models.PositiveIntegerField("páginas lidas", default=0)
    updated_at = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shared_library", "user", "book"],
                name="unique_shared_library_reading_user_book",
            ),
        ]
        ordering = ["user__username"]
        verbose_name = "progresso em livro compartilhado"
        verbose_name_plural = "progressos em livros compartilhados"

    def clean(self):
        super().clean()
        if not self.book_id or not self.user_id:
            return
        if self.shared_book_id:
            if self.shared_book.book_id != self.book_id or self.shared_book.shared_library_id != self.shared_library_id:
                raise ValidationError({"shared_book": "O livro e a biblioteca do progresso devem corresponder ao item compartilhado."})
            if not SharedLibraryMembership.objects.filter(
                shared_library_id=self.shared_book.shared_library_id,
                user_id=self.user_id,
            ).exists():
                raise ValidationError({"user": "O usuário precisa participar da biblioteca compartilhada."})
        if self.status != LibraryEntry.Status.READ and Review.objects.filter(
            user_id=self.user_id,
            book_id=self.book_id,
        ).exists():
            personal_read = LibraryEntry.objects.filter(
                user_id=self.user_id,
                book_id=self.book_id,
                status=LibraryEntry.Status.READ,
            ).exists()
            other_shared_read = SharedLibraryReading.objects.filter(
                user_id=self.user_id,
                book_id=self.book_id,
                status=LibraryEntry.Status.READ,
            ).exclude(pk=self.pk).exists()
            if not (personal_read or other_shared_read):
                raise ValidationError({"status": "Remova a avaliação antes de mover o último registro lido para outra categoria."})
        total_pages = self.book.total_pages
        if total_pages is not None and self.pages_read > total_pages:
            raise ValidationError({"pages_read": "As páginas lidas não podem ultrapassar o total do livro."})
        if self.status == LibraryEntry.Status.READ:
            if total_pages is None:
                raise ValidationError({"status": "Cadastre o total de páginas antes de marcar o livro como lido."})
            if self.pages_read != total_pages:
                raise ValidationError({"status": "Para marcar como lido, as páginas lidas devem ser iguais ao total."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user}: {self.book} ({self.get_status_display()})"


class SharedLibraryInvitation(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        ACCEPTED = "ACCEPTED", "Aceito"
        DECLINED = "DECLINED", "Recusado"

    shared_library = models.ForeignKey(
        SharedLibrary,
        on_delete=models.CASCADE,
        related_name="invitations",
        verbose_name="biblioteca compartilhada",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_invitations_sent",
        verbose_name="remetente",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_invitations_received",
        verbose_name="destinatário",
    )
    status = models.CharField("status", max_length=8, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField("enviada em", auto_now_add=True)
    opened_at = models.DateTimeField("aberta em", null=True, blank=True)
    responded_at = models.DateTimeField("respondida em", null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shared_library", "recipient"],
                condition=Q(status="PENDING"),
                name="unique_pending_shared_library_invitation",
            ),
        ]
        ordering = ["-created_at"]
        verbose_name = "convite de biblioteca compartilhada"
        verbose_name_plural = "convites de bibliotecas compartilhadas"

    def clean(self):
        super().clean()
        if self.shared_library_id and self.sender_id and self.shared_library.owner_id != self.sender_id:
            raise ValidationError({"sender": "Somente o proprietário pode enviar convites para esta biblioteca."})
        if self.sender_id and self.recipient_id and self.sender_id == self.recipient_id:
            raise ValidationError({"recipient": "Não é possível convidar a si mesmo."})
        if self.shared_library_id and self.recipient_id and SharedLibraryMembership.objects.filter(
            shared_library_id=self.shared_library_id,
            user_id=self.recipient_id,
        ).exists():
            raise ValidationError({"recipient": "Este usuário já participa da biblioteca."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Convite de {self.sender} para {self.recipient}: {self.shared_library}"


class SharedBookRemovalRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        APPROVED = "APPROVED", "Aprovado"
        DENIED = "DENIED", "Recusado"

    shared_book = models.ForeignKey(
        SharedLibraryBook,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="removal_requests",
        verbose_name="livro compartilhado",
    )
    shared_library = models.ForeignKey(
        SharedLibrary,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="book_removal_requests",
        verbose_name="biblioteca compartilhada",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="shared_removal_requests",
        verbose_name="livro",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shared_book_removal_requests_sent",
        verbose_name="solicitante",
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="shared_book_removal_requests_received",
        verbose_name="responsável pela decisão",
    )
    status = models.CharField("status", max_length=8, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField("solicitada em", auto_now_add=True)
    opened_at = models.DateTimeField("aberta em", null=True, blank=True)
    responded_at = models.DateTimeField("respondida em", null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shared_book"],
                condition=Q(status="PENDING", shared_book__isnull=False),
                name="unique_pending_shared_book_removal_request",
            ),
        ]
        ordering = ["-created_at"]
        verbose_name = "solicitação de remoção de livro compartilhado"
        verbose_name_plural = "solicitações de remoção de livros compartilhados"

    def clean(self):
        super().clean()
        if not self.shared_book_id:
            return
        if self.shared_library_id != self.shared_book.shared_library_id:
            raise ValidationError({"shared_library": "A biblioteca deve corresponder ao livro compartilhado."})
        if self.book_id != self.shared_book.book_id:
            raise ValidationError({"book": "A obra deve corresponder ao livro compartilhado."})
        if self.recipient_id != self.shared_book.added_by_id:
            raise ValidationError({"recipient": "A solicitação deve ser enviada a quem adicionou o livro."})
        if self.requested_by_id == self.recipient_id:
            raise ValidationError({"requested_by": "Quem adicionou o livro pode removê-lo diretamente."})
        if not SharedLibraryMembership.objects.filter(
            shared_library_id=self.shared_book.shared_library_id,
            user_id=self.requested_by_id,
        ).exists():
            raise ValidationError({"requested_by": "A pessoa solicitante precisa participar da biblioteca."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Remoção de {self.book} solicitada por {self.requested_by}"


class Review(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="usuário",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="reviews",
        verbose_name="livro",
    )
    rating = models.PositiveSmallIntegerField(
        "nota",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField("comentário", blank=True)
    reviewed_at = models.DateTimeField("avaliado em", default=timezone.now, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="unique_user_book_review"),
            models.CheckConstraint(
                condition=Q(rating__gte=1) & Q(rating__lte=5),
                name="review_rating_between_1_and_5",
            ),
        ]
        ordering = ["-reviewed_at"]
        verbose_name = "avaliação"
        verbose_name_plural = "avaliações"

    def clean(self):
        super().clean()
        if self.user_id and self.book_id:
            duplicate = Review.objects.filter(user_id=self.user_id, book_id=self.book_id)
            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)
            if duplicate.exists():
                raise ValidationError({"book": "Você já avaliou este livro."})
        personally_read = self.user_id and self.book_id and LibraryEntry.objects.filter(
            user_id=self.user_id, book_id=self.book_id, status=LibraryEntry.Status.READ,
        ).exists()
        shared_read = self.user_id and self.book_id and SharedLibraryReading.objects.filter(
            user_id=self.user_id,
            shared_book__book_id=self.book_id,
            status=LibraryEntry.Status.READ,
        ).exists()
        if self.user_id and self.book_id and not (personally_read or shared_read):
            raise ValidationError({"book": "Só é possível avaliar um livro marcado como lido."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.book}: {self.rating}/5 — {self.user}"


@receiver(pre_delete, sender=LibraryEntry)
def delete_review_when_library_entry_is_removed(sender, instance, **kwargs):
    """A review exists only while its owner keeps the book in their library."""
    Review.objects.filter(user_id=instance.user_id, book_id=instance.book_id).delete()


class TrendingBook(models.Model):
    """Seleção de livros em destaque mantida pela administração do sistema."""

    book = models.OneToOneField(
        Book,
        on_delete=models.CASCADE,
        related_name="trending_entry",
        verbose_name="livro",
    )
    position = models.PositiveIntegerField("posição", default=0)
    featured_at = models.DateTimeField("adicionado aos destaques", default=timezone.now)

    class Meta:
        ordering = ["position", "-featured_at"]
        verbose_name = "livro em tendência"
        verbose_name_plural = "livros em tendência"

    def __str__(self):
        return f"#{self.position} — {self.book}"
