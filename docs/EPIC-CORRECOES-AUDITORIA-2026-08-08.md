# Épico — Correções da auditoria squads (2026-08-08)

## Origem

Auditoria multi-squad rodada em 2026-08-08 (branch `chore/organiza-repo`, commit
`c7ded22` + trabalho não commitado). 6 squads acharam 18 pontos; um cético releu
cada um e derrubou 3 por serem inalcançáveis no código atual (ficam registrados
no fim, "Descartado — não vira story"). Sobraram **15 achados confirmados**.
Gates nesse momento: `tsc` PASS, `eslint` PASS (1 warning não-bloqueante), `build`
PASS — ou seja, nenhum destes 15 quebra o build hoje; são bugs de comportamento
(alguns graves), não erros de compilação.

## Como usar este documento

Cada story abaixo é auto-contida: tem o sintoma, a causa raiz (mecanismo exato,
com arquivo:linha), o que fazer, e como verificar — o suficiente pra virar o
prompt de um `agent()` num squad de `Workflow` sem precisar reler a conversa que
gerou a auditoria. **Story = 1 achado = 1 unidade de trabalho.** Épicos agrupam
por tema, na mesma lógica dos squads que acharam os problemas.

Story não tem código pronto de propósito — tem a direção técnica. Quem for
implementar (agente ou humano) ainda precisa ler o arquivo real antes de mexer.

## Prioridade de execução sugerida

| Prioridade | Épico | Motivo |
|---|---|---|
| P0 | A — Segurança | Path traversal e XSS são exploráveis por qualquer um com acesso à UI, não só ao editor |
| P0 | B — Integridade de dado | Corrompe conteúdo real do curso silenciosamente, sem erro visível |
| P1 | C — Mobile | UX quebrada relatada pelo usuário; já resolvida em parte na sessão anterior, isto é o resto |
| P1 | F.1/F.2 | Duplicação que já mordeu 2x nesta sessão (mais um lugar copiaria o padrão errado) |
| P2 | D — Teclado/acessibilidade | Afeta só quem navega por teclado — real, mas de alcance menor |
| P2 | E — Performance do canvas | Sem sintoma reportado por usuário; correção barata, sem risco |
| P3 | F.3/F.4 | Limpeza — zero risco, zero urgência |

---

## Épico A — Segurança (squad sugerido: `@security`)

### A1 — Path traversal em id de página/pasta (`src/lib/dados.ts:31`)

**Severidade:** alto

**Sintoma:** uma Server Action de excluir/renomear página aceita o `id` como
string crua, sem validar formato.

**Causa raiz:** `caminho(relativo)` faz `resolve(RAIZ, relativo)` e devolve o
resultado sem checar que ele continua dentro de `dados/`. O `relativo` vem de
`arquivoDaPagina(id)` (`src/lib/queries.ts:56`), que só faz template string
(`paginas/${id}.json`) — `id` chega direto de `excluirPaginaAction`,
`renomearPaginaAction` e da rota `/p/[id]`, sem passar por nenhuma validação de
que bate com o formato `pag-xxxxxx` que `novoId()` gera. Uma chamada com
`id = "../../package"` monta `relativo = "paginas/../../package.json"`, que
`resolve()` reduz pra fora de `dados/`.

**O que fazer:** validar o formato do `id` (regex do que `novoId()` produz) no
topo de toda Server Action que recebe id de página/pasta, ANTES de montar
qualquer caminho — rejeitar cedo, não confiar em `resolve()` pra conter o dano.
Complementar (defesa em profundidade): em `caminho()`, depois do `resolve()`,
checar que o resultado começa com `RAIZ + separador` e lançar erro se não.

**Como verificar:** chamar a Server Action diretamente (não pela UI) com um id
tipo `"../../package"` ou `"../outro-projeto/segredo"` e confirmar que ela
rejeita antes de tocar no disco. Teste automatizado: um teste unitário de
`caminho()`/`arquivoDaPagina()` com entrada maliciosa esperando erro, não um
path fora de `dados/`.

---

### A2 — XSS armazenado em nó de texto do canvas (`src/components/canvas/NoDoBoard.tsx:303`)

**Severidade:** alto

**Sintoma:** nó tipo "texto" no canvas roda HTML/script arbitrário se alguém
colar isso no campo de nome do nó.

