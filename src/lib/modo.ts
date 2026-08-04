// ---------------------------------------------------------------------------
// Em que modo este build está rodando
// ---------------------------------------------------------------------------
// Dois alvos saem do MESMO código-fonte:
//
//   editor (padrão)  `npm run dev` · `npm run build`
//                    Roda local, grava em `dados/`, tem toda a edição.
//
//   aluno            `npm run build:aluno`
//                    HTML estático, sem servidor e sem escrita. É o que vai
//                    pro ar pro aluno ler.
//
// `NEXT_PUBLIC_` no nome não é enfeite: sem esse prefixo o valor não atravessa
// pro bundle do cliente, e é justamente no cliente que a UI de edição precisa
// sumir.
//
// A comparação é com a string literal pra o bundler poder decidir isto em
// tempo de build e PODAR os ramos mortos — `{PODE_EDITAR && <BarraDeEdicao/>}`
// deixa de existir no bundle do aluno em vez de ir junto e nunca renderizar.
//
// Isto é a SEGUNDA camada, não a primeira. A que garante de verdade é o
// `resolveAlias` do next.config.ts, que troca `actions.ts` por `acoes-vazias.ts`:
// mesmo que um gate escape aqui, não existe escrita do outro lado. Esta camada
// existe pra o aluno não ver botão morto — não é a tranca, é o acabamento.
// ---------------------------------------------------------------------------

export const PODE_EDITAR = process.env.NEXT_PUBLIC_MODO !== "aluno";
