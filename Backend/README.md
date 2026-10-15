# Backend MyBooks (Django + Django REST Framework)

## Executar localmente

1. Crie e ative um ambiente virtual Python.
2. Instale dependências: pip install -r requirements.txt.
3. Aplique as migrações versionadas: python manage.py migrate.
4. Crie um administrador: python manage.py createsuperuser.
5. Inicie a API: python manage.py runserver.

A configuração usa SQLite. As migrações do app `Backend` ficam versionadas em `migrations/`; crie novas migrações com `python manage.py makemigrations Backend` sempre que alterar os modelos e aplique-as com `python manage.py migrate`. Defina DJANGO_SECRET_KEY, DJANGO_DEBUG e DJANGO_ALLOWED_HOSTS no ambiente antes de publicar.

## Autenticação

- POST /api/auth/register/: cria conta (username, email, password; first_name e last_name opcionais).
- POST /api/auth/token/: recebe username e password e retorna access/refresh JWT.
- POST /api/auth/token/refresh/: renova access token.
- Envie o token em Authorization: Bearer <token>.

## Recursos

- /api/books/: catálogo compartilhado; usuários autenticados podem consultar e cadastrar obras, e administradores podem editar ou remover.
- /api/library/: biblioteca do usuário autenticado; envie book_id e status READ ou WISHLIST.
- /api/reviews/: avaliações do usuário; envie book_id, rating (1 a 5) e comentário opcional.
- /api/trending/: consulta autenticada; alterações somente para administradores.
- /admin/: administração do Django.

A biblioteca e as avaliações são filtradas pelo usuário autenticado. Remover uma entrada da biblioteca não remove o livro do catálogo.
