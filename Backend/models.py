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

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} — {self.author}"


class LibraryEntry(models.Model):
    class Status(models.TextChoices):
        WISHLIST = "WISHLIST", "Desejado"
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
    status = models.CharField("status", max_length=8, choices=Status.choices)
    added_at = models.DateTimeField("adicionado em", default=timezone.now, editable=False)

    def clean(self):
        super().clean()
        if self.user_id and self.book_id:
            duplicate = LibraryEntry.objects.filter(user_id=self.user_id, book_id=self.book_id)
            if self.pk:
                duplicate = duplicate.exclude(pk=self.pk)
            if duplicate.exists():
                raise ValidationError({"book": "Este livro já está na sua biblioteca."})
        if self.user_id and self.book_id and self.status == self.Status.WISHLIST and Review.objects.filter(user_id=self.user_id, book_id=self.book_id).exists():
            raise ValidationError({"status": "Remova a avaliação antes de mover o livro para Desejados."})

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
        if self.user_id and self.book_id and not LibraryEntry.objects.filter(
            user_id=self.user_id,
            book_id=self.book_id,
            status=LibraryEntry.Status.READ,
        ).exists():
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
