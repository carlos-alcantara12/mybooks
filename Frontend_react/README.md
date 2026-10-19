# Frontend MyBooks

Interface MyBooks feita com React e Vite. A tela de entrada leva à área da biblioteca, onde a pessoa pode entrar ou criar uma conta, pesquisar livros do catálogo local e do Google Books e filtrar por gênero e categoria. Uma obra online só é importada para o catálogo MyBooks quando a pessoa a adiciona à própria estante ou a uma biblioteca compartilhada.

## Executar localmente

```powershell
npm install
npm run dev
```

Inicie também o backend Django em `http://127.0.0.1:8000`; o servidor de desenvolvimento do Vite encaminha as chamadas `/api/` para esse endereço. O Vite exibe no terminal o endereço local para abrir no navegador. Para gerar os arquivos de produção, execute `npm run build`.

As frases são escolhidas localmente e a última exibida fica salva no `localStorage`, evitando repetições consecutivas. A animação respeita a preferência do sistema por movimento reduzido.
