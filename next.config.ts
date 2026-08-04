import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Dois alvos, um código-fonte
// ---------------------------------------------------------------------------
//   MODO ausente  → EDITOR. Roda local (`npm run dev`), grava em `dados/`,
//                   tem Server Actions e toda a edição.
//   MODO=aluno    → PUBLICADO. HTML estático em `out/`, sem servidor, sem
//                   escrita possível. É o que vai pro ar pro aluno ler.
//
// Ver `src/lib/modo.ts` (o que some da tela) e `src/lib/acoes-vazias.ts`
// (o que some do grafo).
// ---------------------------------------------------------------------------

const modoAluno = process.env.MODO === "aluno";

const nextConfig: NextConfig = {
  // `export` assa `dados/*.json` em HTML: `lib/dados.ts` lê o disco em tempo de
  // BUILD (roda no Node do `next build`), então a página chega pronta sem
  // servidor nenhum atrás. `standalone` continua sendo o alvo do editor —
  // só pra manter o `npm run build` que os gates já usam.
  output: modoAluno ? "export" : "standalone",

  // `out/p/onboarding/index.html` em vez de `out/p/onboarding.html`: assim
  // qualquer host serve a URL `/p/onboarding/` sem depender de ele saber
  // procurar o `.html` sozinho — GitHub Pages e S3 divergem justamente nisso.
  ...(modoAluno ? { trailingSlash: true } : {}),

  // O board é conteúdo interno; embedar terceiros (Docs, ClickUp Forms) é
  // requisito do produto, então nada de X-Frame-Options aqui.
  turbopack: {
    // Pin no diretório do app. Sem isto o Turbopack infere a raiz pelo
    // lockfile mais próximo e sobe até C:\Users\elvis — a pasta-pai deste
    // repo ainda tem espaço no nome, o que piora o palpite.
    root: __dirname,

    // A TRANCA DO MODO ALUNO, e o motivo de ela morar no bundler.
    //
    // Server Action não convive com `output: "export"` — mas o problema não é
    // a ação ser CHAMADA, é ela EXISTIR no grafo: o Next varre o manifesto e
    // aborta o build se achar uma, mesmo com a UI toda escondida. E
    // `actions.ts` está importado no topo de 8 componentes de tela.
    //
    // Trocar o módulo aqui resolve na raiz: no bundle do aluno `actions.ts`
    // simplesmente não entra, então não há o que o Next encontrar — e não há
    // escrita possível, nem por caminho que a UI não mostra.
    ...(modoAluno
      ? { resolveAlias: { "@/app/actions": "./src/lib/acoes-vazias.ts" } }
      : {}),
  },
};

export default nextConfig;
