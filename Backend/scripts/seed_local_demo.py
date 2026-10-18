"""Seed local reading charts and a pending shared-library invitation."""

from calendar import monthrange
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from Backend.models import (
    Book,
    ReadingActivity,
    ReadingSession,
    SharedLibrary,
    SharedLibraryInvitation,
    SharedLibraryMembership,
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
