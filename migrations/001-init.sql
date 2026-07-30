-- Cockpit Builder — Migration 001: a árvore de páginas
--
-- Sai do localStorage e vira dado compartilhado. Era a decisão que definia o
-- tamanho do projeto (BLUEPRINT.md §10.2): com localStorage cada pessoa abria
-- e via a própria árvore, e link de página criada aqui não abria na máquina do
-- outro.
--
-- Escopo desta migration: SÓ a árvore. Passos, nós e conectores entram depois,
-- em migration própria, quando as Decisões 1-4 saírem do gate. Modelar tabela
-- pra dado que ainda não tem forma definida é chute que vira ALTER TABLE.

CREATE SCHEMA IF NOT EXISTS cockpit;

-- Trigger de atualização, inline (sem depender de schema compartilhado)
CREATE OR REPLACE FUNCTION cockpit.fn_atualizada_em()
RETURNS TRIGGER AS $$
BEGIN NEW.atualizada_em = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── PASTA ──
-- id é `text`, não uuid: ele aparece na URL (`/p/pag-8f3k21`) e precisa caber
-- num link mandado no WhatsApp sem virar uma linha inteira.
CREATE TABLE IF NOT EXISTS cockpit.pasta (
  id            text PRIMARY KEY,
  nome          text NOT NULL,
  ordem         integer NOT NULL DEFAULT 0,
  criada_em     timestamptz NOT NULL DEFAULT NOW(),
  atualizada_em timestamptz NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_pasta_atualizada_em ON cockpit.pasta;
CREATE TRIGGER trg_pasta_atualizada_em
  BEFORE UPDATE ON cockpit.pasta
  FOR EACH ROW EXECUTE FUNCTION cockpit.fn_atualizada_em();

-- ── PÁGINA ──
CREATE TABLE IF NOT EXISTS cockpit.pagina (
  id            text PRIMARY KEY,
  pasta_id      text NOT NULL REFERENCES cockpit.pasta(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  resumo        text,
  ordem         integer NOT NULL DEFAULT 0,
  criada_em     timestamptz NOT NULL DEFAULT NOW(),
  atualizada_em timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagina_pasta_ordem
  ON cockpit.pagina (pasta_id, ordem);

DROP TRIGGER IF EXISTS trg_pagina_atualizada_em ON cockpit.pagina;
CREATE TRIGGER trg_pagina_atualizada_em
  BEFORE UPDATE ON cockpit.pagina
  FOR EACH ROW EXECUTE FUNCTION cockpit.fn_atualizada_em();

-- ── VISTA ──
-- O segundo nível de navegação (BLUEPRINT-PAGINAS.md §4): não troca a página,
-- só re-enquadra dentro dela. `id` é serial porque vista não aparece em URL —
-- ela é um índice na barra de baixo.
CREATE TABLE IF NOT EXISTS cockpit.vista (
  id        bigserial PRIMARY KEY,
  pagina_id text NOT NULL REFERENCES cockpit.pagina(id) ON DELETE CASCADE,
  rotulo    text NOT NULL,
  ordem     integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vista_pagina_ordem
  ON cockpit.vista (pagina_id, ordem);
