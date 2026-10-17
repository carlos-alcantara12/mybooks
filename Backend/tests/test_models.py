from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from Backend.models import Book, LibraryEntry, Review

User = get_user_model()


class BusinessRuleModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="model-reader",
            email="model-reader@example.com",
            password="Safe-password-123",
        )
        self.book = Book.objects.create(title="Foundation", author="Isaac Asimov")

    def test_model_save_rejects_case_insensitive_catalog_duplicate(self):
        duplicate = Book(title="FOUNDATION", author="ISAAC ASIMOV")

        with self.assertRaises(ValidationError):
            duplicate.save()

    def test_model_save_rejects_duplicate_library_entry(self):
        LibraryEntry.objects.create(
            user=self.user,
            book=self.book,
            status=LibraryEntry.Status.WANT_TO_READ,
        )
        duplicate = LibraryEntry(
            user=self.user,
            book=self.book,
            status=LibraryEntry.Status.READ,
        )

        with self.assertRaises(ValidationError):
            duplicate.save()

    def test_model_save_rejects_review_before_book_is_read(self):
        review = Review(user=self.user, book=self.book, rating=5)

        with self.assertRaises(ValidationError):
            review.save()