**Causa raiz:** o ramo de renderização do tipo "texto" (linha ~293-305) usa
`dangerouslySetInnerHTML={{ __html: no.html ?? no.txt }}`. `no.html` é `null`
pra esse tipo de nó, então o fallback é `no.txt` — que vem de um `<input
type="text">` comum em `BarraDeEdicao.tsx:396-411`, gravado por `textoNoAction`
(`src/app/actions.ts:262-265`) que só faz `.trim()`. Compare com o ramo `FORMAS`
(linha ~165), que renderiza o MESMO campo `no.txt` com `<span>{no.txt}</span>` —
JSX escapa automaticamente ali. Só o ramo texto usa a via perigosa, sem
necessidade aparente.

**O que fazer:** trocar `dangerouslySetInnerHTML` por `<span>{no.txt}</span>`
(ou equivalente) no ramo texto, igual ao ramo FORMAS — não precisa de
sanitizador se o campo é sempre texto puro editado por `<input>`. Se `no.html`
for uma feature real prevista pro futuro (rich text de verdade), aí sim isolar
esse caso com uma biblioteca de sanitização (ex. DOMPurify) e não misturar com
o fallback de `no.txt`.

**Como verificar:** criar um nó de texto, colar `<img src=x
onerror=alert(1)>` no nome, confirmar que aparece como texto literal na tela
(não executa). Testar também na build `npm run build:aluno` — o dado é assado
no HTML estático, então o teste vale nos dois modos.

---

### A3 — Link de entregável sem checar protocolo (`src/components/obra/Obra.tsx:967`, `src/components/canvas/GavetaDoNo.tsx:638`)

**Severidade:** médio

**Sintoma:** um campo de URL malformado pode virar `javascript:...` executável
ao clicar no link, em vez de navegar.

**Causa raiz:** `vaga.url` (Obra) e `item.url` (GavetaDoNo) vão direto pra
`href` sem checar protocolo. `salvarEntregavelAction`
(`src/app/actions.ts:373-387`) só faz `.trim()` no valor antes de gravar — não
valida `http(s)`.

**O que fazer:** validar o protocolo em UM lugar central — no schema/validação
de entrada da Server Action (`salvarEntregavelAction` e onde `GavetaDoNo`
grava seu item), rejeitando ou limpando qualquer `url` que não comece com
`http://` ou `https://`. Não faz sentido consertar só no `href` de exibição:
o dado sujo continuaria gravado em `dados/*.json` e vazando pra outros lugares
que leem o mesmo campo.

**Como verificar:** tentar salvar um entregável com
`url = "javascript:alert(document.cookie)"` pela Server Action direto; deve
ser rejeitado ou sanitizado antes de gravar. Conferir que o mesmo teste vale
pro campo equivalente da `GavetaDoNo`.

---

## Épico B — Integridade de dado (squad sugerido: `@dev` + `@data-engineer`)

### B1 — Setas de navegação sobrescrevem entregável do andar errado (`src/components/obra/Obra.tsx:990`)

**Severidade:** alto

**Sintoma:** editar um entregável, apertar ↑/↓ sem querer, e o texto digitado
é salvo no andar seguinte/anterior — não no que estava sendo editado.

**Causa raiz:** o handler global de teclado da Obra (bloco `degrau`,
L357-372) nunca checa o estado `editando` — só ignora teclado se o alvo focado
for `INPUT|TEXTAREA|SELECT`. Com o Editor de Entregáveis aberto e o foco num
`<button>` do próprio formulário (seletor de plataforma, "Cancelar"), ↑/↓ caem
nesse bloco e chamam `setSel`, trocando o andar. `ModalEditorEntregaveis` não
tem `key` no ponto de render (L520-526) e `FormularioEntregavel` usa
`key={vagaKey}` (não `key={passo.id}`) — então não remonta, e os campos
(`label`/`url`/`dentro`, estado local) continuam com o texto do andar antigo.
Ao salvar, `salvarEntregavelAction` usa o `passoId` NOVO (do prop atualizado)
com o texto ANTIGO.

