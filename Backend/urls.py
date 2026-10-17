from rest_framework.routers import DefaultRouter
from django.urls import include, path
from .views import (
    BookViewSet,
    HealthCheckView,
    LibraryEntryViewSet,
    MailboxView,
    RegisterView,
    ReadingStatsView,
    ReviewViewSet,
    SharedBookRemovalRequestViewSet,
    SharedLibraryBookViewSet,
    SharedLibraryInvitationViewSet,
    SharedLibraryReadingViewSet,
    SharedLibraryViewSet,
    TrendingBookViewSet,
)

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("library", LibraryEntryViewSet, basename="library-entry")
router.register("reviews", ReviewViewSet, basename="review")
router.register("trending", TrendingBookViewSet, basename="trending")
router.register("shared-libraries", SharedLibraryViewSet, basename="shared-library")
router.register("shared-books", SharedLibraryBookViewSet, basename="shared-book")
router.register("shared-reading", SharedLibraryReadingViewSet, basename="shared-reading")
router.register("shared-invitations", SharedLibraryInvitationViewSet, basename="shared-invitation")
router.register("shared-removal-requests", SharedBookRemovalRequestViewSet, basename="shared-removal-request")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("health/", HealthCheckView.as_view(), name="health"),
    path("mailbox/", MailboxView.as_view(), name="mailbox"),
    path("reading-stats/", ReadingStatsView.as_view(), name="reading-stats"),
    path("", include(router.urls)),
]
