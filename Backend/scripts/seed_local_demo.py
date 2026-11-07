"""Seed local reading charts and a pending shared-library invitation."""

from calendar import monthrange
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from Backend.models import (
    Book,
    LibraryEntry,
    ReadingActivity,
    ReadingSession,
    SharedLibrary,
    SharedLibraryBook,
    SharedLibraryInvitation,
    SharedLibraryMembership,
    SharedLibraryReading,
)


if not settings.DEBUG:
    raise RuntimeError("Este seed só pode ser executado em ambiente local de desenvolvimento.")

User = get_user_model()
recipient = User.objects.filter(username="carlos").first()
if recipient is None:
    raise RuntimeError("Crie ou escolha o usuário local 'carlos' antes de executar este seed.")

books = list(Book.objects.order_by("id")[:3])
if not books:
    raise RuntimeError("O catálogo precisa ter ao menos uma obra cadastrada.")
cover_books = list(Book.objects.exclude(cover_url="").order_by("id")[:5])
if len(cover_books) < 3:
    raise RuntimeError("O catálogo precisa ter ao menos três capas para a prévia compartilhada.")

today = timezone.localdate()
activity_specs = []
daily_pages = [14, 28, 35, 0, 42, 19, 31]
daily_books = [0, 0, 1, 0, 1, 0, 0]
daily_minutes = [12, 26, 34, 18, 41, 15, 29]
for offset in range(7):
    activity_specs.append(
        (
            today - timedelta(days=6 - offset),
            daily_pages[offset],
            daily_books[offset],
            daily_minutes[offset],
        )
    )

week_start = today - timedelta(days=today.weekday())
weekly_pages = [95, 120, 63, 180, 142, 88, 210]
weekly_books = [1, 0, 1, 2, 1, 0, 2]
weekly_minutes = [75, 110, 50, 135, 95, 60, 150]
for week_offset in range(1, 8):
    day = week_start - timedelta(weeks=week_offset) + timedelta(days=2)
    index = week_offset - 1
    activity_specs.append(
        (day, weekly_pages[index], weekly_books[index], weekly_minutes[index])
    )

monthly_values = [(110, 1, 180), (240, 2, 240), (85, 0, 105), (300, 3, 300), (175, 1, 210)]
for month_offset, (pages, completed, minutes) in enumerate(monthly_values, start=1):
    month_index = today.year * 12 + today.month - 1 - month_offset
    year, zero_based_month = divmod(month_index, 12)
    month = zero_based_month + 1
    day = date(year, month, min(15, monthrange(year, month)[1]))
    activity_specs.append((day, pages, completed, minutes))

with transaction.atomic():
    added_activities = 0
    added_sessions = 0
    for index, (day, pages, completed, minutes) in enumerate(activity_specs):
        book = books[index % len(books)]
        activity_time = timezone.make_aware(datetime.combine(day, time(4, 11)))
        if not ReadingActivity.objects.filter(user=recipient, recorded_at=activity_time).exists():
            ReadingActivity.objects.create(
                user=recipient,
                book=book,
                pages_read=pages,
                books_completed=completed,
                recorded_at=activity_time,
            )
            added_activities += 1

        session_time = timezone.make_aware(datetime.combine(day, time(4, 17)))
        if not ReadingSession.objects.filter(user=recipient, started_at=session_time).exists():
            ReadingSession.objects.create(
                user=recipient,
                started_at=session_time,
                ended_at=session_time + timedelta(minutes=minutes),
                duration_seconds=minutes * 60,
            )
            added_sessions += 1

    sender, sender_created = User.objects.get_or_create(
        username="leitor_demo",
        defaults={
            "email": "leitor.demo@mybooks.local",
            "first_name": "Leitor",
            "last_name": "Demo",
        },
    )
    if sender_created:
        sender.set_password("MyBooksDemo2026!")
        sender.save(update_fields=["password"])

    base_name = "Leituras em dupla — demonstração"
    library_name = base_name
    suffix = 1
    while SharedLibraryMembership.objects.filter(
        shared_library__owner=sender,
        shared_library__name=library_name,
        user=recipient,
    ).exists():
        suffix += 1
        library_name = f"{base_name} {suffix}"

    library, library_created = SharedLibrary.objects.get_or_create(
        owner=sender,
        name=library_name,
    )
    SharedLibraryMembership.objects.get_or_create(
        shared_library=library,
        user=sender,
    )
    preview_library, _ = SharedLibrary.objects.get_or_create(
        owner=recipient,
        name="Estante compartilhada — demonstração",
    )
    SharedLibraryMembership.objects.get_or_create(
        shared_library=preview_library,
        user=recipient,
    )
    SharedLibraryMembership.objects.get_or_create(
        shared_library=preview_library,
        user=sender,
    )
    demo_states = [
        (LibraryEntry.Status.READ, 1.0, LibraryEntry.Status.READING, 0.42),
        (LibraryEntry.Status.READING, 0.58, LibraryEntry.Status.WANT_TO_READ, 0),
        (LibraryEntry.Status.WANT_TO_READ, 0, LibraryEntry.Status.READ, 1.0),
        (LibraryEntry.Status.READING, 0.24, LibraryEntry.Status.READING, 0.67),
        (LibraryEntry.Status.READ, 1.0, LibraryEntry.Status.WANT_TO_READ, 0),
    ]
    added_shared_books = 0
    for index, book in enumerate(cover_books):
        shared_book, created = SharedLibraryBook.objects.get_or_create(
            shared_library=preview_library,
            book=book,
            defaults={"added_by": sender},
        )
        added_shared_books += int(created)
        recipient_status, recipient_progress, sender_status, sender_progress = demo_states[index]
        for user, status, progress in (
            (recipient, recipient_status, recipient_progress),
            (sender, sender_status, sender_progress),
        ):
            pages_read = 0
            if book.total_pages:
                pages_read = book.total_pages if status == LibraryEntry.Status.READ else round(book.total_pages * progress)
            SharedLibraryReading.objects.update_or_create(
                shared_library=preview_library,
                user=user,
                book=book,
                defaults={
                    "shared_book": shared_book,
                    "status": status,
                    "pages_read": pages_read,
                },
            )

    invitation, invitation_created = SharedLibraryInvitation.objects.get_or_create(
        shared_library=library,
        recipient=recipient,
        status=SharedLibraryInvitation.Status.PENDING,
        defaults={"sender": sender},
    )

print(
    f"Dados de demonstração: {added_activities} atividades e "
    f"{added_sessions} sessões adicionadas para {recipient.username}."
)
print(
    f"Convite {invitation.pk}: {sender.username} convidou {recipient.username} "
    f"para '{library.name}' (criado agora: {invitation_created})."
)
print(
    f"Prévia compartilhada '{preview_library.name}': {preview_library.books.count()} livros com capa, "
    f"{added_shared_books} novos itens e progresso simulado para os dois participantes."
)
