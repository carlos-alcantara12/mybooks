from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
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

@admin.register(ReadingActivity)
class ReadingActivityAdmin(admin.ModelAdmin):
    list_display = ("user", "book", "pages_read", "books_completed", "recorded_at")
    list_filter = ("recorded_at",)
    search_fields = ("user__username", "book__title")

@admin.register(ReadingGoal)
class ReadingGoalAdmin(admin.ModelAdmin):
    list_display = ("user", "target_minutes", "updated_at")
    search_fields = ("user__username",)

@admin.register(ReadingSession)
class ReadingSessionAdmin(admin.ModelAdmin):
    list_display = ("user", "started_at", "ended_at", "duration_seconds")
    list_filter = ("started_at", "ended_at")
    search_fields = ("user__username",)

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
    list_display = ("shared_library", "sender", "recipient", "status", "created_at", "opened_at")
    list_filter = ("status",)
    search_fields = ("shared_library__name", "sender__username", "recipient__username")


@admin.register(SharedBookRemovalRequest)
class SharedBookRemovalRequestAdmin(admin.ModelAdmin):
    list_display = ("book", "shared_library", "requested_by", "recipient", "status", "created_at", "opened_at", "responded_at")
    list_filter = ("status", "created_at")
    search_fields = ("book__title", "shared_library__name", "requested_by__username", "recipient__username")
