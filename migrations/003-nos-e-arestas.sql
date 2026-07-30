-- Cockpit Builder — Migration 003: nós e conectores
--
-- É o que o board legado nunca teve. Lá o nó nascia de
-- `makeNode(titulo, elementoDOM, x, y)` e o que persistia era `el.outerHTML` —
-- então cor, texto e tipo eram marcação, não propriedade, e não dava pra
-- mudar nada sem parsear HTML salvo (BLUEPRINT.md §9).
--
-- SOBRE A COLUNA `html`: ela existe e não contradiz o parágrafo acima. O que
-- era doença no legado é a POSIÇÃO e o TIPO morarem dentro da marcação; aqui
-- os dois são coluna. `html` guarda só o corpo de texto rico dos 40 nós do
-- Método (títulos, listas, ênfases) — o mesmo papel que um campo de conteúdo
-- tem em qualquer CMS. Nó de fluxograma não usa: usa `txt`.

-- ── NÓ ──
CREATE TABLE IF NOT EXISTS cockpit.no (
  id            text PRIMARY KEY,
  pagina_id     text NOT NULL REFERENCES cockpit.pagina(id) ON DELETE CASCADE,

  -- Vocabulário do fluxograma (BLUEPRINT.md §3) + os tipos de mídia do Método:
  -- term act doc reg in dec db copy lane · texto shot iframe video anim
  tipo          text NOT NULL,

  x             integer NOT NULL,
  y             integer NOT NULL,
  w             integer,
  h             integer,
  -- Camada. O legado usava `zIndex = ++zTop` e nunca persistia o contador,
  -- então a ordem de sobreposição se perdia a cada recarga.
  z             integer,

  txt           text,   -- rótulo curto (nós de fluxograma)
  html          text,   -- corpo rico (ver nota acima)
  url           text,   -- destino do clique
  img           text,   -- print, relativo a /public
  -- Nome do componente React pros 7 nós animados (timeline + 6 esquetes).
  -- Eles não são forma de fluxograma: são `<canvas>` com draw(t) em rAF.
  comp          text,

  criado_em     timestamptz NOT NULL DEFAULT NOW(),
  atualizado_em timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_no_pagina ON cockpit.no (pagina_id);

DROP TRIGGER IF EXISTS trg_no_atualizado_em ON cockpit.no;
CREATE TRIGGER trg_no_atualizado_em
  BEFORE UPDATE ON cockpit.no
  FOR EACH ROW EXECUTE FUNCTION cockpit.fn_atualizada_em();

-- ── ARESTA ──
-- `lado_de`/`lado_para` são as âncoras (t/b/l/r). O legado já decidia por lado
-- em vários conectores pra a linha não deitar sobre outra — jogar fora faria o
-- desenho mudar de cara.
CREATE TABLE IF NOT EXISTS cockpit.aresta (
  id         bigserial PRIMARY KEY,
  pagina_id  text NOT NULL REFERENCES cockpit.pagina(id) ON DELETE CASCADE,
  de         text NOT NULL REFERENCES cockpit.no(id) ON DELETE CASCADE,
  para       text NOT NULL REFERENCES cockpit.no(id) ON DELETE CASCADE,
  lado_de    text,
  lado_para  text,
  tracejada  boolean NOT NULL DEFAULT false,  -- fluxo secundário / retorno
  falha      boolean NOT NULL DEFAULT false,  -- caminho de reprovação (vermelho)
  rotulo     text
);

CREATE INDEX IF NOT EXISTS idx_aresta_pagina ON cockpit.aresta (pagina_id);
