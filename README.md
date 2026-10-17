# MyBooks — Biblioteca Digital Pessoal

O **MyBooks** é uma aplicação web para organizar livros e acompanhar a vida de leitura. A proposta inclui bibliotecas pessoais e compartilhadas, progresso por páginas, avaliações, sessões de leitura e uma experiência visual imersiva inspirada em uma estante física.

Além de ser útil no dia a dia, o projeto serve como exemplo prático de desenvolvimento de software: reúne modelagem de dados, API REST, autenticação, regras de negócio, validação de informações e uma base para a futura construção de uma interface web.

> **Estado do projeto nesta versão:** o backend Django oferece bibliotecas pessoais e compartilhadas, correio interno, convites, pedidos de remoção, avaliações e progresso por páginas. O frontend React começou com a tela de entrada animada e uma transição para a área da biblioteca. Timer, gráficos, estante interativa e integração completa com a API ainda precisam ser implementados.

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

- organizar livros nas categorias **Quero ler**, **Lendo** e **Lido**;
- acompanhar o avanço da leitura por páginas e gráficos;
- registrar notas de 1 a 5 estrelas e comentários pessoais;
- cronometrar sessões de leitura e acompanhar metas de tempo;
- montar uma biblioteca compartilhada com outra pessoa;
- consultar livros cadastrados no catálogo;
- destacar livros selecionados como tendências.

O projeto combina o acompanhamento individual de cada leitor com a possibilidade de organizar livros em conjunto. Recursos sociais mais amplos e recomendações personalizadas poderão ser considerados em versões futuras.

## 2. Principais funcionalidades

### Cadastro e autenticação

O backend oferece um endpoint de cadastro de usuários e autenticação baseada em tokens JWT. O e-mail do usuário é único, e a senha passa pelas validações de senha do Django.

### Catálogo de livros

Cada obra pode conter:

- título;
- autor;
- sinopse opcional;
- URL da capa opcional;
- data de publicação opcional;
- gênero opcional;
- total de páginas opcional até o dado ser conhecido.

O catálogo é compartilhado entre usuários. O backend valida possíveis duplicidades considerando título e autor sem diferenciar maiúsculas e minúsculas.

### Biblioteca pessoal

Cada usuário poderá incluir uma obra em sua biblioteca e classificá-la como:

- **Quero ler** — livro planejado para leitura;
- **Lendo** — livro em andamento, com progresso individual em páginas;
- **Lido** — livro concluído.

O usuário registra as páginas lidas em seu próprio item da biblioteca. Esse número não pode ultrapassar o total cadastrado. Para marcar um livro como **Lido**, o total precisa estar informado e as páginas lidas devem ser iguais a ele. O catálogo é compartilhado, mas status, progresso, avaliações, comentários e sessões de leitura pertencem a cada usuário.

### Biblioteca compartilhada e correio interno

Usuários podem organizar livros em uma biblioteca em conjunto. O backend oferece bibliotecas, participantes, convites e uma caixa interna unificada, sem envio de e-mail externo. A API apresenta cada item como uma carta, com remetente, assunto, conteúdo, status e ações. A abertura é registrada para que o frontend mostre o convite após a animação de retirar a carta do correio.

Os participantes veem a estante comum, mas mantêm seus próprios status de leitura, progresso e avaliações. Cada livro adicionado à estante compartilhada fica associado a quem o incluiu. Quem adicionou pode remover diretamente; outro participante pode enviar um pedido interno, que chega como notificação para a pessoa responsável. Ela pode aprovar a remoção ou recusá-la. O progresso individual permanece guardado após a retirada da obra da estante.

### Progresso, gráficos e timer

O backend registra páginas lidas por usuário, calcula validações contra o total e mantém esse progresso individual também em livros compartilhados. Gráficos e resumos diários, semanais e mensais ainda serão feitos no frontend; o timer e as metas de tempo também permanecem planejados.

### Estante e experiência visual

A interface planejada terá uma estante realista de madeira com livros físicos e capas originais quando disponíveis. Ao passar o mouse, um livro se inclina para fora; ao selecioná-lo, é retirado e aberto para mostrar capa, título, autor, **resumo da obra**, gênero, total e progresso de páginas, categoria e avaliação pessoal. Se uma capa não estiver disponível, a interface poderá exibir uma capa padrão.

Na entrada do site, **MyBooks** será escrito com caligrafia elegante. A tela também exibirá uma frase literária diferente a cada abertura, acompanhada do título da obra e do autor. O usuário prosseguirá por clique, toque ou tecla Enter. A interface será responsiva e terá alternativa para dispositivos que preferem movimento reduzido.

### Avaliações e comentários

O usuário pode atribuir uma nota de **1 a 5 estrelas** e adicionar um comentário opcional a um livro marcado como lido. Cada usuário mantém no máximo uma avaliação por livro, que pode ser consultada, editada ou removida.

### Livros em tendência

O backend disponibiliza uma lista de livros em destaque, ordenada pela posição definida pela administração. Nesta versão, as tendências são **administradas manualmente**; não são calculadas automaticamente com base nas leituras dos usuários.

### Administração

O Django Admin permite que administradores autorizados gerenciem os registros conforme as permissões configuradas no backend.

## 3. Como funciona na prática

Um fluxo previsto de uso seria:

1. A pessoa cria uma conta e obtém um token de acesso.
2. Consulta o catálogo ou cadastra uma obra, conforme suas permissões.
3. Adiciona o livro à biblioteca como **Quero ler** ou **Lendo**.
4. Atualiza as páginas lidas, acompanha gráficos e pode cronometrar sessões.
5. Ao atingir o total de páginas, marca o livro como **Lido** e pode registrar uma avaliação de 1 a 5 estrelas e um comentário.
6. Se desejar, aceita um convite recebido no correio interno e participa de uma biblioteca compartilhada.

