from copy import copy

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import (
    Book,
    LibraryEntry,
    Review,
    SharedLibrary,
    SharedLibraryBook,
    SharedLibraryInvitation,
    SharedLibraryMembership,
    SharedLibraryReading,
    SharedBookRemovalRequest,
    TrendingBook,
    User,
)

User = get_user_model()


def _raise_api_validation_error(error):
    if hasattr(error, "message_dict"):
        detail = error.message_dict
    else:
        detail = error.messages
    raise serializers.ValidationError(detail)


def _save_validated(instance):
    """Persist a model using the same model-level rules used by the admin."""
    try:
        with transaction.atomic():
            instance.full_clean()
            instance.save()
    except DjangoValidationError as error:
        _raise_api_validation_error(error)
    except IntegrityError as error:
        _raise_integrity_conflict(error, model_name=instance._meta.model_name)
    return instance


def _candidate(instance, model, attrs):
    candidate = copy(instance) if instance is not None else model()
    for field, value in attrs.items():
        setattr(candidate, field, value)
    return candidate


def _raise_integrity_conflict(error, model_name=None):
    """Turn database uniqueness races into field-level API errors."""
    cause = error.__cause__
    constraint = getattr(getattr(cause, "diag", None), "constraint_name", "")
    database_error = str(cause or error).casefold()
    marker = f"{constraint} {database_error}".casefold()

    conflicts = (
        ("unique_book_title_author_ci", "backend_book", "title", "Este livro já existe no catálogo."),
        ("unique_user_library_book", "backend_libraryentry", "book_id", "Este livro já está na sua biblioteca."),
        ("unique_user_book_review", "backend_review", "book_id", "Você já avaliou este livro."),
        ("", "username", "username", "Este nome de usuário já está em uso."),
        ("", "email", "email", "Este e-mail já está cadastrado."),
    )
    for constraint_name, table_or_field, field, message in conflicts:
        if constraint_name and constraint_name in marker:
            raise serializers.ValidationError({field: message})
        if table_or_field in marker:
            if table_or_field in ("username", "email") and model_name != "user":
                continue
            raise serializers.ValidationError({field: message})

    raise serializers.ValidationError(
        {"detail": "O registro conflita com dados já cadastrados; atualize os dados e tente novamente."}
    )


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "password")

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return User.objects.create_user(**validated_data)
        except IntegrityError as error:
            _raise_integrity_conflict(error, model_name="user")


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = (
            "id",
            "title",
            "author",
            "synopsis",
            "genre",
            "total_pages",
            "cover_url",
            "publication_date",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        candidate = _candidate(self.instance, Book, attrs)
        try:
            candidate.full_clean()
        except DjangoValidationError as error:
            _raise_api_validation_error(error)
        return attrs

    def create(self, validated_data):
        return _save_validated(Book(**validated_data))

    def update(self, instance, validated_data):
        candidate = _candidate(instance, Book, validated_data)
        return _save_validated(candidate)


class LibraryEntrySerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)

    class Meta:
        model = LibraryEntry
        fields = ("id", "book", "book_id", "status", "pages_read", "added_at")
        read_only_fields = ("id", "added_at")

    def validate(self, attrs):
        candidate = _candidate(self.instance, LibraryEntry, attrs)
        candidate.user = self.context["request"].user
        try:
            candidate.full_clean()
        except DjangoValidationError as error:
            _raise_api_validation_error(error)
        return attrs

    def create(self, validated_data):
        entry = LibraryEntry(user=self.context["request"].user, **validated_data)
        return _save_validated(entry)

    def update(self, instance, validated_data):
        candidate = _candidate(instance, LibraryEntry, validated_data)
        candidate.user = self.context["request"].user
        return _save_validated(candidate)


class ReviewSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)

    class Meta:
        model = Review
        fields = ("id", "book", "book_id", "rating", "comment", "reviewed_at")
        read_only_fields = ("id", "reviewed_at")

    def validate(self, attrs):
        candidate = _candidate(self.instance, Review, attrs)
        candidate.user = self.context["request"].user
        try:
            candidate.full_clean()
        except DjangoValidationError as error:
            _raise_api_validation_error(error)
        return attrs

    def create(self, validated_data):
        review = Review(user=self.context["request"].user, **validated_data)
        return _save_validated(review)

    def update(self, instance, validated_data):
        candidate = _candidate(instance, Review, validated_data)
        candidate.user = self.context["request"].user
        return _save_validated(candidate)


class TrendingBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)

    class Meta:
        model = TrendingBook
        fields = ("id", "book", "book_id", "position", "featured_at")
        read_only_fields = ("id", "featured_at")


class SharedLibrarySerializer(serializers.ModelSerializer):
    owner = serializers.SlugRelatedField(read_only=True, slug_field="username")
    members = serializers.SerializerMethodField()

    class Meta:
        model = SharedLibrary
        fields = ("id", "name", "owner", "members", "created_at")
        read_only_fields = ("id", "owner", "members", "created_at")

    def get_members(self, instance):
        return [membership.user.username for membership in instance.memberships.select_related("user")]

    def create(self, validated_data):
        request = self.context["request"]
        with transaction.atomic():
            library = SharedLibrary.objects.create(owner=request.user, **validated_data)
            SharedLibraryMembership.objects.create(shared_library=library, user=request.user)
        return library


class SharedLibraryReadingSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    book_id = serializers.IntegerField(read_only=True)
    book_title = serializers.CharField(source="book.title", read_only=True)
    shared_library_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = SharedLibraryReading
        fields = (
            "id", "username", "shared_library_id", "book_id", "book_title", "status", "pages_read", "updated_at"
        )
        read_only_fields = ("id", "username", "shared_library_id", "book_id", "book_title", "updated_at")

    def validate(self, attrs):
        candidate = _candidate(self.instance, SharedLibraryReading, attrs)
        candidate.user = self.context["request"].user
        try:
            candidate.full_clean()
        except DjangoValidationError as error:
            _raise_api_validation_error(error)
        return attrs

    def update(self, instance, validated_data):
        candidate = _candidate(instance, SharedLibraryReading, validated_data)
        candidate.user = self.context["request"].user
        return _save_validated(candidate)


