# Backend MyBooks (Django REST Framework)

## Desenvolvimento local

1. Crie e ative um ambiente virtual Python.
2. Instale as dependências: `pip install -r requirements.txt`.
3. No PowerShell, habilite o modo local com `$env:DJANGO_DEBUG="true"`; no Bash, use `export DJANGO_DEBUG=true`.
4. Aplique as migrações: `python manage.py migrate`.
5. Crie um administrador: `python manage.py createsuperuser`.
6. Inicie o servidor local: `python manage.py runserver`.

O modo local usa SQLite e uma chave de desenvolvimento. Não use essa chave em produção. As migrações do app `Backend` ficam versionadas em `migrations/`; crie novas migrações com `python manage.py makemigrations Backend` após alterar os modelos.

## Testes automatizados

Com o ambiente virtual ativo e `DJANGO_DEBUG=true`, execute `python manage.py test Backend.tests`. Os testes usam o banco temporário do Django e cobrem autenticação, isolamento de dados, duplicidades, regras de avaliação e permissões de tendências.

## Produção

1. Copie `.env.example` para `.env` e substitua todos os valores de exemplo; `.env` é ignorado pelo Git.
2. Gere uma chave Django aleatória com pelo menos 50 caracteres e configure hosts, origens CSRF e credenciais do PostgreSQL.
3. Garanta que o proxy ou balanceador forneça HTTPS. Se terminar TLS no proxy, configure `DJANGO_TRUST_X_FORWARDED_PROTO=true` somente quando o proxy remover headers encaminhados enviados pelo cliente.
4. Aplique as migrações com `python manage.py migrate` e reúna os arquivos estáticos com `python manage.py collectstatic --noinput`.
5. Confira a configuração com `python manage.py check --deploy` e execute a aplicação com um servidor WSGI/ASGI apropriado ao ambiente; enquanto HSTS estiver desativado, o Django pode emitir um aviso de implantação relacionado a essa proteção.

Em produção, `DEBUG` fica desativado por padrão, PostgreSQL é obrigatório, segredo e hosts são exigidos, redirecionamento HTTPS e cookies seguros ficam ativos por padrão. HSTS começa desativado; habilite-o depois de confirmar HTTPS para o domínio. Configure backups do banco e mantenha segredos no gerenciador de segredos do provedor, não em arquivos versionados.

## Autenticação e API

Referência detalhada de endpoints, payloads, permissões e erros: [API.md](API.md).

- `POST /api/auth/register/`: cria uma conta (`username`, `email` e `password`; nome e sobrenome opcionais).
- `POST /api/auth/token/`: recebe usuário e senha e retorna tokens JWT.
- `POST /api/auth/token/refresh/`: renova o token de acesso.
- Envie o token em `Authorization: Bearer <token>`.
- `/api/books/`: catálogo compartilhado com gênero e total de páginas opcionais; consulta e cadastro para usuários autenticados, edição e remoção para administradores.
- `/api/library/`: biblioteca do usuário autenticado; recebe `book_id`, status `WANT_TO_READ`, `READING` ou `READ` e `pages_read` individual.
- `/api/reviews/`: avaliações do usuário autenticado; recebe `book_id`, nota de 1 a 5 e comentário opcional.
- `/api/trending/`: consulta autenticada; alterações somente por administradores.
- `/api/shared-libraries/`, `/api/shared-books/`, `/api/shared-reading/`, `/api/shared-invitations/` e `/api/shared-removal-requests/`: bibliotecas compartilhadas, estantes, progresso individual, convites e pedidos internos de remoção.
- `/api/mailbox/`: caixa de entrada unificada de convites e notificações internas, com contador de itens não abertos.
- `/admin/`: administração Django.

A biblioteca e as avaliações são filtradas pelo usuário autenticado. Remover uma entrada não remove a obra do catálogo.
