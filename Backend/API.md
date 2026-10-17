# API MyBooks

Esta documentação corresponde às rotas e aos serializers atuais do backend. A API usa JSON e termina todas as rotas com `/`. Em desenvolvimento, a URL base é `http://127.0.0.1:8000`; em produção, use o domínio HTTPS configurado.

## Autenticação

O cadastro e os endpoints de token são públicos. Os demais endpoints exigem JWT no cabeçalho:

```http
Authorization: Bearer <access>
Content-Type: application/json
```

### Criar conta

`POST /api/auth/register/`

```json
{
  "username": "ana",
  "email": "ana@example.com",
  "password": "Uma-senha-forte-123",
  "first_name": "Ana",
  "last_name": "Leitora"
}
```

`username`, `email` e `password` são obrigatórios; nome e sobrenome são opcionais. A senha precisa ter pelo menos oito caracteres e passar pelas validações de senha do Django. A resposta `201` contém o usuário criado, sem a senha.

### Obter tokens

`POST /api/auth/token/`

```json
{"username": "ana", "password": "Uma-senha-forte-123"}
```

A resposta `200` contém `access` e `refresh`. Use `access` nas chamadas autenticadas.

### Renovar token de acesso

`POST /api/auth/token/refresh/`

```json
{"refresh": "<refresh>"}
```

A resposta `200` contém um novo `access`.

## Permissões

| Recurso | Leitura | Criação | Edição e remoção |
|---|---|---|---|
| `/api/books/` | Usuário autenticado | Usuário autenticado | Administrador (`is_staff`) |
| `/api/library/` | Apenas a própria biblioteca | Usuário autenticado; o dono é definido pelo token | Apenas o próprio registro |
| `/api/reviews/` | Apenas as próprias avaliações | Usuário autenticado; o dono é definido pelo token | Apenas a própria avaliação |
| `/api/trending/` | Usuário autenticado | Administrador (`is_staff`) | Administrador (`is_staff`) |

As rotas de biblioteca e avaliações não aceitam `user_id` no corpo. Um usuário não pode consultar ou alterar registros de outra pessoa.

## Recursos

As listas são paginadas com até 20 itens por página. A resposta inclui `count`, `next`, `previous` e `results`; use `?page=2` para avançar.
Criações bem-sucedidas retornam `201`, consultas e atualizações retornam `200`, e exclusões bem-sucedidas retornam `204`.

### Livros

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/books/` | Lista livros do catálogo |
| `POST` | `/api/books/` | Cadastra um livro |
| `GET` | `/api/books/{id}/` | Consulta um livro |
| `PUT`, `PATCH` | `/api/books/{id}/` | Atualiza um livro (administrador) |
| `DELETE` | `/api/books/{id}/` | Remove um livro (administrador) |

Exemplo de criação:

```json
{
  "title": "Duna",
  "author": "Frank Herbert",
  "synopsis": "Uma aventura no planeta Arrakis.",
  "cover_url": "https://example.com/duna.jpg",
  "publication_date": "1965-08-01"
}
```

`title` e `author` são obrigatórios. `synopsis`, `cover_url` e `publication_date` são opcionais. A data usa `AAAA-MM-DD`. O catálogo rejeita livros com título e autor iguais, sem diferenciar maiúsculas de minúsculas.

A resposta de livro inclui `id`, esses campos e `created_at` em formato ISO 8601.

### Biblioteca pessoal

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/library/` | Lista os livros da pessoa autenticada |
| `POST` | `/api/library/` | Adiciona um livro à biblioteca |
| `GET` | `/api/library/{id}/` | Consulta um item próprio |
| `PUT`, `PATCH` | `/api/library/{id}/` | Atualiza o status de um item próprio |
| `DELETE` | `/api/library/{id}/` | Remove o item da biblioteca |

Exemplo de criação:

```json
{"book_id": 12, "status": "WANT_TO_READ"}
```

`book_id` deve referenciar um livro existente. `status` aceita `WANT_TO_READ` (Quero ler), `READING` (Lendo) ou `READ` (Lido). O mesmo livro não pode aparecer duas vezes na biblioteca da mesma pessoa. Um livro com avaliação não pode ser movido para outra categoria; excluir o item também exclui sua avaliação, mas mantém o livro no catálogo.

A resposta inclui `id`, `status`, `added_at` e o objeto `book` do catálogo.

### Avaliações

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/reviews/` | Lista as avaliações da pessoa autenticada |
| `POST` | `/api/reviews/` | Avalia um livro lido |
| `GET` | `/api/reviews/{id}/` | Consulta uma avaliação própria |
| `PUT`, `PATCH` | `/api/reviews/{id}/` | Atualiza uma avaliação própria |
| `DELETE` | `/api/reviews/{id}/` | Remove uma avaliação própria |

Exemplo:

```json
{"book_id": 12, "rating": 5, "comment": "Uma leitura excelente."}
```

`book_id` e `rating` são obrigatórios na criação; `comment` é opcional. `rating` aceita um inteiro de `1` a `5`. Só é permitido avaliar livros com status `READ` (Lido), e cada pessoa pode ter uma avaliação por livro. A resposta inclui o objeto `book` com os dados do catálogo.

A resposta também inclui `id` e `reviewed_at` em formato ISO 8601.

### Tendências

| Método | Rota | Ação |
|---|---|---|
| `GET` | `/api/trending/` | Lista os destaques definidos pela administração |
| `GET` | `/api/trending/{id}/` | Consulta um destaque |
| `POST` | `/api/trending/` | Adiciona um destaque (administrador) |
| `PUT`, `PATCH` | `/api/trending/{id}/` | Atualiza posição ou livro (administrador) |
| `DELETE` | `/api/trending/{id}/` | Remove um destaque (administrador) |

Exemplo de criação administrativa:

```json
{"book_id": 12, "position": 1}
```

Cada livro pode aparecer uma vez na lista de tendências. Para adicionar um destaque à categoria Quero ler, crie uma entrada em `/api/library/` com `status: "WANT_TO_READ"`.

## Respostas de erro

| HTTP | Significado comum |
|---|---|
| `400` | Campo inválido, regra de negócio violada ou duplicidade |
| `401` | Token ausente, inválido ou expirado |
| `403` | Usuário sem permissão administrativa |
| `404` | Recurso inexistente ou que não pertence à pessoa autenticada |

Erros de validação retornam JSON com os campos que precisam ser corrigidos, por exemplo:

```json
{"rating": ["mensagem informando que a nota deve estar entre 1 e 5"]}
```

Duplicidades conhecidas retornam mensagens nos campos `title`, `book` ou `book_id`, `username` e `email` (a chave da biblioteca pode variar entre validação do modelo e colisão no banco). Erros `401` e `403` não incluem detalhes de validação.
