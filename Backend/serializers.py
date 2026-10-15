from copy import copy

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import Book, LibraryEntry, Review, TrendingBook

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
        fields = ("id", "title", "author", "synopsis", "cover_url", "publication_date", "created_at")
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
        fields = ("id", "book", "book_id", "status", "added_at")
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