**O que fazer:** duas correções, uma suficiente mas as duas são baratas:
(1) o handler de teclado de Obra deve ignorar ↑/↓ (e idealmente as demais
teclas de navegação) quando `editando` é `true`; (2) trocar a `key` de
`FormularioEntregavel` pra incluir `passo.id` (ex.: `key={\`${passo.id}:${vagaKey}\`}`),
forçando remontar o formulário — e limpar o estado — sempre que o andar
selecionado mudar, mesmo que isso não devesse acontecer com o editor aberto.
Fazer as duas é defesa em profundidade: uma corrige o gatilho, a outra torna o
sintoma impossível mesmo se outro gatilho aparecer no futuro.

**Como verificar:** abrir o editor no andar A, digitar um texto novo no
campo, tirar o foco do input (clicar num botão do próprio formulário), apertar
↑ ou ↓, salvar, e confirmar que o texto foi pro andar A (o que estava sendo
editado) — não pro andar que a seta escolheu.

---

### B2 — Reordenar/excluir checkpoint desalinha o índice ativo (`src/components/shell/Dock.tsx:82`, `src/components/shell/AppShell.tsx`)

**Severidade:** alto

**Sintoma:** depois de arrastar um checkpoint pra outra posição (ou excluir
um), "Regravar na tela de agora" pode sobrescrever o enquadramento de um
checkpoint diferente do que está selecionado na tela.

**Causa raiz:** `vista` é um índice numérico (`useState` em `AppShell.tsx`,
função `Miolo`), não um id. Reordenar via `soltarEm` (`Dock.tsx:82-91`) chama
`reordenarCheckpointsAction`, que só faz `revalidatePath('/', 'layout')` — sem
trocar de rota, então `AppShell` não remonta (mesmo `key={id}` em
`src/app/p/[id]/page.tsx:88`) e o `useState` de `vista` sobrevive intacto. O
array `pagina.vistas` chega reordenado do servidor, mas `vista` continua
apontando pro MESMO ÍNDICE, que agora é outro checkpoint. O único código que
realinha `vista` é o efeito de `?v=` na URL — que não muda nesse fluxo.

**O que fazer:** trocar a fonte da verdade de "índice" pra "id do checkpoint
selecionado". Guardar `vistaId` em vez de (ou junto com) `vista`, e depois de
qualquer mudança em `pagina.vistas` (reorder, delete), recalcular o índice
numérico procurando esse id na lista nova — se o id sumiu (checkpoint
excluído), cair num fallback sensato (índice 0, ou o mais próximo). Isso
resolve reorder e delete com a mesma mudança, porque os dois têm a mesma causa
raiz: índice como identidade.

**Como verificar:** estar no checkpoint de índice 2, arrastar o checkpoint de
índice 0 pro fim da lista, confirmar que o dock continua destacando o MESMO
checkpoint que estava selecionado antes (não o índice 2 da nova ordem), e que
"Regravar" grava no checkpoint certo.

---

### B3 — Redimensionar nó pode gravar `w`/`h` como `null` silenciosamente (`src/lib/queries.ts:673`)

**Severidade:** médio

**Sintoma:** um gesto de resize abortado ou uma chamada malformada grava
`w: null, h: null` no `canvas.json`, apesar do tipo declarado `number` — quebra
silenciosa em qualquer leitura futura desse nó.

**Causa raiz:** `tamanhoNo` não valida que `w`/`h` sejam números finitos antes
de `Math.max(40, Math.round(w))`. `Math.max`/`Math.round` com `NaN` sempre
devolvem `NaN`; `JSON.stringify` grava `NaN` como `null`. A Server Action
(`actions.ts:271`) só tipa `w`/`h` como `number` no TypeScript — isso não pega
em runtime, porque o protocolo de Server Action pode carregar `NaN` mesmo
sendo "tipado" como number.

**O que fazer:** validar `Number.isFinite(w) && Number.isFinite(h)` no início
de `tamanhoNo` (ou na Server Action, antes de chamar `tamanhoNo`) e rejeitar
silenciosamente (early return, sem gravar) ou usar um fallback explícito —
mas nunca deixar `Math.max`/`Math.round` processar um `NaN` até o JSON.

**Como verificar:** chamar `tamanhoNoAction(id, NaN, NaN)` diretamente e
confirmar que o `canvas.json` não grava `null` no lugar de um número — o nó
mantém o tamanho anterior ou a chamada é rejeitada com erro visível.

---

## Épico C — Mobile / navegação (squad sugerido: `@dev`)

