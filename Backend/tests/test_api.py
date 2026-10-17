from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from Backend.models import Book, LibraryEntry, Review, TrendingBook

User = get_user_model()


class MyBooksAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reader",
            email="reader@example.com",
            password="Safe-password-123",
        )
        self.other_user = User.objects.create_user(
            username="other-reader",
            email="other@example.com",
            password="Safe-password-456",
        )
        self.book = Book.objects.create(title="Dune", author="Frank Herbert")
        self.client.force_authenticate(user=self.user)

    def test_library_and_reviews_require_authentication(self):
        self.client.force_authenticate(user=None)

        self.assertEqual(self.client.get(reverse("library-entry-list")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(reverse("review-list")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_cannot_read_another_users_library_entry(self):
        entry = LibraryEntry.objects.create(
            user=self.user,
            book=self.book,
            status=LibraryEntry.Status.READ,
        )

        self.client.force_authenticate(user=self.other_user)
        response = self.client.get(reverse("library-entry-detail", args=[entry.pk]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_duplicate_library_entry_is_rejected(self):
        url = reverse("library-entry-list")
        payload = {"book_id": self.book.pk, "status": LibraryEntry.Status.WANT_TO_READ}

        first_response = self.client.post(url, payload, format="json")
        duplicate_response = self.client.post(url, payload, format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(LibraryEntry.objects.filter(user=self.user, book=self.book).count(), 1)

    def test_review_requires_read_status_and_rating_between_one_and_five(self):
        url = reverse("review-list")
        payload = {"book_id": self.book.pk, "rating": 4, "comment": "Muito bom."}

        not_read_response = self.client.post(url, payload, format="json")
        self.assertEqual(not_read_response.status_code, status.HTTP_400_BAD_REQUEST)

        LibraryEntry.objects.create(user=self.user, book=self.book, status=LibraryEntry.Status.READ)
        low_rating_response = self.client.post(url, {**payload, "rating": 0}, format="json")
        high_rating_response = self.client.post(url, {**payload, "rating": 6}, format="json")
        valid_response = self.client.post(url, payload, format="json")
        duplicate_response = self.client.post(url, payload, format="json")

        self.assertEqual(low_rating_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(high_rating_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(valid_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Review.objects.filter(user=self.user, book=self.book).count(), 1)

    def test_review_blocks_move_to_wishlist_and_is_removed_with_library_entry(self):
        entry = LibraryEntry.objects.create(
            user=self.user,
            book=self.book,
            status=LibraryEntry.Status.READ,
        )
        Review.objects.create(user=self.user, book=self.book, rating=5)

        update_response = self.client.patch(
            reverse("library-entry-detail", args=[entry.pk]),
            {"status": LibraryEntry.Status.WANT_TO_READ},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_400_BAD_REQUEST)

        delete_response = self.client.delete(reverse("library-entry-detail", args=[entry.pk]))
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(user=self.user, book=self.book).exists())

    def test_catalog_rejects_case_insensitive_duplicate_book(self):
        response = self.client.post(
            reverse("book-list"),
            {"title": "dUnE", "author": "FRANK HERBERT"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Book.objects.filter(title__iexact="Dune", author__iexact="Frank Herbert").count(), 1)

    def test_registration_hashes_password(self):
        response = self.client.post(
            reverse("register"),
            {
                "username": "new-reader",
                "email": "new-reader@example.com",
                "password": "Another-safe-password-789",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registered_user = User.objects.get(username="new-reader")
        self.assertNotEqual(registered_user.password, "Another-safe-password-789")
        self.assertTrue(registered_user.check_password("Another-safe-password-789"))

    def test_registration_rejects_duplicate_username_and_email(self):
        url = reverse("register")
        duplicate_username = self.client.post(
            url,
            {
                "username": self.user.username,
                "email": "different@example.com",
                "password": "Another-safe-password-789",
            },
            format="json",
        )
        duplicate_email = self.client.post(
            url,
            {
                "username": "different-reader",
                "email": self.user.email,
                "password": "Another-safe-password-789",
            },
            format="json",
        )

        self.assertEqual(duplicate_username.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(duplicate_email.status_code, status.HTTP_400_BAD_REQUEST)

    def test_trending_is_readable_to_users_but_writable_only_by_admins(self):
        url = reverse("trending-list")
        user_create_response = self.client.post(url, {"book_id": self.book.pk}, format="json")
        user_list_response = self.client.get(url)

        self.assertEqual(user_create_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(user_list_response.status_code, status.HTTP_200_OK)

        admin = User.objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="Admin-safe-password-123",
        )
        self.client.force_authenticate(user=admin)
        admin_create_response = self.client.post(url, {"book_id": self.book.pk}, format="json")

        self.assertEqual(admin_create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TrendingBook.objects.count(), 1)
