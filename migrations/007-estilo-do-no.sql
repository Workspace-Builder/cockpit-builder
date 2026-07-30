-- Cockpit Builder — Migration 007: estilo do nó
--
-- É a linha que separa ARRASTAR de EDITAR.
--
-- Hoje o nó guarda onde está (x, y, w, h) e o que diz (txt, html, url, img).
-- Não guarda como ele é: cor, fonte, peso, alinhamento, contorno. Sem estas
-- colunas o inspetor da direita é decoração — os controles existem e não têm
-- onde gravar.
--
-- É exatamente o que o BLUEPRINT.md §9 já previa em `{cor, corTxt, fs, fw, ta}`,
-- e o motivo pelo qual ele dizia que cor e texto eram "marcação, não
-- propriedade" no board legado: lá isso vivia dentro do HTML serializado.
--
-- TUDO NULO = usa o padrão do tipo. Os 99 nós importados continuam iguais:
-- o vocabulário `fx-*` segue mandando na aparência de quem não foi editado.
-- Só quem for tocado no inspetor passa a carregar o próprio estilo.

ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS cor       text;  -- preenchimento
ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS cor_txt   text;  -- cor do texto
ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS contorno  text;  -- solido | tracejado | nenhum
ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS fs        real;  -- tamanho da fonte, px
ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS fw        integer; -- peso, 400..800
ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS ta        text;  -- left | center | right

-- Guarda-corpo: valor fora do vocabulário não entra. Um `contorno = 'sólido'`
-- com acento, vindo de um formulário distraído, quebraria a renderização em
-- silêncio — e silêncio é o pior jeito de descobrir defeito de dado.
ALTER TABLE cockpit.no DROP CONSTRAINT IF EXISTS no_contorno_ok;
ALTER TABLE cockpit.no ADD CONSTRAINT no_contorno_ok
  CHECK (contorno IS NULL OR contorno IN ('solido', 'tracejado', 'nenhum'));

ALTER TABLE cockpit.no DROP CONSTRAINT IF EXISTS no_ta_ok;
ALTER TABLE cockpit.no ADD CONSTRAINT no_ta_ok
  CHECK (ta IS NULL OR ta IN ('left', 'center', 'right'));