### C1 — Botão voltar do navegador deixa a gaveta de páginas presa aberta (`src/stores/useUiStore.ts:28`)

**Severidade:** alto

**Sintoma:** no celular, abrir o menu de páginas (☰) e depois usar o botão
VOLTAR do navegador (em vez de tocar num link ou no X) deixa a gaveta aberta
cobrindo a página seguinte — exige um toque extra pra fechar algo que nunca
foi aberto ali.

**Causa raiz:** `gaveta` mora no Zustand (`useUiStore`, singleton fora da
árvore React) e só é resetado por cliques explícitos (link da lista, X, Esc).
Não existe nenhum listener de navegação (`popstate` ou equivalente do App
Router) que chame `setGaveta(false)`. Trocar de página via botão voltar
remonta o `AppShell` (outro `key={id}`), resetando todo `useState` local —
mas `gaveta` sobrevive porque não está na árvore.

**O que fazer:** resetar `gaveta` sempre que a rota mudar. Caminho mais
simples: em `AppShell` (ou um componente de topo que já sabe o `id` da
página), usar `usePathname()` do `next/navigation` e um `useEffect` com esse
valor na dependência chamando `setGaveta(false)` — dispara em toda navegação,
incluindo botão voltar, sem precisar de listener manual de `popstate`.

**Como verificar:** no celular (ou DevTools em modo responsivo), abrir a
gaveta, usar o botão voltar do navegador, confirmar que a página seguinte
aparece sem véu nem drawer por cima.

---

## Épico D — Teclado / acessibilidade (squad sugerido: `@ux-design-expert`)

### D1 — Esc fecha duas camadas de uma vez com o Editor de Entregáveis aberto (`src/components/obra/Obra.tsx:336`)

**Severidade:** médio

**Sintoma:** com o Editor de Entregáveis aberto, apertar Esc fecha o editor E
o painel do andar juntos — o próprio código documenta "uma camada por vez",
isso quebra a regra.

**Causa raiz:** o listener global de Obra (`window.addEventListener('keydown',
onKey)`, sem `capture`) e o listener do `ModalEditorEntregaveis`
(`window.addEventListener('keydown', onKey)`, também sem `capture` nem
`stopPropagation`) escutam Escape no mesmo alvo (`window`), em fase de bolha —
os dois disparam pro mesmo evento, na ordem de registro. `ModalAbertura.tsx`
já resolve exatamente esse problema (fase de captura + `stopPropagation`,
L66-74) — `ModalEditorEntregaveis` não replica nenhuma das duas defesas.

**O que fazer:** copiar o padrão de `ModalAbertura.tsx` pro listener de Esc do
`ModalEditorEntregaveis`: registrar em fase de captura
(`addEventListener('keydown', onKey, true)`) e chamar `e.stopPropagation()`
antes do listener de Obra rodar.

**Como verificar:** abrir o Editor de Entregáveis, focar um botão que não
seja input/textarea/select, apertar Esc uma vez, confirmar que SÓ o editor
fecha (o painel do andar continua aberto atrás).

---

### D2 — Modais sem focus trap (`src/components/obra/Obra.tsx:1002`, `ModalAbertura.tsx`)

**Severidade:** médio

**Sintoma:** navegando só por teclado, dar Tab a partir do último controle de
um modal (Editor de Entregáveis ou tela de abertura) escapa pro conteúdo por
trás do overlay — clicável mesmo com o modal aberto.

**Causa raiz:** nenhum dos dois diálogos implementa focus trap ou `inert` no
conteúdo de trás (confirmado: zero ocorrência de "inert"/"focus-trap" no
repo). Sem portal nem trap, a ordem de tabulação segue a ordem do DOM — que
não respeita z-index/overlay. No Editor de Entregáveis, Tab a partir do último
botão cai no botão "?" (HelpCircle) que vem depois no DOM; Enter nele reabre a
tela de introdução com o editor ainda aberto por trás.

**O que fazer:** implementar um focus trap simples nos dois modais — na
prática, um `useEffect` que, ao montar, foca o primeiro elemento focável do
diálogo e intercepta Tab/Shift+Tab pra ciclar só entre os elementos internos
(wrap do último pro primeiro e vice-versa), restaurando o foco anterior ao
fechar. Não precisa de biblioteca externa pra dois modais; se um terceiro
aparecer, aí sim vale extrair um hook `useFocusTrap(ref)` compartilhado.

