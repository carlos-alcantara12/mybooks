import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ImproperlyConfigured(f"{name} deve ser true ou false.")


def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG", default=False)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "django-insecure-local-development-only"
    else:
        raise ImproperlyConfigured("Defina DJANGO_SECRET_KEY no ambiente de produção.")
if not DEBUG and SECRET_KEY == "django-insecure-local-development-only":
    raise ImproperlyConfigured("DJANGO_SECRET_KEY não pode usar a chave local em produção.")
if not DEBUG and (len(SECRET_KEY) < 50 or "replace" in SECRET_KEY.lower()):
    raise ImproperlyConfigured("DJANGO_SECRET_KEY em produção deve ser uma chave aleatória com pelo menos 50 caracteres.")

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    default="localhost,127.0.0.1" if DEBUG else "",
)
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("Defina DJANGO_ALLOWED_HOSTS com os domínios da aplicação.")

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "Backend.apps.BackendConfig",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DB_ENGINE = os.getenv(
    "DJANGO_DB_ENGINE",
    "django.db.backends.sqlite3" if DEBUG else "django.db.backends.postgresql",
).strip()
if not DEBUG and DB_ENGINE != "django.db.backends.postgresql":
    raise ImproperlyConfigured("Produção exige PostgreSQL; configure DJANGO_DB_ENGINE.")

if DB_ENGINE == "django.db.backends.sqlite3":
    DATABASES = {"default": {"ENGINE": DB_ENGINE, "NAME": BASE_DIR / "db.sqlite3"}}
elif DB_ENGINE == "django.db.backends.postgresql":
    db_name = os.getenv("DJANGO_DB_NAME", "").strip()
    db_user = os.getenv("DJANGO_DB_USER", "").strip()
    db_password = os.getenv("DJANGO_DB_PASSWORD", "")
    db_host = os.getenv("DJANGO_DB_HOST", "").strip()
    if not DEBUG and not all((db_name, db_user, db_password, db_host)):
        raise ImproperlyConfigured(
            "Defina DJANGO_DB_NAME, DJANGO_DB_USER, DJANGO_DB_PASSWORD e DJANGO_DB_HOST."
        )
    db_options = {}
    db_sslmode = os.getenv("DJANGO_DB_SSLMODE", "require" if not DEBUG else "").strip()
    if db_sslmode:
        db_options["sslmode"] = db_sslmode
    DATABASES = {"default": {
        "ENGINE": DB_ENGINE,
        "NAME": db_name or "mybooks",
        "USER": db_user,
        "PASSWORD": db_password,
        "HOST": db_host,
        "PORT": os.getenv("DJANGO_DB_PORT", "5432"),
        "CONN_MAX_AGE": int(os.getenv("DJANGO_DB_CONN_MAX_AGE", "60" if not DEBUG else "0")),
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": db_options,
    }}
else:
    raise ImproperlyConfigured("DJANGO_DB_ENGINE deve ser PostgreSQL ou SQLite.")

AUTH_USER_MODEL = "Backend.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Manaus"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
if not DEBUG:
    MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", default=not DEBUG)
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", default=not DEBUG)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", default=False)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", default=False)
if env_bool("DJANGO_TRUST_X_FORWARDED_PROTO", default=False):
    # Enable only when the trusted reverse proxy strips client-supplied forwarded headers.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "DEFAULT_THROTTLE_RATES": {"auth": "10/min"},
    "PAGE_SIZE": 20,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "{asctime} {levelname} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "default"}},
    "root": {"handlers": ["console"], "level": os.getenv("DJANGO_LOG_LEVEL", "INFO")},
    "loggers": {
        "django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False},
    },
}
