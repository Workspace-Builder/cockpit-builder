# SOP-EBU-EXT-001 — Extração de Ações de Aula para Cockpit Builder

**Versão:** 1.0
**Status:** Ativo
**Executor:** Elvis (Dev Junior)
**Aprovado por:** Lorenzi (CEO)
**Criado em:** 2026-08-03

---

## Objetivo

Extrair ações concretas de cada aula do Easy Builder usando NotebookLM, transformar em HTML de apoio e salvar na área de membros e no Google Drive.

## Resultado esperado

Cada aula processada gera:
- 1 arquivo HTML com ações organizadas por plataforma, checklists interativos e referências cruzadas
- HTML salvo no Google Drive na pasta do curso
- HTML colado na descrição da aula na área de membros
- Subtask marcada como concluída no ClickUp

## Recursos necessários

- Acesso ao Google NotebookLM (notebooklm.google.com)
- Acesso ao Claude Code / Nimbalyst com a skill `cockpit-html`
- Acesso ao Google Drive (pasta Cockpit Builder)
- Acesso ao ClickUp (workspace Digital Builder)
- Transcrições das aulas (pasta do Drive ou workspace local)

## Referências

| Artefato | Localização |
|----------|-------------|
| Prompt de extração v2 | `workspace/bus/easy-builder/cockpit-builder/prompt-notebooklm-extracao.md` |
| Template HTML | `workspace/bus/easy-builder/cockpit-builder/mockup-html-aula.html` |
| Spec completa | `workspace/bus/easy-builder/cockpit-builder/spec-skill-extracao.md` |
| Pasta Drive (HTMLs) | [Cockpit Builder - HTMLs](https://drive.google.com/open?id=1rF725Q8r2ae6J1E1ZJePGEKOHi7wfGV0&usp=drive_fs) |

---

## Passo a passo

### FASE 1 — Extrair ações no NotebookLM

**Passo 1. Abrir o NotebookLM**

Acessar notebooklm.google.com. Criar um novo notebook para a aula.

**Passo 2. Carregar APENAS a transcrição da aula**

Adicionar como fonte SOMENTE o arquivo de transcrição da aula que vai processar. Nenhum outro documento. 1 aula = 1 notebook = 1 documento.

Se a transcrição não existir ainda, solicitar ao time ou gerar via SOP de Transcrição Inteligente.

**Passo 3. Configurar resposta longa**

No NotebookLM, antes de enviar o prompt:
- Clicar no ícone de configurações do chat (engrenagem ou "Notebook guide")
- Ativar a opção de resposta longa / detalhada (se disponível)
- Se não houver opção, adicionar ao final do prompt: "Responda de forma completa e detalhada, sem resumir."

**Passo 4. Colar o prompt de extração**

Abrir o arquivo `prompt-notebooklm-extracao.md` e copiar o bloco inteiro do Prompt v2 (tudo que está dentro do bloco de código).

Colar no chat do NotebookLM e enviar.

**Passo 5. Aguardar e copiar a resposta completa**

Aguardar o NotebookLM processar. Quando a resposta estiver completa:
- Verificar se a resposta tem blocos RESULTADO com PLATAFORMA (se não tiver, o prompt não foi seguido — reenviar)
- Copiar a resposta INTEIRA (Ctrl+A no campo de resposta, Ctrl+C)

**Passo 6. Se a aula tiver mais de 1 hora**

Aulas longas precisam de rodadas:
- Rodar o prompt indicando o trecho: "Analise apenas os primeiros 60 minutos da transcrição"
- Depois: "Agora analise de 1h00 até o final"
- Copiar AMBAS as respostas para o próximo passo (a skill mescla automaticamente)

---

### FASE 2 — Gerar HTML na skill

**Passo 7. Abrir a skill no Claude Code**

No Nimbalyst ou Claude Code, invocar a skill:

```
/cockpit-html
```

**Passo 8. Enviar a resposta do NotebookLM**

Colar a resposta copiada do NotebookLM na skill. Se houver mais de uma rodada, colar todas juntas separadas por uma linha `---`.

A skill vai:
- Parsear os blocos RESULTADO
- Organizar por plataforma
- Gerar o HTML com checkboxes, sub-checklists, contexto e referências cruzadas
- Sugerir um título para a aula baseado no conteúdo

**Passo 9. Revisar o HTML gerado**

Verificar:
- [ ] O título faz sentido? Resume o que o Builder constrói na aula?
- [ ] As ações estão declarativas? (verbo + contexto + resultado)
- [ ] As plataformas estão corretas? (Instagram, Meta Ads, Site, etc.)
- [ ] Os sub-checklists estão completos?
- [ ] As referências cruzadas fazem sentido?

Se o título estiver ruim, trocar por um que resuma o que a aula constrói. Exemplos:
- "Funil de Tráfego com R$7/dia"
- "Perfil Profissional que Converte"
- "Máquina de Prospecção via WhatsApp"
- "Portfólio que Vende Sozinho"

Se alguma ação estiver vaga, reescrever para ser autossuficiente (ação + contexto + resultado no título).

---

### FASE 3 — Salvar e registrar

**Passo 10. Salvar o HTML no Google Drive**

Abrir a pasta do Drive: [Cockpit Builder - HTMLs](https://drive.google.com/open?id=1rF725Q8r2ae6J1E1ZJePGEKOHi7wfGV0&usp=drive_fs)

Criar a pasta do curso se não existir (ex: `easy-sales/`).

Salvar o arquivo com o padrão de nome:

```
{nome-do-curso}/{numero-da-aula}-{titulo-da-aula-em-slug}.html
```

Exemplos:
- `easy-sales/01-funil-de-trafego-com-7-reais-dia.html`
- `easy-sales/02-perfil-profissional-que-converte.html`
- `mentalidade-builder/01-mentalidade-de-construtor.html`

Tudo lowercase, hífens, sem acentos no nome do arquivo.

**Passo 11. Colar na descrição da aula na área de membros**

Acessar a área de membros da Easy Builder.

Na aula correspondente:
- Abrir a edição da aula
- Colar o HTML no campo de descrição (ou no bloco de HTML customizado, conforme a plataforma)
- Salvar e verificar se renderiza corretamente

**Passo 12. Marcar subtask no ClickUp**

Acessar a task pai no ClickUp (task de extração de aulas).

Encontrar a subtask da aula que acabou de processar.

Marcar como concluída e deixar um comentário:

```
Extração concluída.
HTML salvo no Drive: {link do arquivo}
HTML inserido na área de membros: {link da aula}
```

---

## Checklist de qualidade por aula

Antes de marcar como concluída, confirmar:

- [ ] NotebookLM tinha APENAS 1 documento (a transcrição)
- [ ] Resposta do NotebookLM tem blocos RESULTADO com PLATAFORMA
- [ ] HTML gerado tem contexto inicial (o que vai construir + pré-requisitos)
- [ ] Todas as ações têm título autossuficiente (ação + contexto + resultado)
- [ ] Todas as ações têm sub-checklist com passos específicos
- [ ] Título da aula resume o que o Builder constrói (não genérico)
- [ ] HTML salvo no Drive com nome correto (pasta/numero-slug.html)
- [ ] HTML colado na área de membros e renderizando
- [ ] Subtask marcada no ClickUp com links

## Erros comuns

| Erro | Solução |
|------|---------|
| NotebookLM retorna "Análise Estratégica" em vez de ações | Prompt v2 não foi colado completo. Reenviar com o bloco inteiro. |
| Ações muito vagas ("Configurar perfil") | Reescrever: "Configurar bio do Instagram com nicho + resultado + CTA e 3 destaques" |
| Plataformas misturadas no mesmo bloco | Separar manualmente antes de enviar pra skill |
| HTML não renderiza na área de membros | Verificar se a plataforma aceita HTML inline. Se não, usar iframe. |
| Título genérico ("Aula de Tráfego") | Trocar para o que a aula CONSTRÓI: "Funil de Tráfego com R$7/dia" |
| Referência cruzada sem sentido | Remover. Só manter se a aula REALMENTE menciona conteúdo de outro pilar. |

## Ordem de processamento recomendada

Processar na ordem das aulas do curso, começando pela Aula 01. Cada aula pode referenciar conceitos de aulas anteriores — processar em ordem garante que as referências cruzadas façam sentido.

---

*SOP-EBU-EXT-001 v1.0 — Extração de Ações de Aula para Cockpit Builder*