**Como verificar:** abrir o modal, dar Tab repetidamente a partir do último
controle, confirmar que o foco volta pro primeiro controle do PRÓPRIO modal —
nunca alcança nada fora dele.

---

## Épico E — Performance do canvas (squad sugerido: `@performance`)

### E1 — `onNodesChange` perde memoização a cada frame de arrasto (`src/components/canvas/useGuias.ts:154`)

**Severidade:** médio

**Sintoma:** nenhum sintoma visível reportado (a lentidão perceptível já foi
resolvida por `onlyRenderVisibleElements`/`PortaoDeAnimacao`) — isto é
desperdício de trabalho, não travamento.

**Causa raiz:** `setGuias` (L128) grava um objeto novo (`{linhas, cotas}`) a
cada `pointermove` do arrasto, mesmo quando o conteúdo é idêntico ao quadro
anterior — diferente de `movidos`/`tamanhos`/`dimensoes`, que o mesmo arquivo
já trata comparando antes de gravar. Isso muda a referência de `guias`, que
está nas deps de `onNodesChange` (L154), recriando a função a cada frame — e
o `StoreUpdater` interno do React Flow reage a isso chamando `store.setState`
sem necessidade.

**O que fazer:** aplicar o mesmo padrão que `movidos`/`tamanhos`/`dimensoes`
já usam neste arquivo — comparar o `guias` calculado com o valor anterior
(shallow compare dos arrays `linhas`/`cotas`) e só chamar `setGuias` se
realmente mudou.

**Como verificar:** instrumentar (ou usar o profiler do React) durante um
arrasto simples sem guia de alinhamento visível, confirmar que `onNodesChange`
mantém a mesma referência entre frames.

---

### E2 — `vizinhos` recalculado sem memo em todo render com a gaveta aberta (`src/components/canvas/BoardCanvas.tsx:755`)

**Severidade:** médio

**Causa raiz:** `vizinhos={nos.filter(...)}` é montado inline no JSX — depende
só de `nos` e `noSel.id`, mas é recalculado (O(n) sobre todos os nós) em todo
re-render de `BoardCanvas` enquanto a `GavetaDoNo` está aberta, inclusive
quando o re-render foi causado por `movidos`/`dimensoes` de OUTRO nó sendo
arrastado. `GavetaDoNo` ainda mapeia esse array de novo (`outros = vizinhos.map(...)`,
~L160) pro cálculo de colisão, dobrando o desperdício.

**O que fazer:** envolver em `useMemo` com deps `[nos, noSel?.id]`.

**Como verificar:** com a gaveta de um nó aberta, arrastar outro nó qualquer;
confirmar (profiler ou log) que `vizinhos` não é recalculado a cada frame do
arrasto — só quando `nos` ou `noSel.id` de fato mudam.

---

## Épico F — Dívida técnica / limpeza (squad sugerido: `@dev`)

### F1 — Quatro setters de nó duplicam o mesmo padrão de gravação (`src/lib/queries.ts:439,664,673,862`)

**Severidade:** alto (risco), esforço baixo

**Causa raiz:** `estiloNo`, `textoNo`, `tamanhoNo`, `camadaNo` repetem
literalmente o bloco: achar página do nó → `if (!achado) return` → mapear
substituindo o nó por id → `gravarCanvas`. Um quinto setter copiado desse
molde que esqueça o `gravarCanvas` final falha silenciosamente — o estado
muda na tela mas não sobrevive ao F5.

**O que fazer:** extrair um helper privado, algo como
`patchNo(id, patch: Partial<NoBoard>)`, que faz achar → mapear → gravar uma
vez só, e reescrever os quatro setters como chamadas de uma linha pra ele.

**Como verificar:** os quatro comportamentos continuam idênticos (teste
manual ou automatizado de cada um), e o `grep` por "gravarCanvas" em
`queries.ts` cai de 4+ ocorrências duplicadas pra 1 dentro do helper.

---

### F2 — Persistência em localStorage duplicada entre Obra e ModalAbertura (`src/components/obra/Obra.tsx:57`, `ModalAbertura.tsx:22-61`)

**Severidade:** alto (risco), esforço baixo

