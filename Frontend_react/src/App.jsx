import { useEffect, useState } from "react";

const quotes = [
  {
    text: "Só se vê bem com o coração, o essencial é invisível aos olhos.",
    work: "O Pequeno Príncipe",
    author: "Antoine de Saint-Exupéry",
  },
  {
    text: "Tudo vale a pena se a alma não é pequena.",
    work: "Mensagem",
    author: "Fernando Pessoa",
  },
  {
    text: "A vida é uma ópera e uma grande ópera.",
    work: "Dom Casmurro",
    author: "Machado de Assis",
  },
  {
    text: "Navegar é preciso; viver não é preciso.",
    work: "Navegar é preciso",
    author: "Fernando Pessoa",
  },
];

const LAST_QUOTE_KEY = "mybooks:last-welcome-quote";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

function chooseQuote() {
  const lastQuote = window.localStorage.getItem(LAST_QUOTE_KEY);
  const choices = quotes.filter((quote) => quote.text !== lastQuote);
  return choices[Math.floor(Math.random() * choices.length)];
}

function WelcomeScreen({ onContinue }) {
  const [quote] = useState(chooseQuote);

  useEffect(() => {
    window.localStorage.setItem(LAST_QUOTE_KEY, quote.text);
  }, [quote]);

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onContinue();
    }
  }

  return (
    <main
      className="welcome-screen"
      onClick={onContinue}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Tela de entrada do MyBooks. Clique ou pressione Enter para prosseguir."
    >
      <div className="welcome-grain" aria-hidden="true" />
      <div className="welcome-frame" aria-hidden="true">
        <span className="frame-corner frame-corner--top-left" />
        <span className="frame-corner frame-corner--top-right" />
        <span className="frame-corner frame-corner--bottom-left" />
        <span className="frame-corner frame-corner--bottom-right" />
      </div>

      <section className="welcome-content" aria-label="Boas-vindas">
        <p className="welcome-eyebrow">um lugar para cada história</p>
        <div className="brand-lockup" aria-label="MyBooks">
          <h1 className="brand-name">MyBooks</h1>
          <svg className="brand-flourish" viewBox="0 0 320 22" aria-hidden="true">
            <path d="M5 12 C73 4 106 20 158 12 S246 5 315 11" />
            <path d="M152 12 C157 5 163 5 168 12 C164 18 158 18 152 12Z" />
          </svg>
        </div>

        <blockquote className="literary-quote" key={quote.text}>
          <span className="quote-mark" aria-hidden="true">“</span>
          <p>{quote.text}</p>
          <footer>
            <cite>— {quote.work}, {quote.author}</cite>
          </footer>
        </blockquote>

        <button className="enter-prompt" type="button" onClick={onContinue}>
          <span className="enter-prompt__dot" aria-hidden="true" />
          <span>clique na tela para prosseguir</span>
          <span className="enter-prompt__arrow" aria-hidden="true">↓</span>
        </button>
      </section>

      <p className="welcome-note">feito para acompanhar suas leituras</p>
    </main>
  );
}

