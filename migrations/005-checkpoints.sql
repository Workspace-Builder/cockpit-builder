-- Cockpit Builder — Migration 005: vista vira checkpoint
--
-- A vista já existia (barra de baixo, teclas 1-9) mas só guardava um rótulo:
-- trocava de nome e não levava a lugar nenhum. Faltava justamente o que ela
-- promete — o ENQUADRAMENTO.
--
-- Com x, y e zoom, "vista" e "checkpoint" viram a mesma coisa: você põe a tela
-- onde quer, salva com um nome, e o botão devolve exatamente aquilo. Criar um
-- segundo conceito ao lado da vista faria duas listas disputarem a mesma barra.
--
-- `NULL` nos três = enquadra a página inteira (o "ver tudo" implícito).

ALTER TABLE cockpit.vista ADD COLUMN IF NOT EXISTS x    double precision;
ALTER TABLE cockpit.vista ADD COLUMN IF NOT EXISTS y    double precision;
ALTER TABLE cockpit.vista ADD COLUMN IF NOT EXISTS zoom double precision;

ALTER TABLE cockpit.vista
  ADD COLUMN IF NOT EXISTS criada_em timestamptz NOT NULL DEFAULT NOW();

-- As quatro vistas de todas as páginas ("Ver tudo", "Ver uma parte", "Ver outra
-- parte", "Ver só o essencial") eram rótulo de espaço reservado: nunca
-- enquadraram nada, porque não havia onde guardar o enquadramento. Some com
-- elas — a barra passa a mostrar só checkpoint que alguém salvou de verdade.
DELETE FROM cockpit.vista WHERE x IS NULL AND y IS NULL AND zoom IS NULL;