**Causa raiz:** o mesmo desenho (cache de módulo + `Set<() => void>` de
ouvintes + contrato `useSyncExternalStore` + try/catch de leitura/escrita) foi
implementado do zero em `Obra.tsx` pra `feitos`, reproduzindo o que já existe
em `ModalAbertura.tsx` pra `jaViuAbertura` — o próprio comentário em
`Obra.tsx:51` já reconhece isso como cópia consciente. Único detalhe real
diferente: `feitos` é objeto (precisa de cache de referência pro
`getSnapshot`), `jaViuAbertura` é booleano primitivo (não precisa).

**O que fazer:** extrair uma fábrica genérica, algo como
`criarPersistenciaLocal<T>(chave: string, valorPadrao: T)`, que devolve
`{ ler, escrever, assinar }` — cobrindo os dois casos (primitivo e objeto,
com cache de referência sempre presente, que é inofensivo mesmo pra
primitivo). Migrar `Obra.tsx` e `ModalAbertura.tsx` pra usá-la, e deixar
documentado que o PRÓXIMO estado "sobrevive ao F5 sem banco" usa essa fábrica
em vez de copiar um dos dois blocos de novo.

**Como verificar:** os dois comportamentos (checklist de andares, "já viu a
abertura") continuam idênticos depois da migração; um novo uso da fábrica
(pode ser um teste, não precisa ser feature real) prova que ela cobre os dois
casos.

---

### F3 — Histórico de páginas excluídas nunca é limpo (`src/lib/dados.ts:82`)

**Severidade:** médio, esforço baixo

**Causa raiz:** `remover()` apaga só o arquivo principal.
`excluirPagina`/`excluirPasta` (`queries.ts:398-414`) chamam `remover(arquivoDaPagina(...))`
mas nunca tocam em `dados/.historico/<chave>/` — essa pasta de snapshots fica
órfã pra sempre. O teto de 30 (`historico.ts`) só limita o histórico de um
arquivo que AINDA EXISTE, não o total acumulado do que já foi excluído.

**O que fazer:** em `remover()` (ou logo depois, no ponto de chamada de
`excluirPagina`/`excluirPasta`), apagar também a pasta de histórico
correspondente (`dados/.historico/<chave>/`, recursivo) quando o arquivo
principal for removido.

**Como verificar:** criar uma página, editar algumas vezes (gera snapshots em
`.historico/`), excluir a página, confirmar que a pasta de histórico
correspondente também sumiu do disco.

---

### F4 — `passosDesfazer` é código morto (`src/lib/queries.ts:659`)

**Severidade:** baixo, esforço trivial

**Causa raiz:** exportada de `queries.ts`, mas nenhum outro arquivo em `src/`
importa `passosDesfazer` — confirmado por busca completa no código.

**O que fazer:** remover a função (ou, se a intenção "quantos Ctrl+Z ainda
cabem" for um recurso real planejado, conectar a alguma tela — mas
recomendação é remover, já que não há indício de uso planejado documentado em
lugar nenhum).

**Como verificar:** `tsc`/`eslint`/`build` continuam passando depois de
remover; nenhuma tela perde funcionalidade.

---

## Descartado — não vira story

Achados que o cético derrubou na verificação — ficam registrados pra não
serem re-descobertos numa próxima auditoria:

- **Obra.tsx:357 — crash de ArrowUp/Down com lista de andares vazia.**
  Inalcançável: `PASSOS` (`src/lib/passos.ts`) é constante fixa com 9/11/8/8
  passos por pilar; não existe fluxo (dados ou UI) que produza pilar sem
  nenhum andar.
- **BarraLateral.tsx:83 — botão "Criar página" mudo com árvore vazia.**
  Inalcançável: `excluirPastaAction` sempre faz `redirect()` pra `/` ou pra
  outra página existente; `BarraLateral` só monta dentro de uma árvore que já
  contém a página aberta, então `arvore` nunca chega vazia nesse ponto.
- **BoardCanvas.tsx:206 — `arrumar()` duplica `caixaDe()` sem fallback de
  `n.width`.** O cenário de quebra descrito está factualmente errado pro caso
  "alinhar à esquerda" (não usa largura nesse eixo) e implausível pros
  outros eixos (exigiria clicar "alinhar" numa janela de ~1 frame antes do
  React Flow medir um nó recém-criado). Duplicação de código existe, mas sem
  bug reproduzível associado — vira nota de estilo, não story.
