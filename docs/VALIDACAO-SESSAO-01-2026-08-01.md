# Validação — Sessão 1 · 01/08/2026

Escopo: fechar para validação as tarefas de arquitetura, múltiplas páginas e
navegação, e transposição da referência Figma/Fluxograma. Este arquivo é um
registro de aceite; não substitui uma decisão de produto pelo CEO.

## Evidências técnicas

| Item | Evidência verificada | Situação |
| --- | --- | --- |
| Banco e migrations | 13 migrations aplicadas; Postgres local disponível na porta 5436 | OK técnico |
| Qualidade do app | `npm run typecheck`, `npm run lint` e `npm run build` concluíram sem erro em 01/08 | OK técnico |
| Rotas | `/`, `/p/obra`, `/p/motor` e `/p/onboarding` responderam HTTP 200 no servidor local `:3970` | OK técnico |
| Árvore de páginas | `O Método 10k`, `A Obra`, `O Motor de Tijolos` e `Onboarding` persistidos em Postgres | OK técnico |
| Navegação e escrita | sidebar usa `/p/:id`; Server Actions criam, renomeiam, duplicam e excluem páginas, invalidando a árvore | OK por inspeção + build |
| Fluxograma Onboarding | página `onboarding` contém 178 nós e 75 conexões no banco | OK de carga |

Não criei uma página de teste nem executei exclusão no banco compartilhado: essas
operações alterariam o mapa de todos. O roteiro manual abaixo cobre esse aceite.

## Gate do CEO — arquitetura

O Blueprint contém uma recomendação, mas não um aceite registrado. Antes de
considerar as três tarefas dependentes concluídas, o CEO precisa registrar uma
resposta explícita para estas decisões:

| Decisão | Recomendação atual | Aceite necessário |
| --- | --- | --- |
| Pilares | Uma única página **A Obra**, com os quatro pilares como andares; vistas para cada pilar | Aprovar ou pedir quatro páginas |
| Pilar 04 | Cobertura/laje (Ambiente) | Confirmar cobertura ou trocar para fundação |
| Flywheel | Vista/ciclo da mesma lista, não conteúdo independente | Confirmar vista ou manter página `O Motor de Tijolos` |

Há uma divergência que precisa ser decidida, não escondida: a recomendação diz
que Flywheel é uma vista, enquanto o banco já contém a página `O Motor de
Tijolos`. Não alterar estrutura ou conteúdo até o aceite.

## Roteiro de aceite manual — navegação

Executar em `http://localhost:3970` com o Docker local ligado:

1. Abrir cada página da sidebar e confirmar URL, título e estado ativo.
2. Testar busca por `obra`, recolher/abrir pasta e, em tela estreita, abrir e
   fechar a gaveta pelo botão do topo.
3. Em uma pasta de teste, criar página, renomeá-la, duplicá-la e recarregar a
   página. Confirmar que as duas existem e o nome permanece.
4. Excluir **somente a cópia de teste** pela confirmação de dois toques e
   confirmar que a árvore volta ao estado original após recarregar.
5. Registrar captura de desktop e mobile. A ação de exclusão só passa se não
   atingir uma página real.

Critério de validação: todos os passos acima funcionam sem console/erro visual e
a árvore volta exatamente a quatro páginas de produto.

## Roteiro de aceite — Figma/Fluxograma

Fonte acessada: FigJam oficial `hMZj1iR2BaRAcbvB4lB0T4`, nó raiz `0:1`.
Ela contém muito mais que o Onboarding; portanto, o aceite não é por contagem
total da raiz, mas pelo trecho transplantado para a página Onboarding.

1. Abrir o trecho de Onboarding no FigJam e a página `/p/onboarding` lado a
   lado.
2. Conferir começo, decisões, rótulos de setas, ramificações e fim do fluxo.
3. Em zoom de leitura, verificar conectores sem cruzamento/recorte e texto
   legível; em zoom geral, verificar que a sequência continua compreensível.
4. Confirmar a lista de exceções intencionais (nós adicionais ou omitidos) com
   o responsável pelo fluxo, anexando as duas capturas.

O conector Figma não devolveu contexto selecionável para o arquivo de design
`dy5OTiV0GoLWQUJsAVF5lt` no nó `0:1` (retorno: “nothing selected”). Assim, não
há evidência automática confiável de fidelidade visual daquele arquivo. O aceite
visual precisa ser humano, com screenshots do FigJam e do app.

## Resultado da Sessão 1

- Pronto para validação técnica: arquitetura documentada, navegação compilada e
  fluxo carregado no banco.
- Pendente de validação: três decisões explícitas do CEO e as duas verificações
  manuais (navegação e comparação visual do FigJam).
- Não pronto para commit/PR isolado: o worktree tem alterações pré-existentes em
  diversas tarefas. Separar o escopo antes de versionar evita publicar trabalho
  não revisado junto.
