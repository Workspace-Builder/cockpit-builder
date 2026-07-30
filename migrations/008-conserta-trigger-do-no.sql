-- Cockpit Builder — Migration 008: conserta o trigger de `no`
--
-- DEFEITO: a migration 003 criou a coluna `atualizado_em` (masculino) mas
-- pendurou nela o trigger `cockpit.fn_atualizada_em()`, escrito para `pasta` e
-- `pagina`, que gravam `atualizada_em` (feminino). A função faz
-- `NEW.atualizada_em = NOW()` — campo que não existe em `no`.
--
-- CONSEQUÊNCIA: **todo UPDATE em `cockpit.no` falhava**, com
-- `record "new" has no field "atualizada_em"`. Não era um caso de borda: era
-- 100% das escritas. Arrastar nó nunca persistiu, e o inspetor de estilo
-- (migration 007) morria na primeira cor clicada.
--
-- Escapou porque, até agora, ninguém tinha ATUALIZADO um nó — o importador só
-- faz DELETE + INSERT, e INSERT não dispara trigger de UPDATE. O defeito ficou
-- dormindo desde a 003.
--
-- CORREÇÃO: renomear a coluna, não duplicar a função. Uma função de
-- `atualizada_em` para o schema inteiro é mais fácil de manter do que uma por
-- tabela — e deixa o nome consistente com `pasta` e `pagina`.

ALTER TABLE cockpit.no RENAME COLUMN atualizado_em TO atualizada_em;

-- Recria o trigger apontando pro nome novo.
DROP TRIGGER IF EXISTS trg_no_atualizado_em ON cockpit.no;
DROP TRIGGER IF EXISTS trg_no_atualizada_em ON cockpit.no;
CREATE TRIGGER trg_no_atualizada_em
  BEFORE UPDATE ON cockpit.no
  FOR EACH ROW EXECUTE FUNCTION cockpit.fn_atualizada_em();
