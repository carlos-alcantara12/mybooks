# MyBooks — Biblioteca Digital Pessoal

O **MyBooks** é um projeto de aplicação web pensado para ajudar leitores a organizar sua vida literária em um só lugar. A proposta é permitir que cada pessoa mantenha um catálogo pessoal de livros, acompanhe o que já leu, planeje futuras leituras e registre suas opiniões sobre as obras.

Além de ser útil no dia a dia, o projeto serve como exemplo prático de desenvolvimento de software: reúne modelagem de dados, API REST, autenticação, regras de negócio, validação de informações e uma base para a futura construção de uma interface web.

> **Estado do projeto nesta versão:** o backend Django e sua API estão presentes no pacote. A pasta `Frontend_react` está vazia nesta cópia; portanto, a interface React prevista na especificação ainda precisa ser desenvolvida ou integrada. As funcionalidades descritas abaixo distinguem o que já existe no backend da experiência visual planejada.

---

## Sumário

- [1. Qual problema o MyBooks resolve?](#1-qual-problema-o-mybooks-resolve)
- [2. Principais funcionalidades](#2-principais-funcionalidades)
- [3. Como funciona na prática](#3-como-funciona-na-prática)
- [4. Regras de negócio e proteção dos dados](#4-regras-de-negócio-e-proteção-dos-dados)
- [5. Tecnologias utilizadas](#5-tecnologias-utilizadas)
- [6. Arquitetura do projeto](#6-arquitetura-do-projeto)
- [7. API disponível](#7-api-disponível)
- [8. Como executar o backend localmente](#8-como-executar-o-backend-localmente)
- [9. Exemplos de uso da API](#9-exemplos-de-uso-da-api)
- [10. Aplicações no mercado de trabalho](#10-aplicações-no-mercado-de-trabalho)
- [11. Ideias para evolução](#11-ideias-para-evolução)
- [12. Escopo atual e próximos passos](#12-escopo-atual-e-próximos-passos)

## 1. Qual problema o MyBooks resolve?

Quem lê com frequência pode ter dificuldade para lembrar quais livros já terminou, quais deseja ler e quais foram suas impressões sobre cada obra. O MyBooks propõe centralizar essas informações em uma biblioteca digital pessoal.

A aplicação foi pensada para:

- manter um histórico de leitura;
- organizar uma lista de próximas leituras;
- registrar notas de 1 a 5 estrelas e comentários;
- consultar livros cadastrados no catálogo;
- destacar livros selecionados como tendências.

O projeto começa como uma biblioteca pessoal. Em versões futuras, poderá evoluir para uma plataforma de descoberta e recomendação de livros.

## 2. Principais funcionalidades

### Cadastro e autenticação

O backend oferece um endpoint de cadastro de usuários e autenticação baseada em tokens JWT. O e-mail do usuário é único, e a senha passa pelas validações de senha do Django.

### Catálogo de livros

Cada obra pode conter:

- título;
- autor;
- sinopse opcional;
- URL da capa opcional;
- data de publicação opcional.

O catálogo é compartilhado entre usuários. O backend valida possíveis duplicidades considerando título e autor sem diferenciar maiúsculas e minúsculas.

### Biblioteca pessoal

Cada usuário pode incluir uma obra em sua própria biblioteca e classificá-la como:

- **Desejado (`WISHLIST`)** — livro que pretende ler;
- **Lido (`READ`)** — livro que já concluiu.

A mesma obra não pode ser adicionada duas vezes à biblioteca do mesmo usuário. Remover uma entrada da biblioteca não apaga o livro do catálogo compartilhado.

### Avaliações e comentários

O usuário pode atribuir uma nota de **1 a 5 estrelas** e adicionar um comentário opcional a um livro marcado como lido. Cada usuário mantém no máximo uma avaliação por livro, que pode ser consultada, editada ou removida.

### Livros em tendência

O backend disponibiliza uma lista de livros em destaque, ordenada pela posição definida pela administração. Nesta versão, as tendências são **administradas manualmente**; não são calculadas automaticamente com base nas leituras dos usuários.

### Administração

O Django Admin permite que administradores autorizados gerenciem os registros conforme as permissões configuradas no backend.

## 3. Como funciona na prática

Um fluxo típico de uso seria:

1. A pessoa cria uma conta e obtém um token de acesso.
2. Consulta o catálogo ou cadastra uma obra, conforme suas permissões.
3. Adiciona o livro à própria biblioteca como `WISHLIST` ou `READ`.
4. Se já leu a obra, registra uma avaliação de 1 a 5 e um comentário opcional.
5. Consulta sua biblioteca e a seleção de livros em tendência.

A interface visual descrita na especificação deverá organizar esses fluxos em páginas como **Início**, **Meus livros**, **Tendências**, **Adicionar livro** e **Minha conta**. Essas telas dependem da implementação do frontend, ainda não incluído nesta cópia.

## 4. Regras de negócio e proteção dos dados

O backend aplica regras importantes para manter a consistência:

- Os endpoints da API exigem autenticação por padrão, exceto o cadastro de conta.
- Cada usuário consulta e altera apenas suas próprias entradas da biblioteca e avaliações.
- Só é possível avaliar um livro que esteja marcado como lido.
- A nota deve ficar entre 1 e 5.
- Um usuário não pode criar avaliações duplicadas para a mesma obra.
- A API impede que um livro seja duplicado na biblioteca da mesma pessoa.
- A edição e a remoção de livros do catálogo e a manutenção das tendências são restritas a administradores.
- A remoção de uma entrada da biblioteca também remove a avaliação associada àquela obra para aquele usuário, sem apagar o livro do catálogo compartilhado.

**Observação de segurança:** a configuração incluída é apropriada para desenvolvimento local, não para publicação direta em produção. Antes de disponibilizar o sistema publicamente, configure uma chave secreta forte por variável de ambiente, desative o modo de depuração, defina os hosts permitidos, escolha e configure um banco de dados de produção e revise HTTPS, CORS/CSRF conforme a arquitetura, backups, logs e políticas de acesso.

## 5. Tecnologias utilizadas

| Tecnologia | Papel no projeto |
|---|---|
| Python | Linguagem principal do backend |
| Django | Estrutura da aplicação, modelos, administração e configuração |
| Django REST Framework | Construção da API REST e serialização dos dados |
| Simple JWT | Autenticação por tokens de acesso e renovação |
| SQLite | Banco de dados configurado para desenvolvimento local |
| React, HTML, CSS e JavaScript | Tecnologias previstas para a interface web; frontend ainda não presente nesta cópia |

## 6. Arquitetura do projeto

```text
Mybooks/
├── Backend/
│   ├── config/
│   │   ├── settings.py       # Configurações do Django
│   │   └── urls.py           # Rotas principais da aplicação
│   ├── manage.py             # Comandos administrativos do Django
│   ├── models.py             # Usuário, livro, biblioteca, avaliação e tendências
│   ├── serializers.py        # Conversão e validação dos dados da API
│   ├── views.py              # Operações e permissões dos endpoints
│   ├── urls.py               # Rotas da API
│   └── requirements.txt      # Dependências Python
├── Docs/
│   └── tech_spec.txt         # Especificação funcional e regras do projeto
├── Frontend_react/           # Diretório reservado ao frontend React
└── README.md                 # Documentação geral do projeto
```

A API separa as responsabilidades: os **models** representam os dados e suas regras, os **serializers** validam a entrada e a saída, as **views** definem as operações e permissões, e as **URLs** mapeiam os caminhos disponíveis.

## 7. API disponível

Com o backend em execução, a API fica sob o prefixo `/api/`.

| Método e caminho | Finalidade |
|---|---|
| `POST /api/auth/register/` | Criar uma conta |
| `POST /api/auth/token/` | Obter tokens JWT usando usuário e senha |
| `POST /api/auth/token/refresh/` | Renovar o token de acesso |
| `/api/books/` | Consultar o catálogo; criar obras para usuários autenticados; editar/remover como administrador |
| `/api/library/` | Consultar e gerenciar a biblioteca do usuário autenticado |
| `/api/reviews/` | Consultar e gerenciar as avaliações do usuário autenticado |
| `/api/trending/` | Consultar livros em tendência; alterar a lista como administrador |
| `/admin/` | Acessar a administração do Django |

Os endpoints de listagem e detalhe são fornecidos pelo Django REST Framework. Para operações protegidas, envie o token no cabeçalho:

```http
Authorization: Bearer SEU_TOKEN_DE_ACESSO
```

A API utiliza paginação por número de página, com 20 registros por página na configuração atual.

## 8. Como executar o backend localmente

### Pré-requisitos

- Python compatível com as versões de Django definidas em `Backend/requirements.txt`;
- terminal (PowerShell, Prompt de Comando ou terminal integrado do editor);
- Git é opcional para executar o projeto localmente.

### Windows — PowerShell

Na raiz da pasta do projeto, entre no backend:

```powershell
cd Backend
```

Crie e ative um ambiente virtual:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Instale as dependências:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Crie as migrações e aplique-as ao banco:

```powershell
python manage.py makemigrations Backend
python manage.py migrate
```

Crie um administrador para acessar o Django Admin:

```powershell
python manage.py createsuperuser
```

Inicie o servidor de desenvolvimento:

```powershell
python manage.py runserver
```

Por padrão, o servidor local fica disponível em `http://127.0.0.1:8000/`. A API começa em `http://127.0.0.1:8000/api/` e a administração em `http://127.0.0.1:8000/admin/`.

> Se o PowerShell bloquear a ativação do ambiente virtual por política de execução, consulte a política configurada no seu computador ou use o comando de ativação apropriado ao seu ambiente. Não é necessário alterar políticas de segurança globalmente apenas para executar o projeto.

### Variáveis de ambiente

O backend reconhece estas variáveis:

- `DJANGO_SECRET_KEY` — chave secreta do Django;
- `DJANGO_DEBUG` — modo de depuração (`true` ou `false`);
- `DJANGO_ALLOWED_HOSTS` — hosts permitidos separados por vírgula.

A configuração padrão é voltada ao ambiente local. Não publique o sistema com a chave de desenvolvimento ou `DEBUG` habilitado.

## 9. Exemplos de uso da API

Os exemplos abaixo ilustram o formato das requisições. Execute primeiro o servidor e substitua os valores ilustrativos pelos IDs e tokens retornados pela sua instalação.

### Criar uma conta

```http
POST /api/auth/register/
Content-Type: application/json
```

```json
{
  "username": "leitor_demo",
  "first_name": "Leitor",
  "last_name": "Demo",
  "email": "leitor@example.com",
  "password": "Use-Uma-Senha-Forte-123!"
}
```

### Obter token de acesso

```http
POST /api/auth/token/
Content-Type: application/json
```

```json
{
  "username": "leitor_demo",
  "password": "Use-Uma-Senha-Forte-123!"
}
```

A resposta inclui os tokens `access` e `refresh`.

### Consultar livros

```http
GET /api/books/
Authorization: Bearer SEU_TOKEN_DE_ACESSO
```

### Adicionar um livro à biblioteca

O livro precisa existir no catálogo. Use o identificador retornado pela API:

```http
POST /api/library/
Authorization: Bearer SEU_TOKEN_DE_ACESSO
Content-Type: application/json
```

```json
{
  "book_id": 1,
  "status": "WISHLIST"
}
```

Para registrar um livro como lido, use `"status": "READ"`.

### Avaliar um livro lido

```http
POST /api/reviews/
Authorization: Bearer SEU_TOKEN_DE_ACESSO
Content-Type: application/json
```

```json
{
  "book_id": 1,
  "rating": 5,
  "comment": "Leitura envolvente e muito bem construída."
}
```

A avaliação será rejeitada se a obra não estiver marcada como lida na biblioteca daquele usuário.

## 10. Aplicações no mercado de trabalho

O MyBooks é um projeto de portfólio que permite demonstrar conhecimentos transferíveis para sistemas reais. A utilidade profissional não está apenas no tema de livros, mas nas decisões técnicas implementadas.

### Desenvolvimento backend

O projeto pode demonstrar experiência com:

- criação de APIs REST;
- modelagem relacional e relacionamentos entre entidades;
- validação de dados e regras de negócio;
- autenticação JWT e permissões;
- operações de criação, consulta, atualização e remoção (CRUD);
- organização de responsabilidades em uma aplicação Django.

Esses conhecimentos são aplicáveis a sistemas de inventário, gestão de clientes, plataformas educacionais, catálogos de produtos e ferramentas internas.

### Desenvolvimento frontend

Quando a interface React for construída, ela poderá demonstrar:

- consumo de APIs;
- formulários e validação de entradas;
- gerenciamento de estado;
- navegação entre páginas;
- componentes reutilizáveis;
- apresentação responsiva de dados.

### Análise de sistemas e engenharia de software

A especificação em `Docs/tech_spec.txt` ajuda a mostrar como requisitos podem ser traduzidos em entidades, fluxos, restrições e critérios técnicos. Isso se relaciona ao trabalho de análise de requisitos, desenho de soluções e comunicação entre desenvolvimento e negócio.

### Qualidade e testes

As regras de negócio oferecem casos concretos para testes automatizados, por exemplo: impedir notas fora do intervalo, bloquear avaliações de livros não lidos, garantir isolamento dos dados por usuário e verificar que a remoção de um item pessoal não apague o registro compartilhado do livro.

### Produto digital e evolução de funcionalidades

A área de tendências cria uma base para discutir curadoria, descoberta de conteúdo e, futuramente, recomendações. A versão atual usa uma seleção administrada manualmente; um algoritmo de tendências ou recomendações ainda seria uma evolução, não uma funcionalidade já concluída.

**Como apresentar o projeto em entrevistas:** explique o problema, mostre a arquitetura, demonstre uma requisição real à API, justifique as regras de acesso e descreva os testes realizados. Diferencie com clareza o que está implementado do que está planejado.

## 11. Ideias para evolução

Possíveis melhorias futuras, a serem priorizadas conforme o objetivo do projeto:

1. **Frontend React:** implementar as telas previstas e conectar os formulários à API.
2. **Testes automatizados:** testar autenticação, permissões, validações e fluxos da biblioteca.
3. **Busca e filtros:** permitir pesquisar por título ou autor e filtrar por status.
4. **Integração com catálogo externo:** obter metadados e capas por uma fonte apropriada, respeitando os termos de uso.
5. **Tendências baseadas em dados:** definir critérios mensuráveis, como leituras recentes, e não apenas uma lista manual.
6. **Recomendações personalizadas:** sugerir obras com base em preferências, avaliações e histórico, com critérios transparentes.
7. **Banco de dados de produção:** migrar de SQLite para uma solução adequada à hospedagem escolhida.
8. **Deploy e observabilidade:** configurar ambiente de produção, logs, monitoramento e backups.
9. **Acessibilidade e experiência de uso:** garantir navegação por teclado, contraste adequado e interface adaptável.
10. **Documentação interativa da API:** disponibilizar uma especificação OpenAPI/Swagger, após configurar e validar essa integração.

## 12. Escopo atual e próximos passos

Esta cópia contém a base do backend: modelos, serializadores, views, rotas, configuração de autenticação JWT e integração com o Django Admin. O diretório `Frontend_react` está vazio no arquivo fornecido, e este README não afirma que uma interface completa já esteja disponível.

Uma sequência de trabalho recomendada é:

1. validar a instalação e as migrações do backend;
2. testar os endpoints e as permissões;
3. criar testes automatizados para as regras de negócio;
4. implementar o frontend React e integrá-lo à API;
5. revisar a segurança e configurar o ambiente de produção antes de publicar.

O objetivo é evoluir o **mesmo projeto MyBooks**, mantendo a documentação junto ao código e registrando aqui mudanças relevantes de arquitetura e execução.

---

## Licença

Nenhuma licença de distribuição foi identificada nesta cópia. Antes de publicar o repositório como software aberto, escolha e adicione uma licença apropriada.