class SharedLibraryBookSerializer(serializers.ModelSerializer):
    shared_library = SharedLibrarySerializer(read_only=True)
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)
    shared_library_id = serializers.PrimaryKeyRelatedField(
        queryset=SharedLibrary.objects.all(), source="shared_library", write_only=True, required=True,
    )
    added_by = serializers.SlugRelatedField(read_only=True, slug_field="username")
    reading_states = SharedLibraryReadingSerializer(many=True, read_only=True)

    class Meta:
        model = SharedLibraryBook
        fields = (
            "id",
            "shared_library",
            "shared_library_id",
            "book",
            "book_id",
            "added_by",
            "added_at",
            "reading_states",
        )
        read_only_fields = ("id", "added_by", "added_at", "reading_states")

    def validate(self, attrs):
        library = attrs.get("shared_library", getattr(self.instance, "shared_library", None))
        request = self.context["request"]
        if library and not SharedLibraryMembership.objects.filter(shared_library=library, user=request.user).exists():
            raise serializers.ValidationError({"shared_library_id": "Você não participa desta biblioteca."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        library = validated_data["shared_library"]
        book = validated_data["book"]
        with transaction.atomic():
            book_entry = _save_validated(SharedLibraryBook(shared_library=library, added_by=request.user, book=book))
            for membership in library.memberships.select_related("user"):
                ensure_shared_reading_state(book_entry, membership.user)
        return book_entry


class SharedLibraryInvitationSerializer(serializers.ModelSerializer):
    shared_library = SharedLibrarySerializer(read_only=True)
    shared_library_id = serializers.PrimaryKeyRelatedField(
        queryset=SharedLibrary.objects.all(), source="shared_library", write_only=True,
    )
    sender = serializers.SlugRelatedField(read_only=True, slug_field="username")
    recipient = serializers.SlugRelatedField(read_only=True, slug_field="username")
    recipient_username = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = SharedLibraryInvitation
        fields = (
            "id",
            "shared_library",
            "shared_library_id",
            "sender",
            "recipient",
            "recipient_username",
            "status",
            "created_at",
            "opened_at",
            "responded_at",
        )
        read_only_fields = ("id", "sender", "recipient", "status", "created_at", "opened_at", "responded_at")

    def validate(self, attrs):
        request = self.context["request"]
        library = attrs["shared_library"]
        if library.owner_id != request.user.id:
            raise serializers.ValidationError({"shared_library_id": "Somente o proprietário pode enviar convites."})
        username = attrs.pop("recipient_username")
        try:
            recipient = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError({"recipient_username": "Não existe uma conta com esse nome de usuário."})
        if recipient == request.user:
            raise serializers.ValidationError({"recipient_username": "Não é possível convidar a si mesmo."})
        if SharedLibraryMembership.objects.filter(shared_library=library, user=recipient).exists():
            raise serializers.ValidationError({"recipient_username": "Este usuário já participa da biblioteca."})
        if SharedLibraryInvitation.objects.filter(
            shared_library=library,
            recipient=recipient,
            status=SharedLibraryInvitation.Status.PENDING,
        ).exists():
            raise serializers.ValidationError({"recipient_username": "Já existe um convite pendente para este usuário."})
        attrs["recipient"] = recipient
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return _save_validated(
            SharedLibraryInvitation(sender=request.user, status=SharedLibraryInvitation.Status.PENDING, **validated_data)
        )


class SharedBookRemovalRequestSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source="book.title", read_only=True)
    shared_library_name = serializers.CharField(source="shared_library.name", read_only=True, allow_null=True)
    requested_by = serializers.SlugRelatedField(read_only=True, slug_field="username")
    recipient = serializers.SlugRelatedField(read_only=True, slug_field="username", allow_null=True)
    shared_book_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = SharedBookRemovalRequest
        fields = (
            "id", "shared_book_id", "book_title", "shared_library_name", "requested_by", "recipient",
            "status", "created_at", "opened_at", "responded_at",
        )
        read_only_fields = fields

    def validate(self, attrs):
        shared_book = self.initial_data.get("shared_book_id")
        try:
            shared_book = SharedLibraryBook.objects.select_related("book", "shared_library", "added_by").get(
                pk=shared_book
            )
        except (SharedLibraryBook.DoesNotExist, TypeError, ValueError):
            raise serializers.ValidationError({"shared_book_id": "Informe um livro existente na estante compartilhada."})

        user = self.context["request"].user
        if not SharedLibraryMembership.objects.filter(shared_library=shared_book.shared_library, user=user).exists():
            raise serializers.ValidationError({"shared_book_id": "Você não participa desta biblioteca."})
        if shared_book.added_by_id == user.id:
            raise serializers.ValidationError({"shared_book_id": "Você pode remover diretamente um livro que adicionou."})
        if SharedBookRemovalRequest.objects.filter(shared_book=shared_book, status=SharedBookRemovalRequest.Status.PENDING).exists():
            raise serializers.ValidationError({"shared_book_id": "Já existe uma solicitação pendente para este livro."})
        attrs["shared_book"] = shared_book
        attrs["shared_library"] = shared_book.shared_library
        attrs["book"] = shared_book.book
        attrs["requested_by"] = user
        attrs["recipient"] = shared_book.added_by
        attrs["status"] = SharedBookRemovalRequest.Status.PENDING
        return attrs

    def create(self, validated_data):
        return _save_validated(SharedBookRemovalRequest(**validated_data))


def ensure_shared_reading_state(shared_book, user):
    personal_entry = LibraryEntry.objects.filter(user=user, book=shared_book.book).first()
    if personal_entry:
        defaults = {"status": personal_entry.status, "pages_read": personal_entry.pages_read}
    else:
        existing_state = SharedLibraryReading.objects.filter(
            user=user,
            book=shared_book.book,
        ).order_by("-updated_at").first()
        defaults = (
            {"status": existing_state.status, "pages_read": existing_state.pages_read}
            if existing_state
            else {}
        )
    if defaults.get("status") == LibraryEntry.Status.READ and shared_book.book.total_pages is None:
        defaults = {"status": LibraryEntry.Status.READING, "pages_read": 0}
    state, created = SharedLibraryReading.objects.get_or_create(
        shared_library=shared_book.shared_library,
        user=user,
        book=shared_book.book,
        defaults={**defaults, "shared_book": shared_book},
    )
    if not created and state.shared_book_id is None:
        state.shared_book = shared_book
        state.save()