async function getLibraryPage(path, token, onToken, signal) {
  let response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  if (response.status === 401) {
    const refresh = window.localStorage.getItem("mybooks:refresh-token");
    if (!refresh) throw new Error("Sua sessão expirou. Entre novamente.");
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      signal,
    });
    if (!refreshResponse.ok) throw new Error("Sua sessão expirou. Entre novamente.");
    const refreshed = await refreshResponse.json();
    window.localStorage.setItem("mybooks:access-token", refreshed.access);
    onToken(refreshed.access);
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${refreshed.access}` },
      signal,
    });
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Não foi possível carregar sua biblioteca.");
  return data;
}

function statusLabel(status) {
  return {
    WANT_TO_READ: "Desejos",
    READING: "Não lidos",
    READ: "Já lidos",
  }[status] || status;
}

async function catalogRequest(path, token, onToken, options = {}) {
  const send = (activeToken) => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${activeToken}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  let response = await send(token);
  if (response.status === 401) {
    const refresh = window.localStorage.getItem("mybooks:refresh-token");
    if (!refresh) throw new Error("Sua sessão expirou. Entre novamente.");
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!refreshResponse.ok) throw new Error("Sua sessão expirou. Entre novamente.");
    const refreshed = await refreshResponse.json();
    window.localStorage.setItem("mybooks:access-token", refreshed.access);
    onToken(refreshed.access);
    response = await send(refreshed.access);
  }
  const data = await response.json().catch(() => null);
  if (!data) throw new Error("O servidor respondeu em um formato inesperado. Confira se o backend está funcionando.");
  if (!response.ok) {
    const detail = data.detail || Object.values(data).flat()[0];
    throw new Error(detail || "Não foi possível concluir esta ação.");
  }
  return data;
}

function CatalogExplorer({ accessToken, onToken }) {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedGenre, setSubmittedGenre] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState({});
  const [addingBook, setAddingBook] = useState(null);
  const [addedBooks, setAddedBooks] = useState({});
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    if (!submittedSearch && !submittedGenre) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (submittedSearch) params.set("search", submittedSearch);
    if (submittedGenre) params.set("genre", submittedGenre);
    setLoading(true);
    setError("");
    getLibraryPage(`/books/?${params.toString()}`, accessToken, onToken, controller.signal)
      .then((data) => {
        setResults(data.results || []);
        setTotalBooks(data.count || 0);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [accessToken, onToken, page, submittedSearch, submittedGenre]);

  function submitSearch(event) {
    event.preventDefault();
    const nextSearch = search.trim();
    const nextGenre = genre.trim();
    if (!nextSearch && !nextGenre) {
      setError("Digite o título ou autor de uma obra, ou informe um gênero.");
      setResults([]);
      setTotalBooks(0);
      return;
    }
    setPage(1);
    setSubmittedSearch(nextSearch);
    setSubmittedGenre(nextGenre);
  }

  async function addBook(book) {
    const category = categories[book.id] || "WANT_TO_READ";
    if (category === "READ" && !book.total_pages) {
      setFeedback((current) => ({ ...current, [book.id]: "Informe o total de páginas antes de marcar esta obra como lida." }));
      return;
    }
    setAddingBook(book.id);
    setFeedback((current) => ({ ...current, [book.id]: "" }));
    try {
      await catalogRequest("/library/", accessToken, onToken, {
        method: "POST",
        body: JSON.stringify({
          book_id: book.id,
          status: category,
          ...(category === "READ" ? { pages_read: book.total_pages } : {}),
        }),
      });
      setAddedBooks((current) => ({ ...current, [book.id]: true }));
      setFeedback((current) => ({ ...current, [book.id]: "Obra adicionada à sua biblioteca." }));
    } catch (requestError) {
      const message = String(requestError.message);
      if (/já est[aá] na sua biblioteca/i.test(message)) {
        setAddedBooks((current) => ({ ...current, [book.id]: true }));
        setFeedback((current) => ({ ...current, [book.id]: "Esta obra já está na sua biblioteca." }));
      } else {
        setFeedback((current) => ({ ...current, [book.id]: message }));
      }
    } finally {
      setAddingBook(null);
    }
  }

  return (
    <section className="explore-view" aria-labelledby="explore-title">
      <div className="explore-heading">
        <div>
          <p className="library-kicker">amplie sua coleção</p>
          <h1 id="explore-title">Encontre sua próxima leitura.</h1>
          <p className="explore-intro">Busque por título, autor ou gênero e descubra novas histórias para sua estante.</p>
        </div>
        {(submittedSearch || submittedGenre) && <p className="explore-count">{totalBooks} {totalBooks === 1 ? "obra encontrada" : "obras encontradas"}</p>}
      </div>

      <form className="explore-search" onSubmit={submitSearch}>
        <label className="explore-search__query">
          <span>Obra ou autor</span>
          <span className="search-input-wrap">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: O Pequeno Príncipe" />
          </span>
        </label>
        <label className="explore-search__genre">
          <span>Gênero</span>
          <input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Ex.: fantasia" />
        </label>
        <button className="library-primary-button" type="submit" disabled={loading}>{loading ? "buscando…" : "buscar obras"}</button>
      </form>

      {error && <p className="library-error explore-error" role="alert">{error}</p>}
      {loading ? (
        <div className="explore-state" role="status"><span className="loading-mark" aria-hidden="true" />Consultando o catálogo…</div>
      ) : results.length ? (
        <>
          <div className="catalog-results" aria-live="polite">
            {results.map((book, index) => (
              <article className="catalog-card" key={book.id} style={{ "--card-index": index }}>
                <div className="catalog-card__cover-wrap">
                  {book.cover_url && <img className="catalog-card__cover" src={book.cover_url} alt={`Capa de ${book.title}`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false; }} />}
                  <div className="catalog-card__cover-fallback" hidden={Boolean(book.cover_url)} aria-hidden="true">
                    <span>MYBOOKS</span><strong>{book.title}</strong><i>{book.author}</i>
                  </div>
                  <span className="catalog-card__cover-shadow" aria-hidden="true" />
                </div>
                <div className="catalog-card__body">
                  <p className="catalog-card__eyebrow">{book.genre || "obra do catálogo"}</p>
                  <h2>{book.title}</h2>
                  <p className="catalog-card__author">{book.author}</p>
                  <div className="catalog-card__facts">
                    {book.total_pages ? <span>{book.total_pages} páginas</span> : <span>páginas não informadas</span>}
                    {book.publication_date && <span>{book.publication_date.slice(0, 4)}</span>}
                  </div>
                  <p className="catalog-card__synopsis">{book.synopsis || "Ainda não há um resumo cadastrado para esta obra."}</p>
                  <div className="catalog-card__actions">
                    <label>
                      <span>Adicionar como</span>
                      <select value={categories[book.id] || "WANT_TO_READ"} disabled={Boolean(addedBooks[book.id])} onChange={(event) => setCategories((current) => ({ ...current, [book.id]: event.target.value }))}>
                        <option value="WANT_TO_READ">Desejos</option>
                        <option value="READING">Não lidos</option>
                        <option value="READ">Já lidos</option>
                      </select>
                    </label>
                    <button className={`catalog-add-button${addedBooks[book.id] ? " is-added" : ""}`} type="button" disabled={Boolean(addingBook) || Boolean(addedBooks[book.id])} onClick={() => addBook(book)}>
                      {addingBook === book.id ? "adicionando…" : addedBooks[book.id] ? "adicionado ✓" : "+ adicionar"}
                    </button>
                  </div>
                  {feedback[book.id] && <p className={`catalog-feedback${addedBooks[book.id] ? " is-success" : ""}`} role="status">{feedback[book.id]}</p>}
                </div>
              </article>
            ))}
          </div>
          {(hasNext || hasPrevious) && (
            <nav className="pagination-controls" aria-label="Páginas do catálogo">
              <button type="button" disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>anterior</button>
              <span>página {page}</span>
              <button type="button" disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)}>próxima</button>
            </nav>
          )}
        </>
      ) : (
        <div className="explore-state explore-state--empty" aria-live="polite">
          <span className="explore-state__ornament" aria-hidden="true">✧</span>
          <h2>{submittedSearch || submittedGenre ? "Nenhuma obra encontrada" : "Toda grande leitura começa com uma busca."}</h2>
          <p>{submittedSearch || submittedGenre ? "Experimente outro título, autor ou gênero." : "Pesquise no catálogo e encontre uma história para levar à sua estante."}</p>
        </div>
      )}
    </section>
  );
}

function LibraryLanding({ onReturn }) {
  const [accessToken, setAccessToken] = useState(() => window.localStorage.getItem("mybooks:access-token") || "");
  const [activeView, setActiveView] = useState("library");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedGenre, setSubmittedGenre] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (submittedSearch) params.set("search", submittedSearch);
    if (submittedGenre) params.set("genre", submittedGenre);
    if (submittedStatus) params.set("status", submittedStatus);

    setLoading(true);
    setError("");
    getLibraryPage(`/library/?${params.toString()}`, accessToken, setAccessToken, controller.signal)
      .then((data) => {
        setEntries(data.results || []);
        setTotalEntries(data.count || 0);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          if (requestError.message.includes("sessão expirou")) signOut();
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [accessToken, page, submittedSearch, submittedGenre, submittedStatus]);

  async function submitAccess(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (creatingAccount) {
        const registrationResponse = await fetch(`${API_BASE_URL}/auth/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const registrationData = await registrationResponse.json();
        if (!registrationResponse.ok) {
          const detail = registrationData.detail || Object.values(registrationData).flat()[0];
          throw new Error(detail || "Não foi possível criar sua conta.");
        }
      }

      const response = await fetch(`${API_BASE_URL}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Usuário ou senha inválidos.");
      window.localStorage.setItem("mybooks:access-token", data.access);
      window.localStorage.setItem("mybooks:refresh-token", data.refresh);
      setAccessToken(data.access);
      setPassword("");
      setCreatingAccount(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem("mybooks:access-token");
    window.localStorage.removeItem("mybooks:refresh-token");
    setAccessToken("");
    setActiveView("library");
    setEntries([]);
  }

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
    setSubmittedGenre(genre.trim());
    setSubmittedStatus(status);
  }

  return (
    <main className="library-landing">
      <header className={`library-header${accessToken ? "" : " library-header--login"}`}>
        <a className="library-wordmark" href="#inicio" onClick={(event) => { event.preventDefault(); onReturn(); }}>
          MyBooks<span aria-hidden="true">.</span>
        </a>
        <div className="library-header__actions">
          {accessToken && <nav className="library-navigation" aria-label="Navegação principal">
            <button className={activeView === "library" ? "is-active" : ""} type="button" onClick={() => setActiveView("library")}>Minha biblioteca</button>
            <button className={activeView === "explore" ? "is-active" : ""} type="button" onClick={() => setActiveView("explore")}>Explorar obras</button>
          </nav>}
          {accessToken && <button className="library-text-button" type="button" onClick={signOut}>sair</button>}
        </div>
      </header>
      {!accessToken ? (
        <div className="login-layout">
          <aside className="login-story" aria-label="Uma mensagem sobre leitura">
            <span className="login-story__eyebrow">MYBOOKS · SUA BIBLIOTECA</span>
            <div className="login-story__books" aria-hidden="true">
              <span className="login-book login-book--rust" />
              <span className="login-book login-book--sage" />
              <span className="login-book login-book--ochre" />
              <span className="login-book login-book--plum" />
            </div>
            <h2>Uma estante guarda mais do que livros.</h2>
            <p>Guarda os lugares a que cada história levou você.</p>
            <span className="login-story__rule" aria-hidden="true" />
            <span className="login-story__caption">um capítulo de cada vez</span>
          </aside>

          <section className="login-card" aria-labelledby="library-title">
            <p className="login-card__eyebrow">{creatingAccount ? "COMECE SUA COLEÇÃO" : "BEM-VINDO DE VOLTA"}</p>
            <h1 id="library-title">{creatingAccount ? "Sua história começa aqui." : "Que bom ter você de volta."}</h1>
            <p className="login-card__description">
              {creatingAccount ? "Crie sua conta e dê um lugar às histórias que você ama." : "Entre para continuar de onde sua última leitura levou você."}
            </p>

            <form className="login-form" onSubmit={submitAccess}>
              <label>
                <span>Nome de usuário</span>
                <input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
              </label>
              {creatingAccount && (
                <label>
                  <span>E-mail</span>
                  <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
              )}
              <label>
                <span>Senha</span>
                <span className="password-field">
                  <input type={showPassword ? "text" : "password"} autoComplete={creatingAccount ? "new-password" : "current-password"} required minLength={creatingAccount ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
                {creatingAccount && <small className="password-hint">Use pelo menos 8 caracteres.</small>}
              </label>
              {error && <p className="library-error" role="alert">{error}</p>}
              <button className="library-primary-button" type="submit" disabled={loading}>
                {loading ? "aguarde…" : creatingAccount ? "criar minha conta" : "entrar na minha biblioteca"}
              </button>
            </form>

            <p className="login-switch">
              {creatingAccount ? "Já tem uma conta?" : "Ainda não tem uma conta?"}
              <button type="button" onClick={() => { setCreatingAccount((value) => !value); setError(""); }}>
                {creatingAccount ? "Entrar" : "Criar conta"}
              </button>
            </p>
          </section>
        </div>
      ) : activeView === "explore" ? (
        <CatalogExplorer accessToken={accessToken} onToken={setAccessToken} />
      ) : (
        <section className="personal-library" aria-labelledby="library-title">
          <div className="personal-library__heading">
            <div>
              <p className="library-kicker">sua coleção pessoal</p>
              <h1 id="library-title">Biblioteca</h1>
            </div>
            <p className="library-count">{totalEntries} {totalEntries === 1 ? "livro" : "livros"}</p>
          </div>

          <form className="library-filters" onSubmit={applyFilters}>
            <label className="filter-search">
              <span>Buscar por título ou autor</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: Machado de Assis" />
            </label>
            <label>
              <span>Gênero</span>
              <input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Todos os gêneros" />
            </label>
            <label>
              <span>Categoria</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Todas</option>
                <option value="WANT_TO_READ">Desejos</option>
                <option value="READING">Não lidos</option>
                <option value="READ">Já lidos</option>
              </select>
            </label>
            <div className="filter-actions">
              <button className="library-primary-button" type="submit">aplicar filtros</button>
              <button className="library-text-button" type="button" onClick={() => {
                setSearch(""); setGenre(""); setStatus(""); setSubmittedSearch(""); setSubmittedGenre(""); setSubmittedStatus(""); setPage(1);
              }}>limpar</button>
            </div>
          </form>

          {error && <p className="library-error" role="alert">{error}</p>}
          {loading ? <p className="library-feedback">abrindo seus livros…</p> : entries.length ? (
            <div className="book-results" aria-live="polite">
              {entries.map((entry) => (
                <article className="book-result" key={entry.id}>
                  {entry.book.cover_url ? (
                    <img className="book-result__cover" src={entry.book.cover_url} alt={`Capa de ${entry.book.title}`} />
                  ) : (
                    <div className="book-result__cover book-result__cover--placeholder" aria-hidden="true">{entry.book.title.slice(0, 1)}</div>
                  )}
                  <div className="book-result__details">
                    <h2>{entry.book.title}</h2>
                    <p>{entry.book.author}</p>
                    <div className="book-result__meta">
                      {entry.book.genre && <span>{entry.book.genre}</span>}
                      <span>{statusLabel(entry.status)}</span>
                      {entry.book.total_pages && <span>{entry.pages_read} / {entry.book.total_pages} páginas</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="library-empty-state" aria-live="polite">
              <p className="library-empty-state__ornament" aria-hidden="true">✦</p>
              <h2>{submittedSearch || submittedGenre || submittedStatus ? "Nenhum livro corresponde aos filtros." : "Sua estante ainda está vazia."}</h2>
              <p>{submittedSearch || submittedGenre || submittedStatus ? "Tente outra busca ou remova algum filtro." : "Os livros que você adicionar aparecerão aqui."}</p>
            </div>
          )}

          {(hasNext || hasPrevious) && (
            <nav className="pagination-controls" aria-label="Páginas da biblioteca">
              <button type="button" disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>anterior</button>
              <span>página {page}</span>
              <button type="button" disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)}>próxima</button>
            </nav>
          )}
        </section>
      )}
      <button className="back-to-welcome" type="button" onClick={onReturn}>voltar à abertura</button>
      <footer className="library-footer">MYBOOKS <span>·</span> UM CAPÍTULO DE CADA VEZ</footer>
    </main>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);

  return entered ? (
    <LibraryLanding onReturn={() => setEntered(false)} />
  ) : (
    <WelcomeScreen onContinue={() => setEntered(true)} />
  );
}
