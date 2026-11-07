import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { Drawer, DrawerContent, DrawerHandle } from "./components/ui/drawer";
import { Field, FieldDescription, FieldLabel } from "./components/ui/field";
import { Input } from "./components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./components/ui/pagination";
import { Progress } from "./components/ui/progress";
import { Skeleton } from "./components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const WELCOME_QUOTE_KEY = "mybooks:last-welcome-quote";
const welcomeQuotes = [
  { text: "Quando certa manhã Gregor Samsa acordou de sonhos intranquilos, encontrou-se em sua cama metamorfoseado num inseto monstruoso.", work: "A metamorfose", author: "Franz Kafka" },
  { text: "Todos pertencem a todos.", work: "Admirável mundo novo", author: "Aldous Huxley" },
  { text: "A necessidade é a mãe da invenção.", work: "A República", author: "Platão" },
  { text: "Guerra é paz. Liberdade é escravidão. Ignorância é força.", work: "1984", author: "George Orwell" },
  { text: "Todos os animais são iguais, mas alguns são mais iguais que outros.", work: "A revolução dos bichos", author: "George Orwell" },
  { text: "Meu Deus, um momento inteiro de felicidade! Isso é pouco para uma vida inteira?", work: "Noites brancas", author: "Fiódor Dostoiévski" },
  { text: "A geografia do Reino Unido não mudou.", work: "O poder da geografia", author: "Tim Marshall" },
];

