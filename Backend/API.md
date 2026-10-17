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
| `/api/shared-libraries/` | Participantes | Usuário autenticado cria; proprietário define o nome | Proprietário pode editar ou excluir |
| `/api/shared-books/` | Participantes | Participante adiciona livro | Quem adicionou pode remover |
| `/api/shared-reading/` | Apenas o próprio progresso, visível também na estante compartilhada | Criado automaticamente | Cada participante edita apenas o próprio progresso |
| `/api/shared-invitations/` | Remetente e destinatário | Proprietário envia convite | Destinatário aceita/recusa; remetente cancela convite pendente |
| `/api/shared-removal-requests/` | Solicitante e responsável pela decisão | Participante pede remoção de livro adicionado por outra pessoa | Quem adicionou aprova ou recusa |
| `/api/mailbox/` | Apenas o destinatário | Reúne cartas e notificações recebidas | A abertura é registrada nos recursos de origem |

### Busca e filtros

As listas do catálogo, da biblioteca pessoal e das estantes compartilhadas aceitam parâmetros de busca e filtros. `search` procura por título ou autor; `genre` procura pelo gênero; `status` filtra pelo status individual de leitura (`WANT_TO_READ`, `READING` ou `READ`).

```text
GET /api/books/?search=machado&genre=romance
GET /api/library/?search=dom&status=READ
GET /api/shared-books/?genre=ficção&status=READING
```

Os parâmetros podem ser combinados. Os resultados continuam paginados e respeitam as permissões de cada rota: a biblioteca pessoal mostra apenas os livros do usuário autenticado; na estante compartilhada, o filtro de status usa o progresso do próprio participante.

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
  "genre": "Ficção científica",
  "total_pages": 412,
  "cover_url": "https://example.com/duna.jpg",
  "publication_date": "1965-08-01"
}
```

`title` e `author` são obrigatórios. `synopsis`, `genre`, `total_pages`, `cover_url` e `publication_date` são opcionais. `total_pages`, quando informado, deve ser maior que zero. A data usa `AAAA-MM-DD`. O catálogo rejeita livros com título e autor iguais, sem diferenciar maiúsculas de minúsculas.

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

`book_id` deve referenciar um livro existente. `status` aceita `WANT_TO_READ` (Quero ler), `READING` (Lendo) ou `READ` (Lido). `pages_read` é o número de páginas já lidas pelo usuário e começa em `0`; ele não pode ultrapassar `total_pages` quando o total estiver cadastrado. Para usar o status `READ`, o livro precisa ter total de páginas cadastrado e `pages_read` deve ser igual a esse total. O mesmo livro não pode aparecer duas vezes na biblioteca da mesma pessoa. Um livro com avaliação não pode ser movido para outra categoria; excluir o item também exclui sua avaliação, mas mantém o livro no catálogo.

Exemplo de atualização do progresso:

```json
{"status": "READING", "pages_read": 120}
```

A resposta inclui `id`, `status`, `pages_read`, `added_at` e o objeto `book` do catálogo.

### Bibliotecas compartilhadas

`POST /api/shared-libraries/` cria uma biblioteca. A pessoa autenticada torna-se proprietária e primeira participante:

```json
{"name": "Nossa estante"}
```

`GET /api/shared-libraries/` lista as bibliotecas das quais a pessoa participa. A resposta contém `id`, nome, usuário proprietário, nomes dos participantes e data de criação. Participantes podem consultar a biblioteca; somente o proprietário pode alterar seu nome ou excluí-la.

### Convites internos

`GET /api/shared-invitations/` lista os convites enviados e recebidos pela pessoa autenticada. Essa lista serve de caixa de entrada do convite no site; não é enviado e-mail externo.

`GET /api/mailbox/` reúne convites e pedidos de remoção recebidos em uma única caixa de entrada, ordenados do mais recente ao mais antigo. Cada item informa seu tipo, remetente, assunto, conteúdo, status, data de abertura e ações disponíveis. A resposta também inclui `unread_count` para exibir a quantidade de cartas ainda não abertas. A caixa retorna apenas itens recebidos pelo usuário autenticado.

O proprietário convida uma conta MyBooks pelo nome de usuário:

`POST /api/shared-invitations/`

```json
{"shared_library_id": 3, "recipient_username": "bia"}
```

O convite começa como `PENDING`. Para registrar a abertura da carta, o destinatário chama `POST /api/shared-invitations/{id}/open/`; a resposta inclui `opened_at`. O destinatário pode responder por `POST /api/shared-invitations/{id}/accept/` ou `/decline/`. O remetente pode cancelar um convite ainda pendente com `DELETE /api/shared-invitations/{id}/`. Convites duplicados pendentes para a mesma biblioteca e pessoa são bloqueados.

Ao aceitar, a pessoa passa a ser participante e ganha registros individuais de leitura para os livros que já estão na estante compartilhada. O proprietário e o destinatário aparecem como participantes da biblioteca.

### Livros e progresso na biblioteca compartilhada

`GET /api/shared-books/` lista os livros das bibliotecas compartilhadas da pessoa. Para adicionar um livro já existente no catálogo:

`POST /api/shared-books/`

```json
{"shared_library_id": 3, "book_id": 12}
```

Cada livro fica associado a quem o adicionou. Os participantes recebem um estado pessoal para o livro, contendo categoria e páginas lidas. O estado inicial é herdado da biblioteca pessoal ou de outro registro compartilhado da mesma obra, se houver; caso contrário, começa em `WANT_TO_READ`, com zero páginas lidas. Remover o livro da estante não apaga esses estados pessoais nem as avaliações.

`GET /api/shared-reading/` lista os estados de leitura próprios; `GET /api/shared-reading/{id}/` consulta um estado e `PATCH /api/shared-reading/{id}/` atualiza a categoria ou as páginas lidas. A resposta da estante compartilhada também inclui o progresso de cada participante. O status `READ` mantém as mesmas validações de total de páginas da biblioteca pessoal.

Quem adicionou o livro pode removê-lo diretamente com `DELETE /api/shared-books/{id}/`. Para pedir que outra pessoa remova a obra, um participante envia:

`POST /api/shared-removal-requests/`

```json
{"shared_book_id": 12}
```

A solicitação aparece como notificação interna para quem adicionou o livro. `GET /api/shared-removal-requests/` lista pedidos enviados e recebidos; cada registro inclui livro, biblioteca, solicitante, responsável e status. A pessoa responsável registra a abertura com `POST /api/shared-removal-requests/{id}/open/` e pode responder com `POST /api/shared-removal-requests/{id}/approve/` ou `/deny/`. Ao aprovar, a obra é removida da estante; ao recusar, ela permanece. Solicitações pendentes duplicadas para a mesma obra são bloqueadas. O histórico individual de progresso permanece disponível em `/api/shared-reading/` após a remoção.

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
