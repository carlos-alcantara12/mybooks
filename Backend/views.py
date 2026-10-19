import re
from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db import connection
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import (
    Book,
    LibraryEntry,
    ReadingActivity,
    ReadingGoal,
    ReadingSession,
    Review,
    SharedBookRemovalRequest,
    SharedLibrary,
    SharedLibraryBook,
    SharedLibraryInvitation,
    SharedLibraryMembership,
    SharedLibraryReading,
    TrendingBook,
)
from .external_books import ExternalBookCatalogError, get_google_volume, search_external_books
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


class MailboxView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        letters = []
        invitations = SharedLibraryInvitation.objects.filter(recipient=request.user).select_related(
            "sender", "shared_library"
        )
        for invitation in invitations:
            letters.append({
                "type": "INVITATION",
                "id": invitation.pk,
                "title": f"Convite para {invitation.shared_library.name}",
                "message": f"{invitation.sender.username} convidou você para uma biblioteca compartilhada.",
                "sender": invitation.sender.username,
                "shared_library": invitation.shared_library.name,
                "status": invitation.status,
                "created_at": invitation.created_at,
                "opened_at": invitation.opened_at,
                "is_opened": invitation.opened_at is not None,
                "actions": ["accept", "decline"] if invitation.status == SharedLibraryInvitation.Status.PENDING else [],
            })

        removal_requests = SharedBookRemovalRequest.objects.filter(recipient=request.user).select_related(
            "requested_by", "shared_library", "book"
        )
        for removal_request in removal_requests:
            letters.append({
                "type": "BOOK_REMOVAL_REQUEST",
                "id": removal_request.pk,
                "title": f"Pedido para remover {removal_request.book.title}",
                "message": f"{removal_request.requested_by.username} pediu para retirar esta obra da estante compartilhada.",
                "sender": removal_request.requested_by.username,
                "shared_library": removal_request.shared_library.name if removal_request.shared_library else None,
                "book_title": removal_request.book.title,
                "status": removal_request.status,
                "created_at": removal_request.created_at,
                "opened_at": removal_request.opened_at,
                "is_opened": removal_request.opened_at is not None,
                "actions": ["approve", "deny"] if removal_request.status == SharedBookRemovalRequest.Status.PENDING else [],
            })

        letters.sort(key=lambda letter: letter["created_at"], reverse=True)
        unread_count = sum(not letter["is_opened"] for letter in letters)
        return Response({"unread_count": unread_count, "results": letters})


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        except Exception:
            return Response({"status": "unhealthy", "database": "unavailable"}, status=503)
        return Response({"status": "ok", "database": "ok"})


class ReadingStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        daily_start = today - timedelta(days=6)
        current_week = today - timedelta(days=today.weekday())
        weekly_start = current_week - timedelta(weeks=7)
        month_index = today.year * 12 + today.month - 1 - 5
        monthly_start = date(month_index // 12, month_index % 12 + 1, 1)
        start_date = min(daily_start, weekly_start, monthly_start)
        start_datetime = timezone.make_aware(datetime.combine(start_date, time.min))

        daily_totals = {}
        weekly_totals = {}
        monthly_totals = {}
        activities = ReadingActivity.objects.filter(
            user=request.user,
            recorded_at__gte=start_datetime,
        ).only("pages_read", "books_completed", "recorded_at")
        for activity in activities:
            local_date = timezone.localtime(activity.recorded_at).date()
            totals = (activity.pages_read, activity.books_completed)
            for bucket, key in (
                (daily_totals, local_date),
                (weekly_totals, local_date - timedelta(days=local_date.weekday())),
                (monthly_totals, (local_date.year, local_date.month)),
            ):
                current = bucket.setdefault(key, [0, 0, 0])
                current[0] += totals[0]
                current[1] += totals[1]

        sessions = ReadingSession.objects.filter(
            user=request.user,
            ended_at__isnull=False,
            started_at__gte=start_datetime,
        ).only("duration_seconds", "started_at")
        for session in sessions:
            local_date = timezone.localtime(session.started_at).date()
            for bucket, key in (
                (daily_totals, local_date),
                (weekly_totals, local_date - timedelta(days=local_date.weekday())),
                (monthly_totals, (local_date.year, local_date.month)),
            ):
                current = bucket.setdefault(key, [0, 0, 0])
                current[2] += session.duration_seconds

        def bucket_row(label, key, values):
            pages, books, seconds = values.get(key, (0, 0, 0))
            return {"label": label, "pages": pages, "books": books, "minutes": (seconds + 30) // 60}

        daily = [
            bucket_row(day.strftime("%d/%m"), day, daily_totals)
            for day in (daily_start + timedelta(days=offset) for offset in range(7))
        ]
        weekly = [
            bucket_row(week.strftime("%d/%m"), week, weekly_totals)
            for week in (weekly_start + timedelta(weeks=offset) for offset in range(8))
        ]
        month_dates = []
        year, month = monthly_start.year, monthly_start.month
        for _ in range(6):
            month_dates.append((year, month))
            if month == 12:
                year, month = year + 1, 1
            else:
                month += 1
        monthly = [
            bucket_row(f"{month:02d}/{year}", (year, month), monthly_totals)
            for year, month in month_dates
        ]
        return Response({"daily": daily, "weekly": weekly, "monthly": monthly})


class ReadingGoalView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        goal, _created = ReadingGoal.objects.get_or_create(user=request.user)
        return Response({"target_minutes": goal.target_minutes})

    def patch(self, request):
        target = request.data.get("target_minutes")
        if isinstance(target, bool) or not isinstance(target, int) or not 1 <= target <= 1440:
            raise ValidationError({"target_minutes": "A meta deve ser um número inteiro entre 1 e 1440 minutos."})
        goal, _created = ReadingGoal.objects.update_or_create(
            user=request.user,
            defaults={"target_minutes": target},
        )
        return Response({"target_minutes": goal.target_minutes})


class ReadingSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        session = ReadingSession.objects.filter(user=request.user, ended_at__isnull=True).first()
        return Response({"active": self.serialize(session) if session else None})

    def post(self, request, action=None):
        if action == "start":
            active = ReadingSession.objects.filter(user=request.user, ended_at__isnull=True).first()
            if active:
                return Response({"active": self.serialize(active)})
            session = ReadingSession.objects.create(user=request.user)
            return Response({"active": self.serialize(session)}, status=status.HTTP_201_CREATED)

        if action == "stop":
            session = ReadingSession.objects.filter(user=request.user, ended_at__isnull=True).first()
            if not session:
                raise ValidationError({"detail": "Não há uma sessão de leitura ativa."})
            now = timezone.now()
            session.ended_at = now
            session.duration_seconds = max(0, int((now - session.started_at).total_seconds()))
            session.save(update_fields=["ended_at", "duration_seconds"])
            return Response({"session": self.serialize(session)})

        raise ValidationError({"action": "Use start ou stop."})

    @staticmethod
    def serialize(session):
        return {
            "id": session.id,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "duration_seconds": session.duration_seconds,
        }


class RegisterView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"username": request.user.username})

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    def get_queryset(self):
        queryset = Book.objects.all()
        search = self.request.query_params.get("search", "").strip()
        genre = self.request.query_params.get("genre", "").strip()
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(author__icontains=search))
        if genre:
            queryset = queryset.filter(genre__icontains=genre)
        return queryset



    def get_permissions(self):
        if self.action in ("list", "retrieve", "create"):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class BookDiscoveryView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "external_catalog"

    def get(self, request):
        query = request.query_params.get("search", "").strip()
        genre = request.query_params.get("genre", "").strip()
        if not query and not genre:
            raise ValidationError({"search": "Informe um título, autor ou gênero para pesquisar."})
        if len(query) > 180 or len(genre) > 100:
            raise ValidationError({"search": "A busca excede o tamanho permitido."})
        try:
            page = max(1, int(request.query_params.get("page", "1")))
        except ValueError as error:
            raise ValidationError({"page": "Informe um número de página válido."}) from error

        local_queryset = Book.objects.all()
        if query:
            local_queryset = local_queryset.filter(Q(title__icontains=query) | Q(author__icontains=query))
        if genre:
            local_queryset = local_queryset.filter(genre__icontains=genre)
        local_count = local_queryset.count()
        local_books = list(local_queryset[(page - 1) * 20:page * 20])
        local_results = []
        for book in local_books:
            item = BookSerializer(book).data
            item.update({"source": "Catálogo MyBooks", "is_external": False, "publication_year": str(book.publication_date.year) if book.publication_date else ""})
            local_results.append(item)

        warning = ""
        try:
            external_results, external_count = search_external_books(query, genre, page)
        except ExternalBookCatalogError as error:
            external_results, external_count = [], 0
            warning = str(error)

        results = []
        seen = set()
        for item in [*local_results, *external_results]:
            key = (item["title"].casefold().strip(), item["author"].casefold().strip())
            if key in seen:
                continue
            seen.add(key)
            results.append(item)

        has_next = page < max((local_count + 19) // 20, (external_count + 19) // 20)
        return Response({
            "count": len(results),
            "results": results,
            "next": has_next,
            "previous": page > 1,
            "warning": warning,
        })


class ImportExternalBookView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        provider = request.data.get("provider")
        if provider == "google_books":
            try:
                volume = get_google_volume(request.data.get("source_id"))
            except ExternalBookCatalogError as error:
                return Response({"detail": str(error)}, status=status.HTTP_502_BAD_GATEWAY)
            fields = {
                "title": volume["title"],
                "author": volume["author"],
                "synopsis": volume["synopsis"],
                "genre": volume["genre"],
                "total_pages": volume["total_pages"],
                "cover_url": volume["cover_url"],
                "publication_date": volume["publication_date"],
            }
        elif provider == "open_library":
            source_id = str(request.data.get("source_id") or "")
            metadata = request.data.get("metadata")
            if not re.fullmatch(r"OL\d+W", source_id) or not isinstance(metadata, dict):
                raise ValidationError({"source_id": "Os dados desta obra do Open Library são inválidos."})
            fields = {
                "title": metadata.get("title", ""),
                "author": metadata.get("author", ""),
                "synopsis": metadata.get("synopsis", ""),
                "genre": metadata.get("genre", ""),
                "total_pages": metadata.get("total_pages"),
                "cover_url": metadata.get("cover_url", ""),
                "publication_date": None,
            }
        else:
            raise ValidationError({"provider": "Esta fonte de livros não é aceita."})

        existing = Book.objects.filter(title__iexact=fields["title"], author__iexact=fields["author"]).first()
        if existing:
            return Response(BookSerializer(existing).data, status=status.HTTP_200_OK)

        serializer = BookSerializer(data=fields)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                book = serializer.save()
        except ValidationError:
            existing = Book.objects.filter(title__iexact=fields["title"], author__iexact=fields["author"]).first()
            if not existing:
                raise
            book = existing
        return Response(BookSerializer(book).data, status=status.HTTP_201_CREATED)

class LibraryEntryViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryEntrySerializer

    def get_queryset(self):
        queryset = LibraryEntry.objects.filter(user=self.request.user).select_related("book")
        search = self.request.query_params.get("search", "").strip()
        genre = self.request.query_params.get("genre", "").strip()
        reading_status = self.request.query_params.get("status", "").strip()
        if search:
            queryset = queryset.filter(Q(book__title__icontains=search) | Q(book__author__icontains=search))
        if genre:
            queryset = queryset.filter(book__genre__icontains=genre)
        if reading_status:
            allowed_statuses = {choice for choice, _label in LibraryEntry.Status.choices}
            if reading_status not in allowed_statuses:
                raise ValidationError({"status": "Use WANT_TO_READ, READING ou READ."})
            queryset = queryset.filter(status=reading_status)
        return queryset
    def perform_create(self, serializer):
        with transaction.atomic():
            entry = serializer.save()
            if entry.pages_read or entry.status == LibraryEntry.Status.READ:
                ReadingActivity.objects.create(
                    user=entry.user,
                    book=entry.book,
                    pages_read=entry.pages_read,
                    books_completed=int(entry.status == LibraryEntry.Status.READ),
                )

    def perform_update(self, serializer):
        previous = serializer.instance
        previous_pages = previous.pages_read
        previous_status = previous.status
        with transaction.atomic():
            entry = serializer.save()
            pages_delta = max(0, entry.pages_read - previous_pages)
            completed = int(previous_status != LibraryEntry.Status.READ and entry.status == LibraryEntry.Status.READ)
            if pages_delta or completed:
                ReadingActivity.objects.create(
                    user=entry.user,
                    book=entry.book,
                    pages_read=pages_delta,
                    books_completed=completed,
                )
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
        queryset = SharedLibraryBook.objects.filter(
            shared_library__memberships__user=self.request.user
        ).distinct().select_related("book", "shared_library", "added_by").prefetch_related(
            "reading_states__user"
        )
        search = self.request.query_params.get("search", "").strip()
        genre = self.request.query_params.get("genre", "").strip()
        reading_status = self.request.query_params.get("status", "").strip()
        if search:
            queryset = queryset.filter(Q(book__title__icontains=search) | Q(book__author__icontains=search))
        if genre:
            queryset = queryset.filter(book__genre__icontains=genre)
        if reading_status:
            allowed_statuses = {choice for choice, _label in LibraryEntry.Status.choices}
            if reading_status not in allowed_statuses:
                raise ValidationError({"status": "Use WANT_TO_READ, READING ou READ."})
            queryset = queryset.filter(reading_states__user=self.request.user, reading_states__status=reading_status)
        return queryset.distinct()

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
    def open(self, request, pk=None):
        invitation = self.get_object()
        if invitation.recipient_id != request.user.id:
            raise PermissionDenied("Somente a pessoa destinatária pode abrir esta carta.")
        if invitation.opened_at is None:
            invitation.opened_at = timezone.now()
            invitation.save(update_fields=["opened_at"])
        return Response(self.get_serializer(invitation).data, status=status.HTTP_200_OK)

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
            invitation.opened_at = invitation.opened_at or timezone.now()
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
        invitation.opened_at = invitation.opened_at or timezone.now()
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
    def open(self, request, pk=None):
        removal_request = self.get_object()
        if removal_request.recipient_id != request.user.id:
            raise PermissionDenied("Somente a pessoa destinatária pode abrir esta notificação.")
        if removal_request.opened_at is None:
            removal_request.opened_at = timezone.now()
            removal_request.save(update_fields=["opened_at"])
        return Response(self.get_serializer(removal_request).data, status=status.HTTP_200_OK)

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
            removal_request.opened_at = removal_request.opened_at or timezone.now()
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
        removal_request.opened_at = removal_request.opened_at or timezone.now()
        removal_request.save()
        return Response(self.get_serializer(removal_request).data, status=status.HTTP_200_OK)
