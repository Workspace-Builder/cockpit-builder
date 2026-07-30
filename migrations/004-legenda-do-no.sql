-- Cockpit Builder — Migration 004: legenda do nó
--
-- Os 9 prints do Onboarding têm duas camadas de texto: o título na barra da
-- janela ("Contrato de serviços") e a legenda embaixo, que explica o porquê
-- ("contrato de web designer — assinado antes de tudo").
--
-- A legenda é conteúdo, não decoração — é ela que diz o que o print prova.
-- Enfiar no `html` funcionaria e seria exatamente o erro que a migration 003
-- se deu ao trabalho de evitar.

ALTER TABLE cockpit.no ADD COLUMN IF NOT EXISTS legenda text;
