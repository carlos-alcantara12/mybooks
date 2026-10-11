from rest_framework.routers import DefaultRouter
from django.urls import include, path
from .views import BookViewSet, LibraryEntryViewSet, RegisterView, ReviewViewSet, TrendingBookViewSet

router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
router.register("library", LibraryEntryViewSet, basename="library-entry")
router.register("reviews", ReviewViewSet, basename="review")
router.register("trending", TrendingBookViewSet, basename="trending")

urlpatterns = [path("auth/register/", RegisterView.as_view(), name="register"), path("", include(router.urls))]
