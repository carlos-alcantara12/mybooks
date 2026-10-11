from rest_framework import generics, permissions, viewsets
from .models import Book, LibraryEntry, Review, TrendingBook
from .serializers import (BookSerializer, LibraryEntrySerializer, ReviewSerializer, TrendingBookSerializer, UserRegistrationSerializer)

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
