from django.db import migrations, models


def populate_positions(apps, schema_editor):
    LibraryEntry = apps.get_model("Backend", "LibraryEntry")
    positions = {}
    batch = []
    for entry in LibraryEntry.objects.order_by("user_id", "shelf", "-added_at", "pk").iterator():
        key = (entry.user_id, entry.shelf)
        entry.position = positions.get(key, 0)
        positions[key] = entry.position + 1
        batch.append(entry)
        if len(batch) >= 500:
            LibraryEntry.objects.bulk_update(batch, ["position"])
            batch = []
    if batch:
        LibraryEntry.objects.bulk_update(batch, ["position"])


class Migration(migrations.Migration):
    dependencies = [
        ("Backend", "0011_populate_library_synopses"),
    ]

    operations = [
        migrations.AddField(
            model_name="libraryentry",
            name="position",
            field=models.PositiveIntegerField(default=0, verbose_name="posição na estante"),
        ),
        migrations.RunPython(populate_positions, migrations.RunPython.noop),
        migrations.AlterModelOptions(
            name="libraryentry",
            options={
                "ordering": ["shelf", "position", "-added_at"],
                "verbose_name": "livro na biblioteca",
                "verbose_name_plural": "livros na biblioteca",
            },
        ),
    ]
