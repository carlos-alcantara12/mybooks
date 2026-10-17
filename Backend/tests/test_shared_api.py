from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from Backend.models import (
    Book,
    LibraryEntry,
    SharedBookRemovalRequest,
    SharedLibrary,
    SharedLibraryBook,
    SharedLibraryMembership,
    SharedLibraryReading,
)

User = get_user_model()


class SharedLibraryAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner", email="owner@example.com", password="Safe-password-123"
        )
        self.member = User.objects.create_user(
            username="member", email="member@example.com", password="Safe-password-456"
        )
        self.outsider = User.objects.create_user(
            username="outsider", email="outsider@example.com", password="Safe-password-789"
        )
        self.book = Book.objects.create(title="Dune", author="Frank Herbert", total_pages=412)
        self.library = SharedLibrary.objects.create(name="Leituras", owner=self.owner)
        SharedLibraryMembership.objects.create(shared_library=self.library, user=self.owner)
        SharedLibraryMembership.objects.create(shared_library=self.library, user=self.member)
        self.shared_book = SharedLibraryBook.objects.create(
            shared_library=self.library, book=self.book, added_by=self.owner
        )
        for user in (self.owner, self.member):
            SharedLibraryReading.objects.create(
                shared_book=self.shared_book,
                shared_library=self.library,
                book=self.book,
                user=user,
            )
        self.client.force_authenticate(user=self.owner)

    def test_shared_library_creation_adds_owner_as_member(self):
        response = self.client.post(reverse("shared-library-list"), {"name": "Clube do livro"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_library = SharedLibrary.objects.get(pk=response.data["id"])
        self.assertTrue(SharedLibraryMembership.objects.filter(shared_library=new_library, user=self.owner).exists())

    def test_invitation_is_internal_and_acceptance_adds_member(self):
        response = self.client.post(
            reverse("shared-invitation-list"),
            {"shared_library_id": self.library.pk, "recipient_username": self.outsider.username},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invitation_id = response.data["id"]
        self.client.force_authenticate(user=self.outsider)
        inbox = self.client.get(reverse("shared-invitation-list"))
        self.assertEqual(inbox.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in inbox.data["results"]], [invitation_id])
        mailbox = self.client.get(reverse("mailbox"))
        self.assertEqual(mailbox.data["unread_count"], 1)
        self.assertEqual(mailbox.data["results"][0]["type"], "INVITATION")
        opened = self.client.post(reverse("shared-invitation-open", args=[invitation_id]), {}, format="json")
        self.assertEqual(opened.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(opened.data["opened_at"])
        self.assertEqual(self.client.get(reverse("mailbox")).data["unread_count"], 0)

        accepted = self.client.post(reverse("shared-invitation-accept", args=[invitation_id]), {}, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.assertTrue(SharedLibraryMembership.objects.filter(shared_library=self.library, user=self.outsider).exists())
        self.assertTrue(SharedLibraryReading.objects.filter(shared_library=self.library, user=self.outsider, book=self.book).exists())

    def test_shared_reading_progress_is_private_and_validated(self):
        member_state = SharedLibraryReading.objects.get(shared_library=self.library, user=self.member, book=self.book)
        self.client.force_authenticate(user=self.member)
        response = self.client.patch(
            reverse("shared-reading-detail", args=[member_state.pk]), {"pages_read": 100}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pages_read"], 100)

        over_total = self.client.patch(
            reverse("shared-reading-detail", args=[member_state.pk]), {"pages_read": 413}, format="json"
        )
        self.assertEqual(over_total.status_code, status.HTTP_400_BAD_REQUEST)
        self.client.force_authenticate(user=self.outsider)
        hidden = self.client.get(reverse("shared-reading-detail", args=[member_state.pk]))
        self.assertEqual(hidden.status_code, status.HTTP_404_NOT_FOUND)

    def test_removal_request_is_a_notification_and_only_adder_can_decide(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(
            reverse("shared-removal-request-list"), {"shared_book_id": self.shared_book.pk}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request_id = response.data["id"]

        self.client.force_authenticate(user=self.outsider)
        self.assertEqual(self.client.get(reverse("shared-removal-request-list")).data["count"], 0)
        self.client.force_authenticate(user=self.owner)
        inbox = self.client.get(reverse("shared-removal-request-list"))
        self.assertEqual(inbox.status_code, status.HTTP_200_OK)
        self.assertEqual(inbox.data["results"][0]["id"], request_id)
        mailbox = self.client.get(reverse("mailbox"))
        self.assertEqual(mailbox.data["results"][0]["type"], "BOOK_REMOVAL_REQUEST")
        self.assertEqual(mailbox.data["unread_count"], 1)
        opened = self.client.post(reverse("shared-removal-request-open", args=[request_id]), {}, format="json")
        self.assertEqual(opened.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(reverse("mailbox")).data["unread_count"], 0)

        self.client.force_authenticate(user=self.member)
        forbidden = self.client.post(reverse("shared-removal-request-approve", args=[request_id]), {}, format="json")
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.owner)
        denied = self.client.post(reverse("shared-removal-request-deny", args=[request_id]), {}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_200_OK)
        self.assertEqual(denied.data["status"], SharedBookRemovalRequest.Status.DENIED)
        self.assertTrue(SharedLibraryBook.objects.filter(pk=self.shared_book.pk).exists())

    def test_approved_removal_preserves_individual_reading_history(self):
        self.client.force_authenticate(user=self.member)
        response = self.client.post(
            reverse("shared-removal-request-list"), {"shared_book_id": self.shared_book.pk}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(user=self.owner)
        approved = self.client.post(
            reverse("shared-removal-request-approve", args=[response.data["id"]]), {}, format="json"
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertEqual(approved.data["status"], SharedBookRemovalRequest.Status.APPROVED)
        self.assertIsNone(approved.data["shared_book_id"])
        self.assertFalse(SharedLibraryBook.objects.filter(pk=self.shared_book.pk).exists())
        self.assertEqual(SharedLibraryReading.objects.filter(shared_library=self.library, book=self.book).count(), 2)

    def test_only_library_members_can_list_or_add_shared_books(self):
        self.client.force_authenticate(user=self.outsider)
        self.assertEqual(self.client.get(reverse("shared-book-list")).data["count"], 0)
        response = self.client.post(
            reverse("shared-book-list"), {"shared_library_id": self.library.pk, "book_id": self.book.pk}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ReadingAPIValidationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reader", email="reader@example.com", password="Safe-password-123"
        )
        self.book = Book.objects.create(title="Foundation", author="Isaac Asimov", total_pages=100)
        self.client.force_authenticate(user=self.user)

    def test_read_status_requires_all_pages_and_total(self):
        url = reverse("library-entry-list")
        incomplete = self.client.post(
            url,
            {"book_id": self.book.pk, "status": LibraryEntry.Status.READ, "pages_read": 99},
            format="json",
        )
        self.assertEqual(incomplete.status_code, status.HTTP_400_BAD_REQUEST)

        complete = self.client.post(
            url,
            {"book_id": self.book.pk, "status": LibraryEntry.Status.READ, "pages_read": 100},
            format="json",
        )
        self.assertEqual(complete.status_code, status.HTTP_201_CREATED)