A tela de entrada já apresenta a escrita animada de MyBooks, uma frase literária variável e a ação para prosseguir. As demais ações do fluxo dependem das próximas telas do frontend, incluindo estante animada, abertura dos livros e integração com a API.

## 4. Regras de negócio e proteção dos dados

O backend atual aplica regras importantes para manter a consistência:

- Os endpoints da API exigem autenticação por padrão, exceto o cadastro de conta.
- Cada usuário consulta e altera apenas suas próprias entradas da biblioteca e avaliações.
- Só é possível avaliar um livro que esteja marcado como lido.
- A nota deve ficar entre 1 e 5.
- Um usuário não pode criar avaliações duplicadas para a mesma obra.
- A API impede que um livro seja duplicado na biblioteca da mesma pessoa.
- A edição e a remoção de livros do catálogo e a manutenção das tendências são restritas a administradores.
- A remoção de uma entrada da biblioteca também remove a avaliação associada àquela obra para aquele usuário, sem apagar o livro do catálogo compartilhado.

O backend valida que o progresso não ultrapasse o total cadastrado e exige igualdade entre páginas lidas e total para marcar um livro como **Lido**. O catálogo também impede alterações no total que invalidem progresso registrado.

**Observação de segurança:** a configuração incluída é apropriada para desenvolvimento local, não para publicação direta em produção. Antes de disponibilizar o sistema publicamente, configure uma chave secreta forte por variável de ambiente, desative o modo de depuração, defina os hosts permitidos, escolha e configure um banco de dados de produção e revise HTTPS, CORS/CSRF conforme a arquitetura, backups, logs e políticas de acesso.

## 5. Tecnologias utilizadas

| Tecnologia | Papel no projeto |
|---|---|
| Python | Linguagem principal do backend |
| Django | Estrutura da aplicação, modelos, administração e configuração |
| Django REST Framework | Construção da API REST e serialização dos dados |
| Simple JWT | Autenticação por tokens de acesso e renovação |
| SQLite | Banco de dados configurado para desenvolvimento local |
| React, HTML, CSS e JavaScript | Interface web em desenvolvimento em `Frontend_react/` |
| Animações CSS | Escrita da marca, entrada da frase, transição para a biblioteca e ajustes para movimento reduzido |

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
├── Frontend_react/           # Aplicação React com Vite
│   ├── src/App.jsx           # Tela de entrada e página inicial da biblioteca
│   └── src/styles.css        # Identidade visual, animações e responsividade
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
| `/api/shared-libraries/` | Criar e consultar bibliotecas compartilhadas |
| `/api/shared-invitations/` | Consultar, enviar e responder convites internos |
| `/api/mailbox/` | Listar cartas e notificações recebidas e contar as não abertas |
| `/api/shared-books/` | Consultar e adicionar livros às estantes compartilhadas |
| `/api/shared-reading/` | Consultar e atualizar o progresso individual em livros compartilhados |
| `/api/shared-removal-requests/` | Consultar, enviar e responder a pedidos internos de remoção de livros |
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

> A API da biblioteca aceita `WANT_TO_READ`, `READING` e `READ`, correspondentes a **Quero ler**, **Lendo** e **Lido**. O catálogo aceita `genre` e `total_pages`, e a biblioteca pessoal aceita `pages_read`.

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
  "status": "WANT_TO_READ"
}
```

Para atualizar o progresso, envie `pages_read`. Para iniciar a leitura, use `"status": "READING"`; para marcar como concluído, envie `"status": "READ"` e `"pages_read"` igual ao `total_pages` do livro.

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

1. **Dados e API de leitura:** integrar o progresso por páginas à interface e validar os fluxos de conclusão e avaliação.
2. **Pedidos de remoção:** permitir solicitar autorização para retirar livros adicionados por outra pessoa e notificar o responsável.
3. **Progresso e timer:** registrar sessões, metas de tempo e históricos necessários aos resumos diários, semanais e mensais.
4. **Frontend React:** implementar as categorias, gráficos, correio visual e telas da biblioteca.
5. **Estante animada:** criar a estante de madeira, interação com livros, visualização aberta com resumo e suporte a capas.
6. **Tela de entrada:** ✅ escrita animada de MyBooks, frase literária variável com autoria e ação para prosseguir.
7. **Busca e filtros:** permitir pesquisar por título ou autor e filtrar a biblioteca.
8. **Integração com catálogo externo:** avaliar uma fonte apropriada para metadados e capas, respeitando os termos de uso.
9. **Produção e qualidade:** revisar testes, acessibilidade, banco de dados, segurança, deploy, observabilidade e backups.

## 12. Escopo atual e próximos passos

Esta cópia contém a base do backend e o início do frontend React. A tela de entrada já está implementada; após prosseguir, o usuário chega à página inicial da biblioteca, ainda em construção. Timer, gráficos, estante interativa, telas de correio e integração da interface com as APIs continuam como próximas etapas.

Uma sequência de trabalho recomendada é:

1. implementar pedidos de remoção com autorização e notificações;
2. implementar sessões de leitura, metas e resumos;
3. construir o frontend React, correio visual e estante animada responsiva;
4. validar os fluxos e preparar segurança e ambiente de produção antes de publicar.

O objetivo é evoluir o **mesmo projeto MyBooks**, mantendo a documentação junto ao código e registrando aqui mudanças relevantes de arquitetura e execução.

---

## Licença

Nenhuma licença de distribuição foi identificada nesta cópia. Antes de publicar o repositório como software aberto, escolha e adicione uma licença apropriada.
