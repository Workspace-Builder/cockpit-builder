# Convenções — Cockpit Builder

Onde cada coisa mora, e as regras que evitam retrabalho.

---

## Idioma

**Código em português.** Tipos, variáveis, funções, props e comentários. O
domínio é português (pilar, passo, obra, trilho, vaga) e traduzir metade cria
duas gramáticas no mesmo arquivo. Exceção: o que a plataforma impõe
(`params`, `children`, `default export`).

## Onde cada coisa entra

| você quer | mexe em |
|---|---|
| mudar o formato de um arquivo em `dados/` | `src/lib/queries.ts` + `src/lib/dados.ts` |
| mudar a árvore inicial | `dados/arvore.json` (ou pela interface, que é o normal) |
| escrever ou ler os dados | `src/lib/queries.ts` — **o único lugar que toca `dados/`** |
| expor uma escrita pra interface | `src/app/actions.ts` |
| mudar o formato de uma página, passo ou vista | `src/lib/model.ts` |
| conteúdo dos 36 passos | `src/lib/passos.ts` — **e só ali** |
| layout das três colunas | `src/components/shell/` |
| a área central da página | `src/components/palco/` |
| token de cor, fonte, largura de painel | `src/app/globals.css` |
| wireframe / print de tela | `docs/wireframes/` |
| protótipo em HTML puro, antes de virar componente | `mockups/` |

## O mapa da raiz

A raiz tem dois projetos convivendo, e isso é proposital enquanto durar a
transição (AGENTS.md):

```
index.html · CNAME · *.mp4 · assets/ · plano-4-pilares.html   ← o board LEGADO
src/ · dados/ · scripts/ · public/ · docs/ · mockups/          ← o app NOVO
```

O legado precisa ficar **na raiz**: é de lá que o GitHub Pages serve
`cockpit.easybuilder.com.br`. Mover para uma subpasta tira o board do ar antes
de o Railway assumir.

**Por que `assets/` e `public/assets/` têm os mesmos arquivos:** não é
descuido. O legado monta caminho relativo (`assets/onboarding/…`) e o Next serve
de `/assets/…`, que resolve para `public/`. Enquanto os dois estiverem vivos,
os dois precisam do arquivo. Some com a duplicação no dia em que o `index.html`
sair — não antes, senão o board no ar perde os prints.

## Regras

**1. Uma lista, N vistas.** Conteúdo mora em `passos.ts`. Obra, Trilho, vista
8020 e checklist são filtros. Página com cópia própria dos passos é bug de
arquitetura, não atalho.

**2. Não tem semente separada da verdade.** `dados/arvore.json` já É o estado
atual, direto — sem passo de migration nem seed pra reconciliar. Editar pela
interface ou editar o JSON na mão dão no mesmo resultado; commitar é publicar.

**3. Store guarda preferência, não dado.** `useUiStore` tem só busca e pasta
fechada. Se a informação interessa a outra pessoa, ela é dado e vai pra
`dados/`; se é de quem está olhando, fica no store.

**4. Nada de `setState` dentro de `useEffect`.** O lint da casa barra (regra
`react-hooks/set-state-in-effect`). Se apareceu a vontade, quase sempre o
estado deveria ser derivado, ou vir da URL.

**5. Estado de tela morre na troca de página.** Vista e item selecionado são
`useState` no `AppShell`, que é remontado pelo `key={id}` da rota. Não promova
pro store "por via das dúvidas" — vira estado que ninguém lembra de limpar.

**6. Derivação não é seletor de hook.** Função que monta array novo a cada
chamada, passada direto pra `useAlgumStore(...)`, trava a aba com loop de
render. Sempre dentro de `useMemo`.

**7. Escrita passa por Server Action.** Componente cliente não chama `queries.ts`
direto — `dados.ts` e `queries.ts` são `server-only` e o build quebra se tentar.

**8. Tracejado significa espaço reservado.** É a convenção visual do board
(BLUEPRINT.md §3) e do wireframe: contorno tracejado = ainda não existe.
Vaga vazia aparece tracejada em vez de sumir, pra o mapa mostrar o próprio buraco.

## Estilo

- Tailwind direto no JSX; token de cor só via as variáveis de `globals.css`
- `clsx` para classe condicional
- ícone: `lucide-react`
- comentário explica **por quê**, não o quê — se o código precisa de comentário
  pra dizer o que faz, o problema é o código

## Nomes

- componente: `PascalCase.tsx`
- store: `useAlgumaCoisaStore.ts`
- id gerado: prefixo curto + sufixo aleatório (`pag-8f3k21`) — aparece na URL,
  então tem que caber num link mandado no WhatsApp
