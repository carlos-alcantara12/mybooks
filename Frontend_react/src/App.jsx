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

function LibraryLanding({ onReturn }) {
  return (
    <main className="library-landing">
      <header className="library-header">
        <a className="library-wordmark" href="#inicio" onClick={(event) => { event.preventDefault(); onReturn(); }}>
          MyBooks<span aria-hidden="true">.</span>
        </a>
        <span className="library-header__label">sua biblioteca</span>
      </header>
      <section className="library-welcome" aria-labelledby="library-title">
        <p className="library-kicker">bem-vindo à sua coleção</p>
        <h1 id="library-title">Toda grande leitura<br />merece um lugar.</h1>
        <p className="library-description">
          Este espaço será sua biblioteca pessoal: livros, progresso e histórias que ficam com você.
        </p>
        <div className="empty-shelf" aria-label="Estante vazia">
          <div className="empty-shelf__books" aria-hidden="true">
            <span className="shelf-book shelf-book--one" />
            <span className="shelf-book shelf-book--two" />
            <span className="shelf-book shelf-book--three" />
            <span className="shelf-book shelf-book--four" />
          </div>
          <div className="empty-shelf__wood" />
          <p>Sua estante começa com a próxima história.</p>
        </div>
        <button className="back-to-welcome" type="button" onClick={onReturn}>
          voltar à abertura
        </button>
      </section>
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
