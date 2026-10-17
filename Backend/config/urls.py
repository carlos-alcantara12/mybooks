from django.contrib import admin
from django.urls import include, path
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


class RateLimitedTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


class RateLimitedTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("Backend.urls")),
    path("api/auth/token/", RateLimitedTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", RateLimitedTokenRefreshView.as_view(), name="token_refresh"),
]
