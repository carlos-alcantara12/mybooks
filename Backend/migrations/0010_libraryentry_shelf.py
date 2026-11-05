from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Backend", "0009_readingsession_readinggoal"),
    ]

    operations = [
        migrations.AddField(
            model_name="libraryentry",
            name="shelf",
            field=models.PositiveIntegerField(default=0, verbose_name="estante"),
        ),
    ]
