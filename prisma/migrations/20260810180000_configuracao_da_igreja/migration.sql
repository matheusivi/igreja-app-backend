-- Configuracao da igreja: uma linha so.
--
-- O `CHECK (id = 1)` e o que torna o singleton uma REGRA, e nao uma
-- convencao. Sem ele, bastaria um `create` distraido para existir a segunda
-- configuracao — e a Home passaria a mostrar uma ou outra conforme a ordem
-- da consulta, que e o tipo de defeito que so aparece em producao.
CREATE TABLE IF NOT EXISTS "configuracao_igreja" (
  "id"            integer      PRIMARY KEY DEFAULT 1,
  "heroImagemUrl" text,
  "versiculoHome" text,
  "atualizadoEm"  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuracao_igreja_linha_unica" CHECK ("id" = 1)
);

-- A linha nasce junto com a tabela, com o versiculo que estava escrito no
-- codigo do app. Assim a Home nunca precisa lidar com "configuracao ainda
-- nao existe" — o estado inicial e o mesmo de hoje, so que agora editavel.
INSERT INTO "configuracao_igreja" ("id", "versiculoHome")
VALUES (1, 'A expectativa gera o ambiente de milagres.')
ON CONFLICT ("id") DO NOTHING;
