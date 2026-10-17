from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Book,
    LibraryEntry,
    Review,
    SharedLibrary,
    SharedLibraryBook,
    SharedLibraryInvitation,
    SharedLibraryMembership,
    SharedLibraryReading,
    TrendingBook,
    User,
)

@admin.register(User)
class MyBooksUserAdmin(UserAdmin):
    pass

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "genre", "total_pages", "publication_date")
    search_fields = ("title", "author", "genre")

@admin.register(LibraryEntry)
class LibraryEntryAdmin(admin.ModelAdmin):
    list_display = ("user", "book", "status", "pages_read", "added_at")
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


@admin.register(SharedLibrary)
class SharedLibraryAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__username")


@admin.register(SharedLibraryMembership)
class SharedLibraryMembershipAdmin(admin.ModelAdmin):
    list_display = ("shared_library", "user", "joined_at")
    search_fields = ("shared_library__name", "user__username")


@admin.register(SharedLibraryBook)
class SharedLibraryBookAdmin(admin.ModelAdmin):
    list_display = ("shared_library", "book", "added_by", "added_at")
    search_fields = ("shared_library__name", "book__title", "added_by__username")


@admin.register(SharedLibraryReading)
class SharedLibraryReadingAdmin(admin.ModelAdmin):
    list_display = ("shared_book", "user", "status", "pages_read", "updated_at")
    list_filter = ("status",)
    search_fields = ("shared_book__book__title", "user__username")


@admin.register(SharedLibraryInvitation)
class SharedLibraryInvitationAdmin(admin.ModelAdmin):
    list_display = ("shared_library", "sender", "recipient", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("shared_library__name", "sender__username", "recipient__username")
