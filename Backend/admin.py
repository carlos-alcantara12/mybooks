from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Book, LibraryEntry, Review, TrendingBook, User

@admin.register(User)
class MyBooksUserAdmin(UserAdmin):
    pass

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "publication_date")
    search_fields = ("title", "author")

@admin.register(LibraryEntry)
class LibraryEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "book", "status", "added_at")
    list_filter = ("status",)
    search_fields = ("user__username", "book__title")

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("user", "book", "rating", "reviewed_at")
    list_filter = ("rating",)

@admin.register(TrendingBook)
class TrendingBookAdmin(admin.ModelAdmin):
    list_display = ("position", "book", "featured_at")
    ordering = ("position",)
