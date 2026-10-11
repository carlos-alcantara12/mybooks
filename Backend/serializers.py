from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Book, LibraryEntry, Review, TrendingBook

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "password")
    def validate_password(self, value):
        validate_password(value)
        return value
    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class BookSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        title = attrs.get("title", getattr(self.instance, "title", None))
        author = attrs.get("author", getattr(self.instance, "author", None))
        if title and author and Book.objects.filter(title__iexact=title, author__iexact=author).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError("Este livro já existe no catálogo.")
        return attrs
    class Meta:
        model = Book
        fields = ("id", "title", "author", "synopsis", "cover_url", "publication_date", "created_at")
        read_only_fields = ("id", "created_at")

class LibraryEntrySerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)
    class Meta:
        model = LibraryEntry
        fields = ("id", "book", "book_id", "status", "added_at")
        read_only_fields = ("id", "added_at")
    def validate(self, attrs):
        user = self.context["request"].user
        book = attrs.get("book", getattr(self.instance, "book", None))
        status = attrs.get("status", getattr(self.instance, "status", None))
        if book is not None and LibraryEntry.objects.filter(user=user, book=book).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError({"book_id": "Este livro já está na sua biblioteca."})
        if self.instance and status == LibraryEntry.Status.WISHLIST and Review.objects.filter(user=user, book=book).exists():
            raise serializers.ValidationError({"status": "Remova a avaliação antes de mover o livro para Desejados."})
        entry = self.instance or LibraryEntry(user=user, **attrs)
        if self.instance:
            for field, value in attrs.items():
                setattr(entry, field, value)
        entry.full_clean()
        return attrs
    def create(self, validated_data):
        return LibraryEntry.objects.create(user=self.context["request"].user, **validated_data)

class ReviewSerializer(serializers.ModelSerializer):
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)
    class Meta:
        model = Review
        fields = ("id", "book", "book_id", "rating", "comment", "reviewed_at")
        read_only_fields = ("id", "reviewed_at")
        depth = 1
    def validate(self, attrs):
        user = self.context["request"].user
        book = attrs.get("book", getattr(self.instance, "book", None))
        if book and not LibraryEntry.objects.filter(user=user, book=book, status=LibraryEntry.Status.READ).exists():
            raise serializers.ValidationError({"book_id": "Só é possível avaliar livros marcados como lidos."})
        if book and Review.objects.filter(user=user, book=book).exclude(pk=getattr(self.instance, "pk", None)).exists():
            raise serializers.ValidationError({"book_id": "Você já avaliou este livro."})
        return attrs
    def create(self, validated_data):
        review = Review(user=self.context["request"].user, **validated_data)
        review.full_clean()
        review.save()
        return review
    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.full_clean()
        instance.save()
        return instance

class TrendingBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all(), source="book", write_only=True)
    class Meta:
        model = TrendingBook
        fields = ("id", "book", "book_id", "position", "featured_at")
        read_only_fields = ("id", "featured_at")