function chooseWelcomeQuote() {
  let previousQuote = "";
  try {
    previousQuote = window.localStorage.getItem(WELCOME_QUOTE_KEY) || "";
  } catch {
    // A seleção aleatória também funciona quando o armazenamento está indisponível.
  }

  const choices = welcomeQuotes.filter((quote) => quote.text !== previousQuote);
  const selected = choices[Math.floor(Math.random() * choices.length)] || welcomeQuotes[0];
  try {
    window.localStorage.setItem(WELCOME_QUOTE_KEY, selected.text);
  } catch {
    // A frase continua disponível sem armazenamento local.
  }
  return selected;
}
function WelcomeScreen({ onContinue }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const screenRef = useRef(null);
  const continueTimerRef = useRef(null);
  const [quote] = useState(chooseWelcomeQuote);
  useEffect(() => () => window.clearTimeout(continueTimerRef.current), []);

  function handleContinue() {
    if (isLeaving) return;
    setIsLeaving(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 620;
    continueTimerRef.current = window.setTimeout(onContinue, delay);
  }

  useEffect(() => {
    const screen = screenRef.current;
    const supportsPointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducesMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!screen || !supportsPointer.matches || reducesMotion.matches) return undefined;

    function handlePointerMove(event) {
      const bounds = screen.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      screen.style.setProperty("--pointer-x", `${(x * 100).toFixed(1)}%`);
      screen.style.setProperty("--pointer-y", `${(y * 100).toFixed(1)}%`);
      screen.style.setProperty("--depth-shift-x", `${((0.5 - x) * 10).toFixed(1)}px`);
      screen.style.setProperty("--depth-shift-y", `${((0.5 - y) * 8).toFixed(1)}px`);
    }

    function resetPointer() {
      screen.style.setProperty("--pointer-x", "50%");
      screen.style.setProperty("--pointer-y", "41%");
      screen.style.setProperty("--depth-shift-x", "0px");
      screen.style.setProperty("--depth-shift-y", "0px");
    }

    screen.addEventListener("pointermove", handlePointerMove, { passive: true });
    screen.addEventListener("pointerleave", resetPointer, { passive: true });
    return () => {
      screen.removeEventListener("pointermove", handlePointerMove);
      screen.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  function handleKeyDown(event) {
    if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      handleContinue();
    }
  }

  return (
    <main
      ref={screenRef}
      className={`welcome-screen${isLeaving ? " is-leaving" : ""}`}
      onClick={handleContinue}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="Tela de início do MyBooks. Acesse para entrar ou criar sua conta."
    >
      <div className="welcome-grain" aria-hidden="true" />
      <div className="welcome-depth" aria-hidden="true" />
      <div className="welcome-frame" aria-hidden="true">
        <span className="frame-corner frame-corner--top-left" />
        <span className="frame-corner frame-corner--top-right" />
        <span className="frame-corner frame-corner--bottom-left" />
        <span className="frame-corner frame-corner--bottom-right" />
      </div>

      <section className="welcome-content" aria-label="Boas-vindas">
        <div className="welcome-layout">
          <div className="welcome-brand-column">
            <div className="brand-lockup" aria-label="MyBooks">
              <h1 className="brand-name" aria-label="MyBooks">
                <svg className="brand-name__svg" viewBox="0 0 720 180" aria-hidden="true" focusable="false">
                  <text className="brand-name__letters" x="360" y="132" textAnchor="middle">MyBooks</text>
                </svg>
              </h1>
              <svg className="brand-flourish" viewBox="0 0 320 22" aria-hidden="true">
                <path d="M5 12 C73 4 106 20 158 12 S246 5 315 11" />
                <path d="M152 12 C157 5 163 5 168 12 C164 18 158 18 152 12Z" />
              </svg>
            </div>
            <blockquote className="welcome-literary-quote">
              <p>“{quote.text}”</p>
              <footer><cite>{quote.work} · {quote.author}</cite></footer>
            </blockquote>
          </div>

        </div>

      </section>
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

  const responseBody = await response.text();
  let data;
  try {
    data = responseBody ? JSON.parse(responseBody) : {};
  } catch {
    const apiUrl = `${API_BASE_URL}${path.split("?")[0]}`;
    throw new Error(
      `A API respondeu com HTML em ${apiUrl}. Verifique se o servidor encaminha /api/ para o backend Django.`,
    );
  }
  if (!response.ok) throw new Error(data.detail || "Não foi possível carregar sua biblioteca.");
  return data;
}

function statusLabel(status) {
  return {
    WANT_TO_READ: "Desejos",
    READING: "Lendo",
    READ: "Já lidos",
  }[status] || status;
}

const SHELF_CAPACITY = 6;

function groupIntoShelves(items, shelfSize = SHELF_CAPACITY) {
  const highestShelf = Math.max(0, ...items.map((item) => Math.max(0, Number(item.shelf) || 0)));
  const shelves = Array.from({ length: highestShelf + 1 }, () => []);
  items.forEach((item) => shelves[Math.max(0, Number(item.shelf) || 0)]?.push(item));
  shelves.forEach((shelf) => shelf.sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0)));
  if (shelves[shelves.length - 1]?.length >= shelfSize) shelves.push([]);
  return shelves;
}

function BookDetailDialog({ entry, accessToken, onToken, onClose, onEntryUpdated, isClosing }) {
  const [pagesRead, setPagesRead] = useState(entry.pages_read);
  const [status, setStatus] = useState(entry.status);
  const [review, setReview] = useState(null);
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coverFailed, setCoverFailed] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const book = entry.book;
  const totalPages = book.total_pages;
  const progress = totalPages ? Math.min(100, Math.round((pagesRead / totalPages) * 100)) : 0;
  const canRate = status === "READ" && totalPages && Number(pagesRead) === totalPages
    && entry.status === "READ" && entry.pages_read === totalPages;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [...(dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    catalogRequest("/reviews/", accessToken, onToken)
      .then((data) => {
        const reviews = Array.isArray(data) ? data : data.results || [];
        const found = reviews.find((item) => item.book?.id === book.id);
        if (active) {
          setReview(found || null);
          setRating(found?.rating || 0);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [accessToken, book.id, onToken]);

  async function saveReadingDetails(event) {
    event.preventDefault();
    const numericPages = Number(pagesRead);
    if (!Number.isInteger(numericPages) || numericPages < 0 || (totalPages && numericPages > totalPages)) {
      setError("Informe um número de páginas válido, dentro do total da obra.");
      return;
    }
    if (status === "READ" && (!totalPages || numericPages !== totalPages)) {
      setError("Para marcar como lido, as páginas lidas devem ser iguais ao total.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await catalogRequest(`/library/${entry.id}/`, accessToken, onToken, {
        method: "PATCH",
        body: JSON.stringify({ pages_read: numericPages, status }),
      });
      onEntryUpdated(updated);
      setPagesRead(updated.pages_read);
      setStatus(updated.status);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveRating(nextRating) {
    if (status !== "READ" || !totalPages || Number(pagesRead) !== totalPages) {
      setError("Conclua a leitura para avaliar esta obra.");
      return;
    }
    setRating(nextRating);
    setSaving(true);
    setError("");
    try {
      const payload = { rating: nextRating };
      const saved = await catalogRequest(review ? `/reviews/${review.id}/` : "/reviews/", accessToken, onToken, {
        method: review ? "PATCH" : "POST",
        body: JSON.stringify(review ? payload : { ...payload, book_id: book.id }),
      });
      setReview(saved);
    } catch (requestError) {
      setError(requestError.message);
      setRating(review?.rating || 0);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`book-dialog-backdrop${isClosing ? " is-closing" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Dialog className="book-dialog__root">
        <DialogContent ref={dialogRef} className={"book-dialog" + (isClosing ? " is-closing" : "")} role="dialog" aria-modal="true" aria-labelledby="book-dialog-title">
        <DialogClose as={Button} ref={closeButtonRef} variant="ghost" size="sm" className="book-dialog__close" type="button" onClick={onClose} aria-label="Fechar livro e voltar à estante">×</DialogClose>
        <div className="book-dialog__book-open">
          <div className="book-dialog__cover-page">
            <span className="book-dialog__cover-ornament book-dialog__cover-ornament--top" aria-hidden="true">✧</span>
            {book.cover_url && !coverFailed ? <img src={book.cover_url} alt={`Capa de ${book.title}`} onError={() => setCoverFailed(true)} /> : <div className="book-dialog__cover-fallback">{book.title}</div>}
            <span className="book-dialog__cover-ornament book-dialog__cover-ornament--bottom" aria-hidden="true">✧</span>
          </div>
          <div className="book-dialog__page-flips" aria-hidden="true">
            {[0, 1, 2].map((page) => <span key={page} style={{ "--page-index": page }} />)}
          </div>
          <Drawer className="book-dialog__drawer">
            <DrawerHandle />
            <DrawerContent className="book-dialog__drawer-content">
              <div className="book-dialog__content-page">
            <DialogHeader className="book-dialog__header">
            <p className="book-dialog__eyebrow">sua obra</p>
            <DialogTitle id="book-dialog-title">{book.title}</DialogTitle>
            <DialogDescription className="book-dialog__author">{book.author}</DialogDescription>
            <div className="book-dialog__facts">
              {book.genre && <span>{book.genre}</span>}
              <span>{totalPages ? `${totalPages} páginas` : "Total de páginas não informado"}</span>
              <span>{statusLabel(status)}</span>
            </div>
            </DialogHeader>
            <div className="book-dialog__body">
            <section className="book-dialog__synopsis-block" aria-labelledby="book-synopsis-title">
            <div className="book-dialog__section-heading">
              <p className="book-dialog__section-kicker">contexto</p>
              <h3 id="book-synopsis-title">Sobre a obra</h3>
            </div>
            <p className={`book-dialog__synopsis${book.synopsis ? "" : " is-empty"}`}>{book.synopsis || "O resumo desta edição ainda não foi cadastrado."}</p>
            </section>
            <section className="book-dialog__reading-panel" aria-label="Atualizar leitura e avaliação">
            <div className="book-dialog__section-heading book-dialog__section-heading--reading">
              <div>
                <p className="book-dialog__section-kicker">acompanhamento</p>
                <h3>Sua leitura</h3>
              </div>
              {totalPages > 0 && <strong>{progress}%</strong>}
            </div>
            <form className="book-dialog__reading-form" onSubmit={saveReadingDetails}>
              <label>
                Páginas lidas
                <span className="book-dialog__pages-control">
                  <input type="number" min="0" max={totalPages || undefined} value={pagesRead} onChange={(event) => setPagesRead(event.target.value)} />
                  <span>/ {totalPages ?? "—"}</span>
                </span>
              </label>
              <label>
                Categoria
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="WANT_TO_READ">Desejos</option>
                  <option value="READING">Lendo</option>
                  <option value="READ">Já lidos</option>
                </select>
              </label>
              {totalPages > 0 && <Progress className="book-dialog__progress" value={progress} aria-label={"Progresso de leitura: " + progress + "%"} />}
              {totalPages > 0 && <p className="book-dialog__progress-label">{progress}% da leitura concluída</p>}
              <Button className="book-dialog__save-button" type="submit" size="sm" disabled={saving}>{saving ? "salvando…" : "salvar progresso"}</Button>
            </form>
            <div className="book-dialog__rating">
              <p>Sua avaliação</p>
              <div role="group" aria-label={status === "READ" ? "Avaliar de 1 a 5 estrelas" : "Avaliação disponível após concluir a leitura"}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button key={value} variant="ghost" className="book-dialog__rating-button" type="button" aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`} aria-pressed={rating === value} disabled={saving || !canRate} onClick={() => saveRating(value)}>{value <= rating ? "★" : "☆"}</Button>
                ))}
              </div>
              {!canRate && <small>Salve a leitura completa para avaliar esta obra.</small>}
            </div>
            {error && <p className="book-dialog__error" role="alert">{error}</p>}
            </section>
            </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
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
  const data = await response.json().catch(() => response.status === 204 ? {} : null);
  if (!data) throw new Error("O servidor respondeu em um formato inesperado. Confira se o backend está funcionando.");
  if (!response.ok) {
    const detail = data.detail || Object.values(data).flat()[0];
    throw new Error(detail || "Não foi possível concluir esta ação.");
  }
  return data;
}

function externalBookImportPayload(book) {
  const provider = book.provider || "google_books";
  const payload = { provider, source_id: book.source_id };
  if (provider === "open_library") {
    payload.metadata = {
      title: book.title,
      author: book.author,
      synopsis: book.synopsis,
      genre: book.genre,
      total_pages: book.total_pages,
      cover_url: book.cover_url,
    };
  }
  return payload;
}

function ReadingChart({ title, description, items }) {
  const maxPages = Math.max(1, ...items.map((item) => item.pages));
  const maxBooks = Math.max(1, ...items.map((item) => item.books));
  const pagesTotal = items.reduce((total, item) => total + item.pages, 0);
  const booksTotal = items.reduce((total, item) => total + item.books, 0);
  const minutesTotal = items.reduce((total, item) => total + item.minutes, 0);

  return (
    <section className="reading-chart" aria-label={title}>
      <div className="reading-chart__heading">
        <div><h2>{title}</h2><p>{description}</p></div>
        <div className="reading-chart__totals" aria-label={`Totais: ${pagesTotal} páginas, ${booksTotal} livros e ${minutesTotal} minutos`}>
          <span><strong>{pagesTotal}</strong><small>páginas</small></span>
          <span><strong>{booksTotal}</strong><small>livros</small></span>
          <span><strong>{minutesTotal}</strong><small>min</small></span>
        </div>
      </div>
      <div className="reading-chart__legend"><span><i className="reading-chart__swatch reading-chart__swatch--pages" />Páginas</span><span><i className="reading-chart__swatch reading-chart__swatch--books" />Livros concluídos</span></div>
      <p className="reading-chart__scale-note">Cada indicador usa sua própria escala.</p>
      <div className="reading-chart__plot" role="list" aria-label={`Gráfico de ${title}`}>
        {items.map((item, index) => (
          <div className="reading-chart__column" role="listitem" key={`${item.label}-${index}`} aria-label={`${item.label}: ${item.pages} páginas avançadas e ${item.books} livros concluídos`}>
            <div className="reading-chart__bars" aria-hidden="true">
              <span className="reading-chart__bar reading-chart__bar--pages" title={`${item.label}: ${item.pages} páginas`} style={{ height: `${item.pages ? Math.max(5, item.pages / maxPages * 100) : 0}%` }} />
              <span className="reading-chart__bar reading-chart__bar--books" title={`${item.label}: ${item.books} livros concluídos`} style={{ height: `${item.books ? Math.max(5, item.books / maxBooks * 100) : 0}%` }} />
            </div>
            <span className="reading-chart__label">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadingSummary({ period, item = {} }) {
  const values = [
    { value: item.pages || 0, label: "páginas" },
    { value: item.books || 0, label: "livros" },
    { value: item.minutes || 0, label: "minutos" },
  ];
  return (
    <article className="reading-summary-card" aria-label={`${period}: ${values.map(({ value, label }) => `${value} ${label}`).join(", ")}`}>
      <h3>{period}</h3>
      <div>{values.map(({ value, label }) => <p key={label}><strong>{value}</strong><span>{label}</span></p>)}</div>
    </article>
  );
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function spineEmblem(title = "") {
  const name = title.toLocaleLowerCase();
  if (name.includes("1984")) return "◉";
  if (name.includes("assassin")) return "◆";
  if (name.includes("prince") || name.includes("caspian")) return "♜";
  if (name.includes("chair")) return "♧";
  if (name.includes("mundo") || name.includes("narnia")) return "✥";
  return "✦";
}

function ReadingTimer({ accessToken, onToken, todayMinutes, onSessionStopped }) {
  const [activeSession, setActiveSession] = useState(null);
  const [goal, setGoal] = useState(30);
  const [goalInput, setGoalInput] = useState("30");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      catalogRequest("/reading-sessions/", accessToken, onToken),
      catalogRequest("/reading-goal/", accessToken, onToken),
    ]).then(([sessionData, goalData]) => {
      if (!active) return;
      setActiveSession(sessionData.active);
      setGoal(goalData.target_minutes);
      setGoalInput(String(goalData.target_minutes));
    }).catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, onToken]);

  useEffect(() => {
    if (!activeSession) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const elapsedSeconds = activeSession ? Math.max(0, Math.floor((now - new Date(activeSession.started_at).getTime()) / 1000)) : 0;
  const todaySeconds = todayMinutes * 60 + elapsedSeconds;
  const goalSeconds = goal * 60;
  const goalProgress = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));

  async function toggleSession() {
    setSaving(true);
    setError("");
    try {
      if (activeSession) {
        await catalogRequest("/reading-sessions/stop/", accessToken, onToken, { method: "POST" });
        setActiveSession(null);
        onSessionStopped();
      } else {
        const data = await catalogRequest("/reading-sessions/start/", accessToken, onToken, { method: "POST" });
        setActiveSession(data.active);
        setNow(Date.now());
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveGoal(event) {
    event.preventDefault();
    const value = Number(goalInput);
    if (!Number.isInteger(value) || value < 1 || value > 1440) {
      setError("Escolha uma meta entre 1 e 1440 minutos por dia.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await catalogRequest("/reading-goal/", accessToken, onToken, {
        method: "PATCH",
        body: JSON.stringify({ target_minutes: value }),
      });
      setGoal(data.target_minutes);
      setIsEditingGoal(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="reading-timer" aria-labelledby="reading-timer-title">
      <div className="reading-timer__workspace">
        <div className="reading-timer__identity">
          <svg className="reading-timer__book-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 5.5c3.2-.8 6.1-.2 8.5 1.7v12c-2.4-1.9-5.3-2.5-8.5-1.7v-12Z" /><path d="M20.5 5.5c-3.2-.8-6.1-.2-8.5 1.7v12c2.4-1.9 5.3-2.5 8.5-1.7v-12Z" /></svg>
          <div><h2 id="reading-timer-title">Sess&#227;o de leitura</h2><p>Meta di&#225;ria: {goal} minutos</p></div>
        </div>
        <div className={`reading-timer__clock${activeSession ? " is-running" : ""}`} aria-live="off">{formatDuration(elapsedSeconds)}</div>
        <button className={`reading-timer__control${activeSession ? " is-stop" : ""}`} type="button" aria-label={activeSession ? "Encerrar sess\u00e3o de leitura" : "Iniciar sess\u00e3o de leitura"} title={activeSession ? "Encerrar sess\u00e3o" : "Iniciar leitura"} disabled={loading || saving} onClick={toggleSession}>
          <span aria-hidden="true">{saving ? "…" : activeSession ? "■" : "▶"}</span>
        </button>
        <div className="reading-timer__goal-panel">
          <h3>Meta do dia</h3>
          <div className="reading-timer__goal-ring" role="img" aria-label={`Meta di\u00e1ria: ${goalProgress}% conclu\u00edda`} style={{ "--goal-progress": `${goalProgress}%` }}><span>{goalProgress}%</span></div>
          <p>{Math.floor(todaySeconds / 60)} de {goal} min</p>
          <button className="reading-timer__edit-goal" type="button" aria-label={"Editar meta di\u00e1ria"} aria-expanded={isEditingGoal} onClick={() => setIsEditingGoal((value) => !value)}>&#9998;</button>
        </div>
      </div>
      {isEditingGoal && <form className="reading-timer__goal-form" onSubmit={saveGoal}>
        <label htmlFor="daily-reading-goal">Minha meta di&#225;ria</label>
        <input id="daily-reading-goal" type="number" min="1" max="1440" value={goalInput} onChange={(event) => setGoalInput(event.target.value)} />
        <span>minutos</span>
        <button type="submit" disabled={saving || loading}>{saving ? "salvando..." : "salvar meta"}</button>
      </form>}
      {error && <p className="book-dialog__error" role="alert">{error}</p>}
    </section>
  );
}
function ReadingProgressView({ accessToken, onToken, onGoToLibrary }) {
  const [stats, setStats] = useState(null);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [chartPeriod, setChartPeriod] = useState("daily");
  const [refreshCount, setRefreshCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      catalogRequest("/reading-stats/", accessToken, onToken),
      catalogRequest("/library/?status=READING&page=1", accessToken, onToken),
    ])
      .then(([data, libraryData]) => { if (active) { setStats(data); setCurrentEntry(libraryData.results?.[0] || null); } })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, onToken, refreshCount]);

  const today = stats?.daily?.at(-1) || {};
  const weekly = stats?.weekly?.at(-1) || {};
  const monthly = stats?.monthly || [];
  const sixMonthPages = monthly.reduce((sum, item) => sum + (item.pages || 0), 0);
  const sixMonthBooks = monthly.reduce((sum, item) => sum + (item.books || 0), 0);
  const sixMonthMinutes = monthly.reduce((sum, item) => sum + (item.minutes || 0), 0);
  const currentPages = Number(currentEntry?.pages_read) || 0;
  const currentTotal = Number(currentEntry?.book?.total_pages) || 0;
  const currentPercent = currentTotal ? Math.min(100, Math.round(currentPages / currentTotal * 100)) : 0;
  const chartItems = chartPeriod === "daily" ? stats?.daily || [] : chartPeriod === "weekly" ? stats?.weekly || [] : monthly;

  return (
    <section id="library-content" className="reading-progress-view explore-view" aria-labelledby="reading-progress-title" aria-busy={loading}>
      <div className="explore-heading progress-heading">
        <div>
          <p className="library-kicker">cada p&#225;gina conta</p>
          <h1 id="reading-progress-title">Sua jornada liter&#225;ria.</h1>
          <p className="explore-intro">Acompanhe sua evolu&#231;&#227;o, mantenha o ritmo e celebre suas conquistas.</p>
        </div>
      </div>
      {error && <p className="library-error" role="alert">{error}</p>}
      {loading ? <p className="library-feedback" role="status">reunindo suas leituras&#8230;</p> : stats ? (
        <>
          <div className="progress-top-grid">
            <section className="progress-current-card" aria-labelledby="progress-current-title">
              <h2 id="progress-current-title"><span aria-hidden="true">▤</span> Leitura atual</h2>
              {currentEntry ? <>
                <div className="progress-current-card__book">
                  {currentEntry.book.cover_url ? <img src={currentEntry.book.cover_url} alt={`Capa de ${currentEntry.book.title}`} /> : <span className="progress-current-card__fallback">{currentEntry.book.title.slice(0, 1)}</span>}
                  <div className="progress-current-card__details"><h3>{currentEntry.book.title}</h3><p>{currentEntry.book.author}</p><div className="progress-current-card__meter"><span style={{ width: `${currentPercent}%` }} /></div><small>P&#225;ginas: {currentPages} / {currentTotal || "-"}<strong>{currentPercent}%</strong></small></div>
                </div>
                <button type="button" onClick={onGoToLibrary}>Alterar livro</button>
              </> : <div className="progress-current-card__empty"><p>Nenhum livro em andamento.</p><button type="button" onClick={onGoToLibrary}>Escolher uma leitura</button></div>}
            </section>
            <ReadingTimer accessToken={accessToken} onToken={onToken} todayMinutes={today.minutes || 0} onSessionStopped={() => setRefreshCount((count) => count + 1)} />
          </div>

          <section className="progress-metric-row" aria-label="Resumo da leitura">
            <article><span aria-hidden="true">▤</span><strong>{today.pages || 0}</strong><small>P&#225;ginas hoje</small></article>
            <article><span aria-hidden="true">◷</span><strong>{today.minutes || 0}</strong><small>Minutos hoje</small></article>
            <article><span aria-hidden="true">▱</span><strong>{weekly.pages || 0}</strong><small>P&#225;ginas na semana</small></article>
            <article><span aria-hidden="true">♜</span><strong>{sixMonthBooks}</strong><small>Livros conclu&#237;dos &#183; 6 meses</small></article>
          </section>

          <div className="progress-lower-grid">
            <section className="progress-evolution-card" aria-labelledby="progress-evolution-title">
              <div className="progress-section-heading"><h2 id="progress-evolution-title">Evolu&#231;&#227;o de leitura</h2><div className="progress-period-switch" aria-label="Per&#237;odo do gr&#225;fico">
                {[{ id: "daily", label: "7 dias" }, { id: "weekly", label: "8 semanas" }, { id: "monthly", label: "6 meses" }].map((period) => <button type="button" key={period.id} className={chartPeriod === period.id ? "is-active" : ""} aria-pressed={chartPeriod === period.id} onClick={() => setChartPeriod(period.id)}>{period.label}</button>)}
              </div></div>
              <ReadingChart title="P&#225;ginas lidas" description={chartPeriod === "daily" ? "\u00daltimos 7 dias" : chartPeriod === "weekly" ? "\u00daltimas 8 semanas" : "\u00daltimos 6 meses"} items={chartItems} />
            </section>
            <section className="progress-achievements" aria-labelledby="progress-achievements-title">
              <h2 id="progress-achievements-title"><span aria-hidden="true">♜</span> Conquistas liter&#225;rias</h2>
              <p>Seu percurso nos &#250;ltimos seis meses.</p>
              {[{ label: "100 p\u00e1ginas lidas", value: sixMonthPages, target: 100, icon: "▤" }, { label: "3 livros conclu\u00eddos", value: sixMonthBooks, target: 3, icon: "▱" }, { label: "600 minutos de leitura", value: sixMonthMinutes, target: 600, icon: "◷" }].map((achievement) => {
                const progress = Math.min(100, Math.round((achievement.value / achievement.target) * 100));
                return <div className={`progress-achievement${progress >= 100 ? " is-complete" : ""}`} key={achievement.label}><span aria-hidden="true">{progress >= 100 ? "✓" : achievement.icon}</span><div><strong>{achievement.label}</strong><small>{achievement.value} / {achievement.target}</small><div className="progress-achievement__track"><i style={{ width: `${progress}%` }} /></div></div></div>;
              })}
            </section>
          </div>
        </>
      ) : <p className="library-feedback">N&#227;o foi poss&#237;vel carregar seu progresso.</p>}
      <p className="reading-progress-note">Os gr&#225;ficos contam avan&#231;os registrados a partir da ativa&#231;&#227;o deste hist&#243;rico.</p>
    </section>  );
}

async function fetchAllPages(path, accessToken, onToken) {
  const result = [];
  let page = 1;
  while (true) {
    const data = await catalogRequest(`${path}${path.includes("?") ? "&" : "?"}page=${page}`, accessToken, onToken);
    result.push(...(data.results || []));
    if (!data.next) return result;
    page += 1;
  }
}

function SharedLibrariesView({ accessToken, onToken, username, onUnreadChange }) {
  const [activeUsername, setActiveUsername] = useState(username || "");
  const [libraries, setLibraries] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [books, setBooks] = useState([]);
  const [reading, setReading] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [libraryName, setLibraryName] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLibrary, setInviteLibrary] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [edits, setEdits] = useState({});
  const [letter, setLetter] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const letterDialogRef = useRef(null);
  const letterCloseRef = useRef(null);
  const letterReturnFocusRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchAllPages("/shared-libraries/", accessToken, onToken),
      fetchAllPages("/shared-invitations/", accessToken, onToken),
      fetchAllPages("/shared-removal-requests/", accessToken, onToken),
      fetchAllPages("/shared-books/", accessToken, onToken),
      fetchAllPages("/shared-reading/", accessToken, onToken),
      catalogRequest("/auth/me/", accessToken, onToken),
    ]).then(([l, i, r, b, s, user]) => {
      if (!active) return;
      setLibraries(l); setInvitations(i); setRequests(r); setBooks(b); setReading(s);
      setActiveUsername(user.username || username || "");
      setSelectedId((current) => current && l.some((item) => item.id === current) ? current : l[0]?.id ?? null);
    }).catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, onToken, refresh]);

  const selected = libraries.find((item) => item.id === selectedId);
  const selectedBooks = books.filter((item) => item.shared_library.id === selectedId);
  const activeInvitation = letter?.kind === "invite" ? invitations.find((item) => item.id === letter.id) : null;
  const activeRequest = letter?.kind === "remove" ? requests.find((item) => item.id === letter.id) : null;
  const unread = invitations.filter((item) => item.recipient === activeUsername && item.status === "PENDING" && !item.opened_at).length
    + requests.filter((item) => item.recipient === activeUsername && item.status === "PENDING" && !item.opened_at).length;
  useEffect(() => { onUnreadChange(unread); }, [unread, onUnreadChange]);

  useEffect(() => {
    if (!letter) return undefined;
    const previousFocus = letterReturnFocusRef.current;
    letterCloseRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setLetter(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(letterDialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [letter]);

  const reload = () => setRefresh((value) => value + 1);

  async function act(path, options, message) {
    setBusy(true); setError(""); setNotice("");
    try { await catalogRequest(path, accessToken, onToken, options); if (message) setNotice(message); reload(); return true; }
    catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }

  async function createLibrary(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const created = await catalogRequest("/shared-libraries/", accessToken, onToken, { method: "POST", body: JSON.stringify({ name: libraryName.trim() }) });
      setLibraryName(""); setSelectedId(created.id); setNotice("Biblioteca compartilhada criada."); reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function sendInvite(event) {
    event.preventDefault();
    if (!inviteLibrary || !inviteName.trim()) return;
    if (await act("/shared-invitations/", { method: "POST", body: JSON.stringify({ shared_library_id: Number(inviteLibrary), recipient_username: inviteName.trim() }) }, "Convite enviado para o correio da outra pessoa.")) setInviteName("");
  }

  async function searchBooks(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true); setError("");
    try { const data = await catalogRequest(`/books/discover/?search=${encodeURIComponent(query.trim())}`, accessToken, onToken); setSearchResults(data.results || []); setError(data.warning || ""); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function openLetter(kind, item) {
    letterReturnFocusRef.current = document.activeElement;
    setLetter({ kind, id: item.id });
    if (item.opened_at) return;
    const path = kind === "invite" ? `/shared-invitations/${item.id}/open/` : `/shared-removal-requests/${item.id}/open/`;
    await act(path, { method: "POST" });
  }

  async function respond(action) {
    if (!letter) return;
    const resource = letter.kind === "invite" ? "shared-invitations" : "shared-removal-requests";
    const ok = await act(`/${resource}/${letter.id}/${action}/`, { method: "POST" }, {
      accept: "Convite aceito. A biblioteca já está disponível.", decline: "Convite recusado.",
      approve: "Pedido aprovado; a obra foi removida.", deny: "Pedido recusado; a obra permanece na estante.",
    }[action]);
    if (ok) setLetter(null);
  }

  async function addBook(book) {
    if (!selected) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const catalogBook = book.is_external
        ? await catalogRequest("/books/import/", accessToken, onToken, {
          method: "POST",
          body: JSON.stringify(externalBookImportPayload(book)),
        })
        : book;
      await catalogRequest("/shared-books/", accessToken, onToken, {
        method: "POST",
        body: JSON.stringify({ shared_library_id: selected.id, book_id: catalogBook.id }),
      });
      setNotice(`“${book.title}” foi adicionado à estante.`);
      setSearchResults([]);
      reload();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProgress(item) {
    const own = reading.find((state) => state.shared_library_id === selectedId && state.book_id === item.book.id);
    if (!own) return;
    const edit = edits[own.id] || { status: own.status, pages_read: own.pages_read };
    const pages = Number(edit.pages_read);
    if (!Number.isInteger(pages) || pages < 0 || (item.book.total_pages && pages > item.book.total_pages)) { setError("Informe um número de páginas válido."); return; }
    if (edit.status === "READ" && (!item.book.total_pages || pages !== item.book.total_pages)) { setError("Para marcar como lido, as páginas devem atingir o total da obra."); return; }
    await act(`/shared-reading/${own.id}/`, { method: "PATCH", body: JSON.stringify({ status: edit.status, pages_read: pages }) }, "Seu progresso foi atualizado.");
  }

  async function removeBook(item) {
    if (item.added_by === activeUsername) {
      await act(`/shared-books/${item.id}/`, { method: "DELETE" }, "Obra removida da estante compartilhada.");
    } else {
      await act("/shared-removal-requests/", { method: "POST", body: JSON.stringify({ shared_book_id: item.id }) }, "Pedido enviado; a obra só será removida com autorização.");
    }
  }

  return (
    <section id="library-content" className="shared-view explore-view" aria-labelledby="shared-title" aria-busy={loading}>
      <div className="explore-heading"><div><p className="library-kicker">leituras em companhia</p><h1 id="shared-title">Biblioteca compartilhada.</h1><p className="explore-intro">Monte uma estante com outra pessoa e acompanhem o progresso de cada um.</p></div><button className="shared-mailbox-button" type="button" onClick={() => document.getElementById("shared-mailbox")?.scrollIntoView({ behavior: "smooth" })}>Correio{unread > 0 && <span>{unread}</span>}</button></div>
      {error && <p className="library-error" role="alert">{error}</p>}{notice && <p className="shared-notice" role="status">{notice}</p>}
      <div className="shared-setup-grid">
        <form className="shared-form-card" onSubmit={createLibrary}><p className="library-kicker">um projeto a dois</p><h2>Criar uma estante</h2><label>Nome da biblioteca<input value={libraryName} maxLength={120} onChange={(event) => setLibraryName(event.target.value)} placeholder="Ex.: Leituras de domingo" /></label><button className="library-primary-button" disabled={busy || !libraryName.trim()}>criar biblioteca</button></form>
        <form className="shared-form-card" onSubmit={sendInvite}><p className="library-kicker">convide para entrar</p><h2>Enviar uma carta</h2><label>Estante<select required value={inviteLibrary} onChange={(event) => setInviteLibrary(event.target.value)}><option value="">Escolha uma biblioteca</option>{libraries.filter((item) => item.owner === activeUsername).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Nome de usuário<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Ex.: ana_leitora" /></label><button className="library-primary-button" disabled={busy || !inviteLibrary || !inviteName.trim()}>enviar convite</button></form>
      </div>

      <section className="shared-mailbox" id="shared-mailbox" aria-labelledby="shared-mailbox-title"><div className="shared-section-heading"><div><p className="library-kicker">correio interno</p><h2 id="shared-mailbox-title">Cartas e notificações</h2></div><span>{unread ? `${unread} não lida${unread === 1 ? "" : "s"}` : "em dia"}</span></div>
        {loading ? <p className="library-feedback" role="status">buscando suas cartas…</p> : <div className="shared-letter-list">
          {invitations.map((item) => <button type="button" key={`i-${item.id}`} className={`shared-letter-teaser${!item.opened_at ? " is-unread" : ""}`} onClick={() => openLetter("invite", item)}><span className="shared-envelope" aria-hidden="true"><i /></span><span><strong>{item.recipient === activeUsername && item.status === "PENDING" ? "Convite recebido" : "Convite de biblioteca"}</strong><small>{item.shared_library.name} · {item.recipient === activeUsername ? `de ${item.sender}` : `para ${item.recipient}`}</small></span><em>{item.status === "PENDING" ? "pendente" : item.status === "ACCEPTED" ? "aceito" : "recusado"}</em></button>)}
          {requests.map((item) => <button type="button" key={`r-${item.id}`} className={`shared-letter-teaser${!item.opened_at ? " is-unread" : ""}`} onClick={() => openLetter("remove", item)}><span className="shared-envelope shared-envelope--notice" aria-hidden="true"><i /></span><span><strong>{item.recipient === activeUsername ? "Pedido de remoção" : "Seu pedido de remoção"}</strong><small>{item.book_title} · {item.shared_library_name || "biblioteca"}</small></span><em>{item.status === "PENDING" ? "pendente" : item.status === "APPROVED" ? "aprovado" : "recusado"}</em></button>)}
          {!invitations.length && !requests.length && <p className="shared-empty">Seu correio está vazio por enquanto.</p>}
        </div>}
      </section>

      <section className="shared-libraries" aria-labelledby="shared-libraries-title"><div className="shared-section-heading"><div><p className="library-kicker">estantes em conjunto</p><h2 id="shared-libraries-title">Suas bibliotecas</h2></div><span>{libraries.length} {libraries.length === 1 ? "estante" : "estantes"}</span></div>
        {libraries.length ? <div className="shared-library-tabs" role="tablist" aria-label="Bibliotecas compartilhadas">{libraries.map((item) => <button type="button" role="tab" aria-selected={selectedId === item.id} className={selectedId === item.id ? "is-active" : ""} key={item.id} onClick={() => setSelectedId(item.id)}><strong>{item.name}</strong><small>{item.members.join(" · ")}</small></button>)}</div> : <p className="shared-empty shared-empty--panel">Crie uma biblioteca ou aceite um convite para montar uma estante em conjunto.</p>}
        {selected && <div className="shared-shelf-panel"><div className="shared-section-heading"><div><p className="library-kicker">{selected.members.join(" · ")}</p><h3>{selected.name}</h3></div><span>{selectedBooks.length} {selectedBooks.length === 1 ? "livro" : "livros"}</span></div>
          <form className="shared-book-search" onSubmit={searchBooks}><label>Adicionar obra do catálogo<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por título ou autor" /></label><button className="library-primary-button" disabled={busy || !query.trim()}>buscar obras</button></form>
          {searchResults.length > 0 && <div className="shared-catalog-results">{searchResults.map((book) => { const already = books.some((item) => item.shared_library.id === selectedId && (item.book.id === book.id || (book.is_external && item.book.title.trim().toLocaleLowerCase() === book.title.trim().toLocaleLowerCase() && item.book.author.trim().toLocaleLowerCase() === book.author.trim().toLocaleLowerCase()))); return <article key={book.id}><span>{book.title} <small>— {book.author}{book.source ? ` · ${book.source}` : ""}</small></span><button type="button" disabled={busy || already} onClick={() => addBook(book)}>{already ? "na estante" : "+ adicionar"}</button></article>; })}</div>}
          {selectedBooks.length ? <div className="shared-book-grid">{selectedBooks.map((item) => {
            const own = reading.find((state) => state.shared_library_id === selectedId && state.book_id === item.book.id);
            const edit = own ? edits[own.id] || { status: own.status, pages_read: own.pages_read } : null;
            const pending = requests.some((request) => request.shared_book_id === item.id && request.status === "PENDING");
            return <article className="shared-book-card" key={item.id}>{item.book.cover_url && <img src={item.book.cover_url} alt={`Capa de ${item.book.title}`} onError={(event) => { event.currentTarget.hidden = true; }} />}<div className="shared-book-card__body"><p className="library-kicker">adicionado por {item.added_by}</p><h4>{item.book.title}</h4><p>{item.book.author}</p><ul>{item.reading_states.map((state) => <li key={state.id}><span>{state.username}</span><small>{statusLabel(state.status)} · {state.pages_read}{item.book.total_pages ? `/${item.book.total_pages}` : ""} páginas</small></li>)}</ul>
              {own && <form className="shared-progress-form" onSubmit={(event) => { event.preventDefault(); saveProgress(item); }}><label>Seu status<select value={edit.status} onChange={(event) => setEdits((current) => ({ ...current, [own.id]: { ...edit, status: event.target.value } }))}><option value="WANT_TO_READ">Desejos</option><option value="READING">Lendo</option><option value="READ">Já lidos</option></select></label><label>Páginas<input type="number" min="0" max={item.book.total_pages || undefined} value={edit.pages_read} onChange={(event) => setEdits((current) => ({ ...current, [own.id]: { ...edit, pages_read: event.target.value } }))} /></label><button type="submit" disabled={busy}>salvar meu progresso</button></form>}
              <button className="shared-remove-button" type="button" disabled={busy || (item.added_by !== activeUsername && pending)} onClick={() => removeBook(item)}>{item.added_by === activeUsername ? "remover da estante" : pending ? "aguardando autorização" : "pedir remoção da obra"}</button>
            </div></article>;
          })}</div> : <p className="shared-empty">Esta estante ainda não tem obras. Busque uma no catálogo para adicioná-la.</p>}
        </div>}
      </section>

      {(activeInvitation || activeRequest) && <div className="shared-letter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setLetter(null); }}><article ref={letterDialogRef} className="shared-letter-open" role="dialog" aria-modal="true" aria-labelledby="shared-letter-title"><button ref={letterCloseRef} className="shared-letter-close" type="button" onClick={() => setLetter(null)} aria-label="Fechar carta">×</button><div className="shared-letter-open__envelope" aria-hidden="true"><span /></div><div className="shared-letter-open__paper"><p className="library-kicker">uma carta para você</p>
        {activeInvitation ? <><h2 id="shared-letter-title">Convite para ler em conjunto</h2><p><strong>{activeInvitation.sender}</strong> convidou você para a biblioteca <strong>{activeInvitation.shared_library.name}</strong>.</p><p>Participantes: {activeInvitation.shared_library.members.join(" · ")}</p>{activeInvitation.recipient === activeUsername && activeInvitation.status === "PENDING" && <div className="shared-letter-actions"><button type="button" disabled={busy} onClick={() => respond("decline")}>recusar</button><button type="button" disabled={busy} onClick={() => respond("accept")}>aceitar convite</button></div>}{activeInvitation.status !== "PENDING" && <p>Este convite foi {activeInvitation.status === "ACCEPTED" ? "aceito" : "recusado"}.</p>}</> : activeRequest && <><h2 id="shared-letter-title">Pedido para remover uma obra</h2><p><strong>{activeRequest.requested_by}</strong> pediu autorização para remover <strong>{activeRequest.book_title}</strong> da biblioteca <strong>{activeRequest.shared_library_name}</strong>.</p>{activeRequest.recipient === activeUsername && activeRequest.status === "PENDING" && <div className="shared-letter-actions"><button type="button" disabled={busy} onClick={() => respond("deny")}>manter na estante</button><button type="button" disabled={busy} onClick={() => respond("approve")}>autorizar remoção</button></div>}{activeRequest.status !== "PENDING" && <p>Pedido {activeRequest.status === "APPROVED" ? "aprovado" : "recusado"}.</p>}</>}
      </div></article></div>}
    </section>
  );
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
  const [similarBooks, setSimilarBooks] = useState([]);
  const [recommendationGenre, setRecommendationGenre] = useState("");
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    const genreQuery = submittedGenre || results.find((book) => book.genre?.trim())?.genre?.trim() || "";
    setRecommendationGenre(genreQuery);
    if (!genreQuery || !results.length) {
      setSimilarBooks([]);
      setLoadingRecommendations(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingRecommendations(true);
    const delay = window.setTimeout(() => {
      const pageToRecommend = submittedGenre ? 2 : 1;
      getLibraryPage(`/books/discover/?genre=${encodeURIComponent(genreQuery)}&page=${pageToRecommend}`, accessToken, onToken, controller.signal)
        .then((data) => {
          const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR");
          const currentBooks = new Set(results.map((book) => `${normalize(book.title)}|${normalize(book.author)}`));
          setSimilarBooks((data.results || []).filter((book) => !currentBooks.has(`${normalize(book.title)}|${normalize(book.author)}`)).slice(0, 3));
        })
        .catch((requestError) => {
          if (requestError.name !== "AbortError") setSimilarBooks([]);
        })
        .finally(() => setLoadingRecommendations(false));
    }, 1100);

    return () => {
      window.clearTimeout(delay);
      controller.abort();
    };
  }, [accessToken, onToken, results, submittedGenre]);
  useEffect(() => {
    if (!submittedSearch && !submittedGenre) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page) });
    if (submittedSearch) params.set("search", submittedSearch);
    if (submittedGenre) params.set("genre", submittedGenre);
    setLoading(true);
    setError("");
    getLibraryPage(`/books/discover/?${params.toString()}`, accessToken, onToken, controller.signal)
      .then((data) => {
        setResults(data.results || []);
        setTotalBooks(data.count || 0);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
        setError(data.warning || "");
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

  function searchForSuggestion(value, type = "title") {
    const nextValue = value.trim();
    if (!nextValue) return;
    setError("");
    setPage(1);
    setSearch(type === "genre" ? "" : nextValue);
    setGenre(type === "genre" ? nextValue : "");
    setSubmittedSearch(type === "genre" ? "" : nextValue);
    setSubmittedGenre(type === "genre" ? nextValue : "");
  }

  function clearSearch() {
    setSearch("");
    setGenre("");
    setSubmittedSearch("");
    setSubmittedGenre("");
    setResults([]);
    setTotalBooks(0);
    setHasNext(false);
    setHasPrevious(false);
    setError("");
    setPage(1);
  }

  async function addBook(book, requestedCategory) {
    const category = requestedCategory || categories[book.id] || "WANT_TO_READ";
    if (category === "READ" && !book.total_pages) {
      setFeedback((current) => ({ ...current, [book.id]: "Informe o total de páginas antes de marcar esta obra como lida." }));
      return;
    }
    setAddingBook(book.id);
    setFeedback((current) => ({ ...current, [book.id]: "" }));
    try {
      const catalogBook = book.is_external
        ? await catalogRequest("/books/import/", accessToken, onToken, {
          method: "POST",
          body: JSON.stringify(externalBookImportPayload(book)),
        })
        : book;
      await catalogRequest("/library/", accessToken, onToken, {
        method: "POST",
        body: JSON.stringify({
          book_id: catalogBook.id,
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
    <section id="library-content" className="explore-view" aria-labelledby="explore-title" aria-busy={loading}>
      <div className="explore-dashboard">
        <div className="explore-dashboard__main">
      <div className="explore-heading explore-heading--primary">
        <div>
          <h1 id="explore-title">Encontre sua próxima leitura.</h1>
        </div>
      </div>
      <form className="explore-search" onSubmit={submitSearch} aria-label="Buscar livros no catálogo">
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
        <button className="explore-search__clear" type="button" onClick={clearSearch} disabled={!search && !genre && !submittedSearch && !submittedGenre}>Limpar filtros</button>
      </form>

      <div className="explore-popular-searches" aria-label="Buscas populares">
        <span>Buscas populares</span>
        <button type="button" onClick={() => searchForSuggestion("Fantasia", "genre")}>Fantasia</button>
        <button type="button" onClick={() => searchForSuggestion("ficção científica", "genre")}>Ficção científica</button>
        <button type="button" onClick={() => searchForSuggestion("Machado de Assis")}>Machado de Assis</button>
        <button type="button" onClick={() => searchForSuggestion("O Pequeno Príncipe")}>O Pequeno Príncipe</button>
      </div>

      <div className="catalog-results-heading">
        <h2>Resultados do catálogo</h2>
        {(submittedSearch || submittedGenre) && <span>{totalBooks} {totalBooks === 1 ? "obra encontrada" : "obras encontradas"}</span>}
      </div>
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
                    <strong>{book.title}</strong><i>{book.author}</i>
                  </div>
                  <span className="catalog-card__cover-shadow" aria-hidden="true" />
                </div>
                <div className="catalog-card__body">
                  <button className={`catalog-card__bookmark${addedBooks[book.id] ? " is-saved" : ""}`} type="button" disabled={Boolean(addingBook) || Boolean(addedBooks[book.id])} onClick={() => addBook(book, "WANT_TO_READ")} aria-label={addedBooks[book.id] ? `${book.title} está na sua biblioteca` : `Adicionar ${book.title} à lista de desejos`} title={addedBooks[book.id] ? "Adicionado à sua biblioteca" : "Adicionar à lista de desejos"}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h12v16l-6-4-6 4z" /></svg>
                  </button>
                  <p className="catalog-card__eyebrow">{book.genre || "obra do catálogo"}</p>
                  <h2>{book.title}</h2>
                  <p className="catalog-card__author">{book.author}</p>
                  <div className="catalog-card__rating" aria-label={book.average_rating != null ? `Avaliação média ${Number(book.average_rating).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5${book.ratings_count ? `, ${book.ratings_count} avaliações` : ""}` : "Esta obra ainda não tem avaliação disponível"}>
                    <span aria-hidden="true">★</span>
                    {book.average_rating != null ? <strong>{Number(book.average_rating).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{book.ratings_count ? ` (${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(book.ratings_count)})` : ""}</strong> : <small>Sem avaliações</small>}
                  </div>
                  <div className="catalog-card__facts">
                    {book.total_pages ? <span>{book.total_pages} páginas</span> : <span>páginas não informadas</span>}
                    {(book.publication_year || book.publication_date?.slice(0, 4)) && <span>{book.publication_year || book.publication_date.slice(0, 4)}</span>}
                  <p className="catalog-card__source">Fonte: {book.source || "Catálogo MyBooks"}{book.external_url && <> · <a href={book.external_url} target="_blank" rel="noreferrer">ver registro</a></>}</p>
                  </div>
                  <p className="catalog-card__synopsis">{book.synopsis || "Ainda não há um resumo cadastrado para esta obra."}</p>
                  <div className="catalog-card__actions">
                    <label>
                      <span>Adicionar como</span>
                      <select value={categories[book.id] || "WANT_TO_READ"} disabled={Boolean(addedBooks[book.id])} onChange={(event) => setCategories((current) => ({ ...current, [book.id]: event.target.value }))}>
                        <option value="WANT_TO_READ">Desejos</option>
                        <option value="READING">Lendo</option>
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
        </div>

        <aside className="explore-sidebar" aria-label="Sugestões de livros">
          {results.length > 0 && recommendationGenre && <section className="explore-suggestions" aria-labelledby="explore-suggestions-title">
            <div className="explore-suggestions__heading">
              <h2 id="explore-suggestions-title"><span aria-hidden="true">✧</span>Você também pode se interessar</h2>
              <p>Outras obras do mesmo gênero da sua busca.</p>
            </div>
            {similarBooks.map((book) => (
              <article className="explore-suggestion" key={book.id}>
                {book.cover_url ? <img src={book.cover_url} alt={`Capa de ${book.title}`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling.hidden = false; }} /> : null}
                <span className="explore-suggestion__placeholder" aria-hidden="true" hidden={Boolean(book.cover_url)} />
                <div><h3>{book.title}</h3><p>{book.author}</p></div>
                {book.average_rating != null && <p className="explore-suggestion__rating" aria-label={`Avaliação ${Number(book.average_rating).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 5`}><span aria-hidden="true">★</span>{Number(book.average_rating).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>}
                <button type="button" disabled={Boolean(addingBook) || Boolean(addedBooks[book.id])} onClick={() => addBook(book, "WANT_TO_READ")} aria-label={addedBooks[book.id] ? `${book.title} já está na sua biblioteca` : `Adicionar ${book.title} à lista de desejos`}>{addedBooks[book.id] ? "✓" : "＋"}</button>
              </article>
            ))}
            {loadingRecommendations && <p className="explore-recommendations-loading" role="status">Buscando obras semelhantes…</p>}
            {!loadingRecommendations && !similarBooks.length && <p className="explore-recommendations-empty">Não encontrei outras obras desse gênero no catálogo agora.</p>}
          </section>}
        </aside>
      </div>
    </section>
  );
}

function LibraryLanding({ onReturn }) {
  const [accessToken, setAccessToken] = useState(() => window.localStorage.getItem("mybooks:access-token") || "");
  const [activeView, setActiveView] = useState("library");
  const [navUnread, setNavUnread] = useState(0);
  const [username, setUsername] = useState(() => window.localStorage.getItem("mybooks:username") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [entries, setEntries] = useState([]);
  const [pulledBookId, setPulledBookId] = useState(null);
  const [openedEntry, setOpenedEntry] = useState(null);
  const [isClosingBook, setIsClosingBook] = useState(false);
  const bookTransitionTimerRef = useRef(null);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [submittedGenre, setSubmittedGenre] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState("");
  const [page, setPage] = useState(1);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);
  const [movingBookId, setMovingBookId] = useState(null);
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [dragOverShelf, setDragOverShelf] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  const [dragSwapTargetId, setDragSwapTargetId] = useState(null);
  const bookDragRef = useRef(null);
  const suppressBookClickRef = useRef(false);
  const suppressBookClickTimerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    window.clearTimeout(bookTransitionTimerRef.current);
    window.clearTimeout(suppressBookClickTimerRef.current);
  }, []);

  useEffect(() => {
    if (!accessToken) {
      setNavUnread(0);
      return undefined;
    }
    let active = true;
    catalogRequest("/mailbox/", accessToken, setAccessToken)
      .then((data) => {
        if (active) setNavUnread(Number(data.unread_count) || 0);
      })
      .catch(() => {
        // The shared view can still show the mailbox if this badge request fails.
      });
    return () => { active = false; };
  }, [accessToken]);

  function openBook(entry) {
    window.clearTimeout(bookTransitionTimerRef.current);
    setIsClosingBook(false);
    setPulledBookId(entry.id);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setOpenedEntry(entry);
      return;
    }
    bookTransitionTimerRef.current = window.setTimeout(() => {
      setOpenedEntry(entry);
      bookTransitionTimerRef.current = null;
    }, 180);
  }

  const closeBook = useCallback(() => {
    window.clearTimeout(bookTransitionTimerRef.current);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setOpenedEntry(null);
      setPulledBookId(null);
      setIsClosingBook(false);
      return;
    }
    setIsClosingBook(true);
    bookTransitionTimerRef.current = window.setTimeout(() => {
      setOpenedEntry(null);
      setPulledBookId(null);
      setIsClosingBook(false);
      bookTransitionTimerRef.current = null;
    }, 220);
  }, []);

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
  }, [accessToken, page, submittedSearch, submittedGenre, submittedStatus, libraryRevision]);

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
      window.localStorage.setItem("mybooks:username", username);
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
    window.localStorage.removeItem("mybooks:username");
    setAccessToken("");
    setActiveView("library");
    setNavUnread(0);
    setEntries([]);
  }

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
    setSubmittedGenre(genre.trim());
    setSubmittedStatus(status);
  }

  function applyCategory(category) {
    setStatus(category);
    setPage(1);
    setSubmittedSearch(search.trim());
    setSubmittedGenre(genre.trim());
    setSubmittedStatus(category);
  }

  async function moveBook(entry, targetShelf, targetPosition) {
    setMovingBookId(entry.id);
    setError("");
    try {
      await catalogRequest(`/library/${entry.id}/move/`, accessToken, setAccessToken, {
        method: "PATCH",
        body: JSON.stringify({ shelf: targetShelf, position: targetPosition }),
      });
      setLibraryRevision((revision) => revision + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMovingBookId(null);
    }
  }

  async function swapBooks(entry, targetEntryId) {
    setMovingBookId(entry.id);
    setError("");
    try {
      await catalogRequest(`/library/${entry.id}/swap/`, accessToken, setAccessToken, {
        method: "PATCH",
        body: JSON.stringify({ target_entry_id: targetEntryId }),
      });
      setLibraryRevision((revision) => revision + 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setMovingBookId(null);
    }
  }

  function bookAtPoint(x, y, entry) {
    const slot = document.elementFromPoint(x, y)?.closest(".shelf-book-slot[data-entry-id]");
    if (!slot || slot.dataset.entryId === String(entry.id)) return null;
    const bounds = slot.getBoundingClientRect();
    const horizontalPosition = (x - bounds.left) / bounds.width;
    if (horizontalPosition < 0.25 || horizontalPosition > 0.75) return null;
    const targetEntryId = Number(slot.dataset.entryId);
    const targetEntry = entries.find((item) => item.id === targetEntryId);
    return targetEntry ? { id: targetEntryId, shelf: Number(slot.closest("[data-shelf-index]")?.dataset.shelfIndex) } : null;
  }

  function shelfLocationAtPoint(x, y, entry) {
    const row = document.elementFromPoint(x, y)?.closest("[data-shelf-index]");
    if (!row) return null;
    const shelf = Number(row.dataset.shelfIndex);
    if (!Number.isInteger(shelf)) return null;
    const slots = [...row.querySelectorAll(".shelf-book-slot")]
      .filter((slot) => slot.dataset.entryId !== String(entry.id));
    const position = slots.findIndex((slot) => x < slot.getBoundingClientRect().left + slot.getBoundingClientRect().width / 2);
    return { shelf, position: position < 0 ? slots.length : position };
  }

  function canDropBookAt(entry, targetShelf, targetPosition) {
    if (targetShelf === null || targetShelf < 0 || targetPosition === null) return false;
    const currentShelf = Math.max(0, Number(entry.shelf) || 0);
    const shelves = groupIntoShelves(entries);
    if (targetShelf >= shelves.length) return false;
    const targetEntries = shelves[targetShelf].filter((item) => item.id !== entry.id);
    if (targetEntries.length >= SHELF_CAPACITY || targetPosition > targetEntries.length) return false;
    return targetShelf !== currentShelf || targetPosition !== Number(entry.position || 0);
  }

  function beginBookDrag(event, entry, color, height) {
    if (event.button !== 0 || movingBookId) return;
    bookDragRef.current = {
      entry,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      color,
      height,
      started: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function updateBookDrag(event) {
    const drag = bookDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.started && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
    if (!drag.started) {
      drag.started = true;
      suppressBookClickRef.current = true;
      setDraggedBookId(drag.entry.id);
    }
    setDragPosition({ x: event.clientX, y: event.clientY });
    const swapTarget = bookAtPoint(event.clientX, event.clientY, drag.entry);
    if (swapTarget) {
      setDragSwapTargetId(swapTarget.id);
      setDragOverShelf(swapTarget.shelf);
      setDragOverPosition(null);
    } else {
      const location = shelfLocationAtPoint(event.clientX, event.clientY, drag.entry);
      const canDrop = location && canDropBookAt(drag.entry, location.shelf, location.position);
      setDragSwapTargetId(null);
      setDragOverShelf(canDrop ? location.shelf : null);
      setDragOverPosition(canDrop ? location.position : null);
    }
  }

  function finishBookDrag(event) {
    const drag = bookDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.started) {
      const swapTarget = bookAtPoint(event.clientX, event.clientY, drag.entry);
      const location = swapTarget ? null : shelfLocationAtPoint(event.clientX, event.clientY, drag.entry);
      if (swapTarget) {
        void swapBooks(drag.entry, swapTarget.id);
      } else if (location && canDropBookAt(drag.entry, location.shelf, location.position)) {
        void moveBook(drag.entry, location.shelf, location.position);
      }
      suppressBookClickTimerRef.current = window.setTimeout(() => {
        suppressBookClickRef.current = false;
      }, 450);
    }
    bookDragRef.current = null;
    setDraggedBookId(null);
    setDragPosition(null);
    setDragOverShelf(null);
    setDragOverPosition(null);
    setDragSwapTargetId(null);
  }

  function cancelBookDrag(event) {
    if (bookDragRef.current?.pointerId !== event.pointerId) return;
    bookDragRef.current = null;
    suppressBookClickRef.current = false;
    window.clearTimeout(suppressBookClickTimerRef.current);
    setDraggedBookId(null);
    setDragPosition(null);
    setDragOverShelf(null);
    setDragOverPosition(null);
    setDragSwapTargetId(null);
  }

  function openBookUnlessDragged(event, entry) {
    if (suppressBookClickRef.current) {
      event.preventDefault();
      suppressBookClickRef.current = false;
      window.clearTimeout(suppressBookClickTimerRef.current);
      return;
    }
    openBook(entry);
  }

  const readingEntries = entries.filter((entry) => entry.status === "READING");
  const readEntries = entries.filter((entry) => entry.status === "READ");
  const wishEntries = entries.filter((entry) => entry.status === "WANT_TO_READ");
  const currentReading = readingEntries[0];
  const currentReadingPages = Number(currentReading?.pages_read) || 0;
  const currentReadingTotal = Number(currentReading?.book.total_pages) || 0;
  const currentReadingPercent = currentReadingTotal
    ? Math.min(100, Math.round((currentReadingPages / currentReadingTotal) * 100))
    : 0;
  const collectionProgress = entries.length
    ? Math.round((readEntries.length / entries.length) * 100)
    : 0;

  return (
    <main id="library-main" className={`library-landing${accessToken ? " has-navigation library-landing--themed" : ""}${accessToken && activeView === "library" ? " library-landing--personal" : ""}`}>
      {accessToken && <a className="skip-link" href="#library-content">Pular para o conteúdo</a>}
      <header className={`library-header${accessToken ? "" : " library-header--login"}`}>
        {accessToken && <button className="library-header__mark" type="button" onClick={() => setActiveView("library")} aria-label="Ir para minha biblioteca">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5.5c2.6-.8 5-.3 7.5 1.2v12c-2.5-1.5-4.9-2-7.5-1.2zM19.5 5.5c-2.6-.8-5-.3-7.5 1.2v12c2.5-1.5 4.9-2 7.5-1.2z" /><path d="M12 6.7v12" /></svg>
        </button>}
        <a className="library-wordmark" href="#inicio" onClick={(event) => { event.preventDefault(); onReturn(); }}>
          MyBooks<span aria-hidden="true">.</span>
        </a>
        {accessToken && <nav className="library-navigation" aria-label="Navegação principal">
          <button aria-label="Minha biblioteca" aria-current={activeView === "library" ? "page" : undefined} className={activeView === "library" ? "is-active" : ""} type="button" onClick={() => setActiveView("library")}><span aria-hidden="true" className="library-navigation__icon"><svg viewBox="0 0 24 24"><path d="M4.5 5.5c2.6-.8 5-.3 7.5 1.2v12c-2.5-1.5-4.9-2-7.5-1.2zM19.5 5.5c-2.6-.8-5-.3-7.5 1.2v12c2.5-1.5 4.9-2 7.5-1.2z" /><path d="M12 6.7v12" /></svg></span><span className="library-navigation__text--long">Minha biblioteca</span><span className="library-navigation__text--short" aria-hidden="true">Biblioteca</span></button>
          <button aria-label="Explorar obras" aria-current={activeView === "explore" ? "page" : undefined} className={activeView === "explore" ? "is-active" : ""} type="button" onClick={() => setActiveView("explore")}><span aria-hidden="true" className="library-navigation__icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-2 4.1-3.6 1.5 1.7-3.8z" /></svg></span><span className="library-navigation__text--long">Explorar obras</span><span className="library-navigation__text--short" aria-hidden="true">Explorar</span></button>
          <button aria-label="Progresso" aria-current={activeView === "progress" ? "page" : undefined} className={activeView === "progress" ? "is-active" : ""} type="button" onClick={() => setActiveView("progress")}><span aria-hidden="true" className="library-navigation__icon"><svg viewBox="0 0 24 24"><path d="M4 19h3V11H4zM10.5 19h3V7h-3zM17 19h3V4h-3z" /></svg></span><span>Progresso</span></button>
          <button aria-label="Biblioteca compartilhada" aria-current={activeView === "shared" ? "page" : undefined} className={activeView === "shared" ? "is-active" : ""} type="button" onClick={() => setActiveView("shared")}><span aria-hidden="true" className="library-navigation__icon"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.4-3.3 2.2-5 5.5-5s5.1 1.7 5.5 5M16 5.5a3 3 0 0 1 0 5.8m1 3c2.1.5 3.3 2 3.5 4.7" /></svg></span><span className="library-navigation__text--long">Compartilhada</span><span className="library-navigation__text--short" aria-hidden="true">Juntos</span></button>
        </nav>}
        <div className="library-header__actions">
          {accessToken && <>
            <button className="library-header__icon-button library-header__search" type="button" aria-label="Buscar obras" onClick={() => setActiveView("explore")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.5 15.5 4.1 4.1" /></svg>
            </button>
            <button className="library-header__icon-button library-header__notifications" type="button" aria-label={navUnread ? `${navUnread} notificações não lidas` : "Notificações"} onClick={() => setActiveView("shared")}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16 18 16 18 9ZM10 21h4" /></svg>
              {navUnread > 0 && <span className="library-header__notification-dot" aria-hidden="true">{navUnread > 9 ? "9+" : navUnread}</span>}
            </button>
            <Avatar className="library-header__avatar" role="img" aria-label={username ? `Usuário ${username}` : "Perfil do usuário"}>
              <AvatarFallback>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.5-3.8 2.9-5.8 6.5-5.8s6 2 6.5 5.8" /></svg>
              </AvatarFallback>
            </Avatar>
          </>}
          {accessToken && <button className="library-text-button" type="button" onClick={signOut}>sair</button>}
        </div>
      </header>
      {!accessToken ? (
        <div className="login-layout">
          <aside className="login-story" aria-label="Uma mensagem sobre leitura">
            <div className="login-story__art" aria-hidden="true">
              <svg viewBox="0 0 360 240" role="presentation">
                <circle className="login-story__orb" cx="180" cy="108" r="91" />
                <path className="login-story__page" d="M180 195c-37-28-82-37-132-24V54c51-14 96-5 132 24z" />
                <path className="login-story__page login-story__page--right" d="M180 195c37-28 82-37 132-24V54c-51-14-96-5-132 24z" />
                <path className="login-story__book-lines" d="M65 79c34-8 66-2 96 16M65 97c32-7 63-2 96 16M65 115c28-5 58 1 88 16M295 79c-34-8-66-2-96 16m96 2c-32-7-63-2-96 16m96 2c-28-5-58 1-88 16" />
                <path className="login-story__spine" d="M180 78v117m-5-113 5 8 5-8" />
              </svg>
            </div>
            <h2>Histórias que deixam marcas.</h2>
            <p>Sua coleção, seu ritmo, seu próximo capítulo.</p>
            <div className="login-story__catalogue" aria-hidden="true">
              <span>LEITOR · 001</span>
              <span>DESDE 2026</span>
            </div>
          </aside>

          <Card as="section" className="login-card" aria-labelledby="library-title">
            <CardHeader className="login-card__header">
              <CardTitle as="h1" id="library-title" className={creatingAccount ? undefined : "login-title__single-line"}>
                {creatingAccount ? "Abra sua primeira estante." : <>Seja <span className="login-title__greeting">bem-vindo(a)</span></>}
              </CardTitle>
              <CardDescription className="login-card__description">
                {creatingAccount ? "Crie sua conta e dê um lugar às histórias que você ama." : "Entre para registrar leituras e encontrar seu próximo livro."}
              </CardDescription>
            </CardHeader>

            <CardContent className="login-card__content">
              <form className="login-form" onSubmit={submitAccess} aria-describedby={error ? "login-error" : undefined}>
                <Field>
                  <FieldLabel htmlFor="login-username">Nome de usuário</FieldLabel>
                  <Input id="login-username" name="username" autoFocus={!creatingAccount} autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
                </Field>
                {creatingAccount && (
                  <Field>
                    <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
                    <Input id="login-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                  </Field>
                )}
                <Field>
                  <FieldLabel htmlFor="login-password">Senha</FieldLabel>
                  <div className="password-field">
                    <Input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete={creatingAccount ? "new-password" : "current-password"} required minLength={creatingAccount ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={creatingAccount ? "password-hint" : undefined} />
                    <Button type="button" variant="ghost" size="sm" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-pressed={showPassword}>
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </Button>
                  </div>
                  {creatingAccount && <FieldDescription id="password-hint" className="password-hint">Use pelo menos 8 caracteres.</FieldDescription>}
                </Field>
                {error && <Alert id="login-error" variant="destructive" className="login-alert"><AlertDescription>{error}</AlertDescription></Alert>}
                <Button className="login-submit-button" type="submit" size="lg" disabled={loading}>
                  {loading ? "aguarde…" : creatingAccount ? "criar minha conta" : "abrir minha estante"}
                  {!loading && <span aria-hidden="true">↗</span>}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="login-card__footer">
              <span>{creatingAccount ? "Já tem uma conta?" : "Primeira visita?"}</span>
              <Button variant="link" size="sm" type="button" onClick={() => { setCreatingAccount((value) => !value); setError(""); }}>
                {creatingAccount ? "Entrar" : "Criar conta"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : activeView === "explore" ? (
        <CatalogExplorer accessToken={accessToken} onToken={setAccessToken} />
      ) : activeView === "progress" ? (
        <ReadingProgressView accessToken={accessToken} onToken={setAccessToken} onGoToLibrary={() => setActiveView("library")} />
      ) : activeView === "shared" ? (
        <SharedLibrariesView accessToken={accessToken} onToken={setAccessToken} username={username || window.localStorage.getItem("mybooks:username") || ""} onUnreadChange={setNavUnread} />
      ) : (
        <section id="library-content" className="personal-library" aria-labelledby="library-title" aria-busy={loading}>
          <div className="library-dashboard">
            <div className="library-dashboard__main">
              <div className="personal-library__heading">
                <div>
                  <p className="library-kicker">sua coleção pessoal</p>
                  <h1 id="library-title">Minha Biblioteca</h1>
                  <p className="library-dashboard__subtitle">Suas histórias, organizadas do seu jeito.</p>
                </div>
              </div>
          <form className="library-filters" onSubmit={applyFilters}>
            <div className="library-filters__fields">
              <label className="filter-search">
                <span>Título ou autor</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: Machado de Assis" />
              </label>
              <label>
                <span>Gênero</span>
                <input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Todos os gêneros" />
              </label>
              <div className="filter-actions">
                <button className="library-primary-button" type="submit">buscar</button>
                {(search || genre || submittedSearch || submittedGenre || status || submittedStatus) && (
                  <button className="library-text-button" type="button" onClick={() => {
                    setSearch(""); setGenre(""); setStatus(""); setSubmittedSearch(""); setSubmittedGenre(""); setSubmittedStatus(""); setPage(1);
                  }}>limpar filtros</button>
                )}
              </div>
            </div>

            <Tabs
              className="library-category-tabs"
              value={submittedStatus}
              onValueChange={(value) => applyCategory(value)}
            >
              <div className="library-category-bar">
              <span className="library-category-bar__label">Mostrar</span>
              <TabsList className="library-category-bar__tabs" aria-label="Filtrar estante por categoria">
                {[
                  { label: "Todos", value: "" },
                  { label: "Desejos", value: "WANT_TO_READ" },
                  { label: "Lendo", value: "READING" },
                  { label: "Já lidos", value: "READ" },
                ].map((category) => (
                  <TabsTrigger
                    className={`library-category-tab${submittedStatus === category.value ? " is-active" : ""}`}
                    key={category.value || "all"}
                    value={category.value}
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              </div>
            </Tabs>
          </form>

          {error && <p className="library-error" role="alert">{error}</p>}
          {loading ? (
            <div className="bookshelf bookshelf--loading" role="status" aria-label="Carregando sua biblioteca">
              <div className="bookshelf-row">
                <div className="bookshelf-books">
                  {Array.from({ length: 6 }, (_, index) => <Skeleton className="skeleton-volume" key={index} />)}
                </div>
                <div className="bookshelf-plank" aria-hidden="true"><span /></div>
              </div>
              <p className="bookshelf-hint">abrindo seus livros…</p>
            </div>
          ) : entries.length ? (
            <div className="bookshelf" aria-label="Estante da sua biblioteca">
              <span className="bookshelf-woodgrain" aria-hidden="true" />
              {groupIntoShelves(entries).map((shelf, shelfIndex) => {
                const displayCount = shelf.filter((entry) => entry.id !== draggedBookId).length;
                let displayIndex = 0;
                return (
                <section
                  className={`bookshelf-row${shelfIndex === 0 ? " bookshelf-row--display" : ""}${dragOverShelf === shelfIndex ? " is-drop-target" : ""}${displayCount === 0 ? " is-empty-destination" : ""}`}
                  key={`shelf-${shelfIndex}`}
                  aria-label={`Prateleira ${shelfIndex + 1}`}
                  data-shelf-index={shelfIndex}
                >
                  <div className={`bookshelf-books${displayCount === 0 ? " bookshelf-books--empty" : ""}`}>
                    {displayCount === 0 && <span className="bookshelf-drop-label">Arraste um livro para esta prateleira</span>}
                    {dragOverShelf === shelfIndex && dragOverPosition === 0 && displayCount === 0 && <span className="bookshelf-insertion-marker" aria-hidden="true" />}
                    {shelf.map((entry, bookIndex) => {
                      const isDraggedSource = entry.id === draggedBookId;
                      const logicalIndex = isDraggedSource ? -1 : displayIndex++;
                      const palette = ["#784638", "#455c4c", "#a07645", "#584653", "#384e63", "#8a654b"];
                      const color = palette[(shelfIndex * 3 + bookIndex) % palette.length];
                      const emblem = spineEmblem(entry.book.title);
                      const height = 166 + ((shelfIndex * 7 + bookIndex * 13) % 5) * 9;
                      const isPulled = pulledBookId === entry.id;
                      const isMoving = movingBookId === entry.id;
                      const isDragging = draggedBookId === entry.id;
                      return (
                        <div
                          className={`shelf-book-slot${isMoving ? " is-moving" : ""}${isDraggedSource ? " is-drag-source" : ""}${dragOverShelf === shelfIndex && dragOverPosition === logicalIndex ? " is-insertion-target" : ""}${dragSwapTargetId === entry.id ? " is-swap-target" : ""}`}
                          key={entry.id}
                          data-entry-id={entry.id}
                        >
                          <button
                            className={`shelf-volume${isPulled ? " is-pulled" : ""}${isPulled && !openedEntry ? " is-opening" : ""}${isDragging ? " is-dragging" : ""}`}
                            type="button"
                            disabled={isMoving}
                            aria-haspopup="dialog"
                            aria-label={`Abrir ${entry.book.title}, de ${entry.book.author}. Arraste sobre o centro de outro livro para trocar de lugar, ou pela lateral para inserir ao lado. ${statusLabel(entry.status)}.`}
                            title={`${entry.book.title} — ${entry.book.author}. Centro: trocar de lugar; lateral: inserir ao lado.`}
                            style={{ "--spine-color": color, "--book-height": `${height}px`, "--book-index": bookIndex }}
                            onPointerDown={(event) => beginBookDrag(event, entry, color, height)}
                            onPointerMove={updateBookDrag}
                            onPointerUp={finishBookDrag}
                            onPointerCancel={cancelBookDrag}
                            onClick={(event) => openBookUnlessDragged(event, entry)}
                          >
                            <span className="shelf-volume__top" aria-hidden="true" />
                            <span className="shelf-volume__ornament" aria-hidden="true">{emblem}</span>
                            <span className="shelf-volume__title">{entry.book.title}</span>
                            <span className="shelf-volume__author">{entry.book.author}</span>
                            <span className="shelf-volume__bottom" aria-hidden="true">{entry.status === "READ" ? "✓" : entry.status === "READING" ? "◒" : "✦"}</span>
                          </button>
                        </div>
                      );
                    })}
                    {dragOverShelf === shelfIndex && dragOverPosition === displayCount && displayCount > 0 && <span className="bookshelf-insertion-marker" aria-hidden="true" />}
                  </div>
                  {shelfIndex === 0 && <div className="shelf-display-props" aria-hidden="true">
                    <span className="shelf-spotlight shelf-spotlight--left"><i /></span>
                    <span className="shelf-spotlight shelf-spotlight--right"><i /></span>
                    <span className="shelf-lamp"><i /></span>
                    <svg className="shelf-globe" viewBox="0 0 100 146" fill="none">
                      <defs>
                        <radialGradient id="globe-ocean" cx="35%" cy="28%" r="78%"><stop stopColor="#78918a"/><stop offset=".58" stopColor="#405b55"/><stop offset="1" stopColor="#243c38"/></radialGradient>
                        <linearGradient id="globe-brass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e2c27f"/><stop offset=".45" stopColor="#9f753d"/><stop offset="1" stopColor="#604326"/></linearGradient>
                        <clipPath id="globe-map-clip"><circle cx="50" cy="47" r="34"/></clipPath>
                      </defs>
                      <ellipse cx="51" cy="132" rx="26" ry="4" fill="#140d08" opacity=".32"/>
                      <path d="M50 6C30 7 15 24 15 46s15 40 35 41 35-19 35-41S70 7 50 6Z" stroke="url(#globe-brass)" strokeWidth="3"/>
                      <circle cx="50" cy="47" r="34" fill="url(#globe-ocean)" stroke="#d4b16e" strokeWidth="2.5"/>
                      <g clipPath="url(#globe-map-clip)" fill="#c7ad76" stroke="#e2cc96" strokeWidth=".75">
                        <path d="m23 24 7-5 7 2 4 5-3 5 4 4-3 5-5 1-3 7-5-2-2-8-5-4 3-6-3-4Z"/>
                        <path d="m39 48 6 2 4 8-2 9-5 12-4-4 1-8-4-7 2-6-2-3Z"/>
                        <path d="m50 24 6-4 7 2 3 5-5 3-2 6-7-1-4-5 2-6Z"/>
                        <path d="m54 38 8-4 7 3 4 9-5 7-4 10-6 3-4-7 2-8-5-4 3-9Z"/>
                        <path d="m72 62 7-2 4 5-4 6-8-2-3-4 4-3Z"/>
                      </g>
                      <g clipPath="url(#globe-map-clip)" stroke="#ead49f" strokeWidth=".8" opacity=".48">
                        <path d="M16 35c20 8 48 8 68 0M16 58c20-8 48-8 68 0M50 13c-11 11-16 22-16 34s5 24 16 34M50 13c11 11 16 22 16 34s-5 24-16 34"/>
                        <path d="M15 47h70" strokeWidth="1.1"/>
                      </g>
                      <path d="M26 22c8-9 19-13 29-12" stroke="#fff0bf" strokeWidth="2" strokeLinecap="round" opacity=".6"/>
                      <circle cx="50" cy="47" r="36.5" stroke="url(#globe-brass)" strokeWidth="1.5"/>
                      <path d="M50 83v8m-8 0h16l5 23H37l5-23Zm3 23h10l5 16H41l4-16Zm-13 18h30l6 5H30l6-5Z" stroke="url(#globe-brass)" strokeWidth="3" strokeLinejoin="round"/>
                      <circle cx="50" cy="91" r="3" fill="#d8bb79"/>
                    </svg>
                  </div>}
                  <div className="bookshelf-plank" aria-hidden="true"><span /></div>
                </section>
              ); })}
              {draggedBookId !== null && dragPosition && bookDragRef.current && (
                createPortal(
                  <div
                    className="shelf-volume shelf-drag-preview"
                    aria-hidden="true"
                    style={{
                      left: dragPosition.x,
                      top: dragPosition.y,
                      "--spine-color": bookDragRef.current.color,
                      "--book-height": `${bookDragRef.current.height}px`,
                      "--book-index": 0,
                    }}
                  >
                    <span className="shelf-volume__top" />
                    <span className="shelf-volume__ornament">{spineEmblem(bookDragRef.current.entry.book.title)}</span>
                    <span className="shelf-volume__title">{bookDragRef.current.entry.book.title}</span>
                    <span className="shelf-volume__author">{bookDragRef.current.entry.book.author}</span>
                    <span className="shelf-volume__bottom">{bookDragRef.current.entry.status === "READ" ? "✓" : bookDragRef.current.entry.status === "READING" ? "◒" : "✦"}</span>
                  </div>,
                  document.body,
                )
              )}
              <p className="bookshelf-hint" aria-live="polite">
                {draggedBookId ? dragSwapTargetId ? "Solte sobre o livro destacado para trocar os dois de lugar." : "Solte entre dois livros, pela lateral de uma lombada ou no fim da prateleira para inserir." : pulledBookId ? openedEntry ? "Livro aberto para você consultar os detalhes." : "Retirando um livro da estante…" : "Arraste sobre o centro de outro livro para trocar de lugar; use as laterais ou os espaços para inserir."}
              </p>
            </div>
          ) : (
            <div className="library-empty-state" aria-live="polite">
              <p className="library-empty-state__ornament" aria-hidden="true">✦</p>
              <h2>{submittedSearch || submittedGenre || submittedStatus ? "Nenhum livro corresponde aos filtros." : "Sua estante ainda está vazia."}</h2>
              <p>{submittedSearch || submittedGenre || submittedStatus ? "Tente outra busca ou remova algum filtro." : "Os livros que você adicionar aparecerão aqui."}</p>
              {!submittedSearch && !submittedGenre && !submittedStatus && <button className="library-empty-state__action" type="button" onClick={() => setActiveView("explore")}>explorar catálogo</button>}
            </div>
          )}

          {(hasNext || hasPrevious) && (
            <Pagination className="pagination-controls" aria-label="Páginas da biblioteca">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious disabled={!hasPrevious || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink active aria-label={"Página " + page} disabled>{page}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
            </div>

            <aside className="library-overview" aria-label="Resumo da biblioteca">
              <button className="library-primary-button library-add-book" type="button" onClick={() => setActiveView("explore")}>
                <span aria-hidden="true">＋</span> Adicionar livro
              </button>
              <section className="library-overview-card" aria-labelledby="library-overview-progress-title">
                <div className="library-overview-card__heading">
                  <span className="library-overview-card__icon" aria-hidden="true">▥</span>
                  <h2 id="library-overview-progress-title">Seu progresso</h2>
                </div>
                <div className="library-overview-progress">
                  <div className="library-overview-progress__ring" style={{ "--progress": `${collectionProgress}%` }} aria-label={`${collectionProgress}% dos livros desta seleção concluídos`}>
                    <span>{collectionProgress}%</span>
                  </div>
                  <p><strong>{readEntries.length} de {entries.length} livros lidos</strong><span>da seleção exibida</span></p>
                </div>
                <ul className="library-overview-list">
                  <li><span><i aria-hidden="true">▤</i>Lendo agora</span><strong>{readingEntries.length}</strong></li>
                  <li><span><i aria-hidden="true">✓</i>Concluídos</span><strong>{readEntries.length}</strong></li>
                  <li><span><i aria-hidden="true">♧</i>Na lista de desejos</span><strong>{wishEntries.length}</strong></li>
                </ul>
              </section>

              <section className="library-overview-card library-current-reading" aria-labelledby="library-current-reading-title">
                <div className="library-overview-card__heading">
                  <span className="library-overview-card__icon" aria-hidden="true">▧</span>
                  <h2 id="library-current-reading-title">Leitura atual</h2>
                </div>
                {currentReading ? (
                  <>
                    <div className="library-current-reading__feature">
                    <button className="library-current-reading__book" type="button" onClick={() => openBook(currentReading)} aria-label={`Abrir detalhes de ${currentReading.book.title}`}>
                      {currentReading.book.cover_url
                        ? <img src={currentReading.book.cover_url} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
                        : <span className="library-current-reading__cover-fallback" aria-hidden="true">{currentReading.book.title.slice(0, 1)}</span>}
                    </button>
                    <div className="library-current-reading__details">
                      <button className="library-current-reading__meta" type="button" onClick={() => openBook(currentReading)}>
                        <strong>{currentReading.book.title}</strong><small>{currentReading.book.author}</small>
                      </button>
                    <div className="library-current-reading__progress" role="progressbar" aria-label={`Progresso em ${currentReading.book.title}`} aria-valuemin="0" aria-valuemax={currentReadingTotal || 100} aria-valuenow={currentReadingTotal ? currentReadingPages : currentReadingPercent}>
                      <span style={{ width: `${currentReadingPercent}%` }} />
                    </div>
                    <p className="library-current-reading__pages">{currentReadingTotal ? `Páginas: ${currentReadingPages} / ${currentReadingTotal}` : `${currentReadingPercent}% concluído` }<strong>{currentReadingPercent}%</strong></p>
                    </div>
                    </div>
                    <button className="library-current-reading__continue" type="button" onClick={() => openBook(currentReading)}>Continuar leitura <span aria-hidden="true">→</span></button>
                  </>
                ) : (
                  <p className="library-current-reading__empty">Nenhuma leitura em andamento. Abra um livro e marque como “Lendo” para acompanhá-lo aqui.</p>
                )}
              </section>
            </aside>
          </div>
        </section>
      )}
      {openedEntry && <BookDetailDialog
        entry={openedEntry}
        isClosing={isClosingBook}
        accessToken={accessToken}
        onToken={setAccessToken}
        onClose={closeBook}
        onEntryUpdated={(updated) => {
          setEntries((current) => current.map((item) => item.id === updated.id ? updated : item));
          setOpenedEntry(updated);
        }}
      />}
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
