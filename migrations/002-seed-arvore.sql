-- Cockpit Builder — Migration 002: a árvore inicial
--
-- Inventário do BLUEPRINT-PAGINAS.md §4: 4 páginas em 2 grupos. É ponto de
-- partida, não manifesto — depois que o app roda, a verdade é o banco.
--
-- `ON CONFLICT DO NOTHING` em tudo: a migration precisa poder rodar duas vezes
-- sem desfazer renome que alguém já fez pela interface.

INSERT INTO cockpit.pasta (id, nome, ordem) VALUES
  ('obra-10k', 'Obra 10k',          0),
  ('setup-6d', 'Setup Agência 6D',  1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cockpit.pagina (id, pasta_id, nome, resumo, ordem) VALUES
  ('metodo',     'obra-10k', 'O Método 10k',
   'Por quê e quanto: o funil antiprospecção e a conta do 10k.', 0),
  ('obra',       'obra-10k', 'A Obra',
   'O que construir: 4 pilares empilhados, 36 passos.',          1),
  ('trilho',     'obra-10k', 'O Trilho',
   'Os mesmos passos no eixo cíclico: o que roda a cada cliente.', 2),
  ('onboarding', 'setup-6d', 'Onboarding',
   'O fluxo do cliente novo, do contrato à entrega.',            0)
ON CONFLICT (id) DO NOTHING;

-- Rótulos genéricos: a vista existe, o que ela enquadra ainda não.
INSERT INTO cockpit.vista (pagina_id, rotulo, ordem)
SELECT p.id, v.rotulo, v.ordem
FROM cockpit.pagina p
CROSS JOIN (VALUES
  ('Ver tudo',           0),
  ('Ver uma parte',      1),
  ('Ver outra parte',    2),
  ('Ver só o essencial', 3)
) AS v(rotulo, ordem)
WHERE p.id IN ('metodo', 'obra', 'trilho', 'onboarding')
  AND NOT EXISTS (SELECT 1 FROM cockpit.vista x WHERE x.pagina_id = p.id);
