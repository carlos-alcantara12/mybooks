"""Google Books search and normalization for the interactive catalog lookup."""

import hashlib
import json
import re
from datetime import date
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache


GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
PAGE_SIZE = 20


class ExternalBookCatalogError(Exception):
    pass


def _fetch_json(url, user_agent="MyBooks/1.0"):
    request = Request(url, headers={"Accept": "application/json", "User-Agent": user_agent})
    try:
        with urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise ExternalBookCatalogError("Não foi possível consultar o catálogo online agora.") from error


def _publication_fields(raw_date):
    raw_date = str(raw_date or "").strip()
    year_match = re.match(r"^(\d{4})", raw_date)
    publication_year = year_match.group(1) if year_match else ""
    publication_date = None
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw_date):
            publication_date = date.fromisoformat(raw_date).isoformat()
    except ValueError:
        pass
    return publication_date, publication_year


def normalize_google_volume(volume):
    info = volume.get("volumeInfo") or {}
    title = str(info.get("title") or "").strip()
    if not title:
        return None

    authors = info.get("authors") or []
    author = ", ".join(str(name).strip() for name in authors if str(name).strip()) or "Autor desconhecido"
    categories = info.get("categories") or []
    genre = str(categories[0] if categories else "")[:100]
    image_links = info.get("imageLinks") or {}
    cover_url = image_links.get("thumbnail") or image_links.get("smallThumbnail") or ""
    cover_url = cover_url.replace("http://", "https://", 1)
    publication_date, publication_year = _publication_fields(info.get("publishedDate"))

    return {
        "id": f"google:{volume.get('id', '')}",
        "source": "Google Books",
        "provider": "google_books",
        "source_id": str(volume.get("id") or ""),
        "is_external": True,
        "title": title[:255],
        "author": author[:255],
        "synopsis": str(info.get("description") or ""),
        "genre": genre,
        "total_pages": info.get("pageCount") if isinstance(info.get("pageCount"), int) and info["pageCount"] > 0 else None,
        "cover_url": cover_url,
        "publication_date": publication_date,
        "publication_year": publication_year,
        "external_url": info.get("infoLink") or volume.get("selfLink") or "",
    }


def search_google_books(query, genre="", page=1):
    api_key = getattr(settings, "GOOGLE_BOOKS_API_KEY", "")
    if not api_key:
        raise ExternalBookCatalogError(
            "A busca online ainda não está configurada. Defina GOOGLE_BOOKS_API_KEY no ambiente do backend."
        )

    search_terms = query.strip()
    if genre.strip():
        search_terms = f"{search_terms} subject:{genre.strip()}".strip()
    params = {
        "q": search_terms,
        "startIndex": (page - 1) * PAGE_SIZE,
        "maxResults": PAGE_SIZE,
        "printType": "books",
        "key": api_key,
    }
    cache_key = "mybooks:gbooks:search:" + hashlib.sha256(
        f"{search_terms.casefold()}:{page}".encode("utf-8")
    ).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    payload = _fetch_json(f"{GOOGLE_BOOKS_URL}?{urlencode(params)}")
    results = [
        normalized for item in payload.get("items", [])
        if (normalized := normalize_google_volume(item)) is not None
    ]
    result = (results, int(payload.get("totalItems") or 0))
    cache.set(cache_key, result, timeout=60 * 15)
    return result


def normalize_open_library_work(work):
    title = str(work.get("title") or "").strip()
    if not title:
        return None
    authors = work.get("author_name") or []
    author = ", ".join(str(name).strip() for name in authors if str(name).strip()) or "Autor desconhecido"
    subjects = work.get("subject") or []
    work_id = str(work.get("key") or "").strip("/").split("/")[-1]
    cover_id = work.get("cover_i")
    synopsis = work.get("first_sentence") or ""
    if isinstance(synopsis, list):
        synopsis = synopsis[0] if synopsis else ""
    if isinstance(synopsis, dict):
        synopsis = synopsis.get("value", "")
    year = work.get("first_publish_year")
    return {
        "id": f"openlibrary:{work_id}",
        "source": "Open Library",
        "provider": "open_library",
        "source_id": work_id,
        "is_external": True,
        "title": title[:255],
        "author": author[:255],
        "synopsis": str(synopsis or ""),
        "genre": str(subjects[0] if subjects else "")[:100],
        "total_pages": work.get("number_of_pages_median") if isinstance(work.get("number_of_pages_median"), int) and work["number_of_pages_median"] > 0 else None,
        "cover_url": f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg?default=false" if cover_id else "",
        "publication_date": None,
        "publication_year": str(year or ""),
        "external_url": f"https://openlibrary.org/works/{work_id}" if work_id else "",
    }


def search_open_library(query, genre="", page=1):
    search_terms = " ".join(part for part in (query.strip(), genre.strip()) if part)
    params = {
        "q": search_terms,
        "fields": "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject,first_sentence",
        "limit": PAGE_SIZE,
        "page": page,
    }
    cache_key = "mybooks:openlibrary:search:" + hashlib.sha256(
        f"{search_terms.casefold()}:{page}".encode("utf-8")
    ).hexdigest()
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    contact = getattr(settings, "OPEN_LIBRARY_CONTACT_EMAIL", "")
    user_agent = f"MyBooks/1.0 ({contact})" if contact else "MyBooks/1.0"
    payload = _fetch_json(f"https://openlibrary.org/search.json?{urlencode(params)}", user_agent=user_agent)
    results = [
        normalized for item in payload.get("docs", [])
        if (normalized := normalize_open_library_work(item)) is not None
    ]
    result = (results, int(payload.get("num_found") or 0))
    cache.set(cache_key, result, timeout=60 * 15)
    return result


def search_external_books(query, genre="", page=1):
    google_error = None
    if getattr(settings, "GOOGLE_BOOKS_API_KEY", ""):
        try:
            google_results, google_count = search_google_books(query, genre, page)
            if google_results:
                return google_results, google_count
        except ExternalBookCatalogError as error:
            google_error = error

    try:
        return search_open_library(query, genre, page)
    except ExternalBookCatalogError as error:
        if google_error:
            raise google_error from error
        raise


def get_google_volume(volume_id):
    api_key = getattr(settings, "GOOGLE_BOOKS_API_KEY", "")
    if not api_key:
        raise ExternalBookCatalogError(
            "A busca online ainda não está configurada. Defina GOOGLE_BOOKS_API_KEY no ambiente do backend."
        )
    volume_id = str(volume_id or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,120}", volume_id):
        raise ExternalBookCatalogError("O identificador desta obra online é inválido.")

    cache_key = "mybooks:gbooks:volume:" + volume_id
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    payload = _fetch_json(f"{GOOGLE_BOOKS_URL}/{volume_id}?{urlencode({'key': api_key})}")
    normalized = normalize_google_volume(payload)
    if normalized is None:
        raise ExternalBookCatalogError("A fonte online não retornou os dados desta obra.")
    cache.set(cache_key, normalized, timeout=60 * 60)
    return normalized
