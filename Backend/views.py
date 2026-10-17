from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import (
    Book,
    LibraryEntry,
    Review,
    SharedBookRemovalRequest,
    SharedLibrary,
    SharedLibraryBook,
    SharedLibraryInvitation,
    SharedLibraryMembership,
    SharedLibraryReading,
    TrendingBook,
)
from .serializers import (
    BookSerializer,
    LibraryEntrySerializer,
    ReviewSerializer,
    SharedLibraryBookSerializer,
    SharedLibraryInvitationSerializer,
    SharedLibraryReadingSerializer,
    SharedLibrarySerializer,
    SharedBookRemovalRequestSerializer,
    TrendingBookSerializer,
    UserRegistrationSerializer,
    ensure_shared_reading_state,
)

class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    def get_permissions(self):
        if self.action in ("list", "retrieve", "create"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

class LibraryEntryViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryEntrySerializer
    def get_queryset(self):
        return LibraryEntry.objects.filter(user=self.request.user).select_related("book")
    def perform_create(self, serializer):
        serializer.save()
    def perform_destroy(self, instance):
        instance.delete()

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    def get_queryset(self):
        return Review.objects.filter(user=self.request.user).select_related("book")
    def perform_create(self, serializer):
        serializer.save()

class TrendingBookViewSet(viewsets.ModelViewSet):
    queryset = TrendingBook.objects.select_related("book").all()
    serializer_class = TrendingBookSerializer
    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class SharedLibraryViewSet(viewsets.ModelViewSet):
    serializer_class = SharedLibrarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SharedLibrary.objects.filter(memberships__user=self.request.user).distinct().prefetch_related(
            "memberships__user"
        )

    def perform_update(self, serializer):
        if serializer.instance.owner_id != self.request.user.id:
            raise PermissionDenied("Somente o proprietário pode editar esta biblioteca.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.id:
            raise PermissionDenied("Somente o proprietário pode excluir esta biblioteca.")
        instance.delete()


class SharedLibraryBookViewSet(viewsets.ModelViewSet):
    serializer_class = SharedLibraryBookSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return SharedLibraryBook.objects.filter(
            shared_library__memberships__user=self.request.user
        ).distinct().select_related("book", "shared_library", "added_by").prefetch_related(
            "reading_states__user"
        )

    def perform_destroy(self, instance):
        if instance.added_by_id != self.request.user.id:
            raise PermissionDenied("Peça autorização ao responsável para remover este livro.")
        instance.delete()


class SharedLibraryReadingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SharedLibraryReadingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SharedLibraryReading.objects.filter(user=self.request.user).select_related(
            "user", "book", "shared_book", "shared_library"
        )


class SharedLibraryInvitationViewSet(viewsets.ModelViewSet):
    serializer_class = SharedLibraryInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return SharedLibraryInvitation.objects.filter(
            Q(sender=self.request.user) | Q(recipient=self.request.user)
        ).select_related("shared_library", "shared_library__owner", "sender", "recipient").prefetch_related(
            "shared_library__memberships__user"
        )

    def perform_destroy(self, instance):
        if instance.sender_id != self.request.user.id or instance.status != SharedLibraryInvitation.Status.PENDING:
            raise PermissionDenied("Somente quem enviou pode cancelar um convite pendente.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        invitation = self.get_object()
        if invitation.recipient_id != request.user.id:
            raise PermissionDenied("Somente a pessoa convidada pode aceitar este convite.")
        if invitation.status != SharedLibraryInvitation.Status.PENDING:
            raise ValidationError({"status": "Este convite já foi respondido."})

        with transaction.atomic():
            invitation = SharedLibraryInvitation.objects.select_for_update().get(pk=invitation.pk)
            if invitation.status != SharedLibraryInvitation.Status.PENDING:
                raise ValidationError({"status": "Este convite já foi respondido."})
            invitation.status = SharedLibraryInvitation.Status.ACCEPTED
            invitation.responded_at = timezone.now()
            invitation.save()
            SharedLibraryMembership.objects.get_or_create(
                shared_library=invitation.shared_library,
                user=request.user,
            )
            for shared_book in invitation.shared_library.books.all():
                ensure_shared_reading_state(shared_book, request.user)

        return Response(self.get_serializer(invitation).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        invitation = self.get_object()
        if invitation.recipient_id != request.user.id:
            raise PermissionDenied("Somente a pessoa convidada pode recusar este convite.")
        if invitation.status != SharedLibraryInvitation.Status.PENDING:
            raise ValidationError({"status": "Este convite já foi respondido."})
        invitation.status = SharedLibraryInvitation.Status.DECLINED
        invitation.responded_at = timezone.now()
        invitation.save()
        return Response(self.get_serializer(invitation).data, status=status.HTTP_200_OK)


class SharedBookRemovalRequestViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = SharedBookRemovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SharedBookRemovalRequest.objects.filter(
            Q(requested_by=self.request.user) | Q(recipient=self.request.user)
        ).select_related("book", "shared_library", "requested_by", "recipient", "shared_book")

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        with transaction.atomic():
            removal_request = SharedBookRemovalRequest.objects.select_for_update().select_related(
                "book", "shared_library", "requested_by", "recipient"
            ).get(pk=self.get_object().pk)
            if removal_request.recipient_id != request.user.id:
                raise PermissionDenied("Somente quem adicionou o livro pode decidir esta solicitação.")
            if removal_request.status != SharedBookRemovalRequest.Status.PENDING:
                raise ValidationError({"status": "Esta solicitação já foi respondida."})
            shared_book = removal_request.shared_book
            if shared_book is None:
                raise ValidationError({"shared_book_id": "O livro já não está na estante compartilhada."})
            shared_book = SharedLibraryBook.objects.select_for_update().get(pk=shared_book.pk)
            removal_request.status = SharedBookRemovalRequest.Status.APPROVED
            removal_request.responded_at = timezone.now()
            removal_request.save()
            shared_book.delete()
            removal_request.refresh_from_db()
        return Response(self.get_serializer(removal_request).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        removal_request = self.get_object()
        if removal_request.recipient_id != request.user.id:
            raise PermissionDenied("Somente quem adicionou o livro pode decidir esta solicitação.")
        if removal_request.status != SharedBookRemovalRequest.Status.PENDING:
            raise ValidationError({"status": "Esta solicitação já foi respondida."})
        removal_request.status = SharedBookRemovalRequest.Status.DENIED
        removal_request.responded_at = timezone.now()
        removal_request.save()
        return Response(self.get_serializer(removal_request).data, status=status.HTTP_200_OK)
