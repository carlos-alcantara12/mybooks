from django.db import migrations


SYNOPSES = {
    ("Assassin's Creed III - The Complete Official Guide - Collector's Edition", "Piggyback"):
        "Guia oficial e ilustrado de Assassin's Creed III, com mapas, orientações de campanha, missões, desafios e informações para explorar o universo do jogo com mais segurança.",
    ("Elon Musk", "Ashlee Vance"):
        "Uma biografia de Elon Musk que acompanha sua trajetória desde a infância e os primeiros empreendimentos até a criação e expansão de empresas como PayPal, SpaceX e Tesla. A obra examina sua ambição tecnológica, os riscos assumidos e a influência de suas decisões sobre os setores de transporte, energia e exploração espacial.",
}


def populate_synopses(apps, schema_editor):
    Book = apps.get_model("Backend", "Book")
    for (title, author), synopsis in SYNOPSES.items():
        Book.objects.filter(title=title, author=author, synopsis="").update(synopsis=synopsis)


class Migration(migrations.Migration):
    dependencies = [
        ("Backend", "0010_libraryentry_shelf"),
    ]

    operations = [migrations.RunPython(populate_synopses, migrations.RunPython.noop)]
