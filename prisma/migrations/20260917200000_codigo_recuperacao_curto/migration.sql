-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  CÓDIGO DE RECUPERAÇÃO DE 8 DÍGITOS                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
--
-- O código passou de 64 caracteres aleatórios para 8 dígitos. Três mudanças
-- acompanham isso, e nenhuma é opcional:
--
--   1. `tentativas` — contador de palpites errados. Sem ele, 8 dígitos
--      seriam adivinháveis por força bruta.
--   2. O índice único sai — com 8 dígitos, dois membros podem receber o
--      mesmo número, e o banco recusaria o segundo.
--   3. Entra um índice por (usuarioId, token), que é como a busca passa a
--      funcionar: o código sozinho não identifica ninguém.
--
-- ═══ POR QUE APAGAR OS CÓDIGOS EXISTENTES ═══
-- Quem pediu recuperação na última hora tem um código de 64 caracteres, e a
-- tela nova espera 8 dígitos. Deixá-los seria prometer um código que não
-- funciona mais. Eles valem 1 hora; apagar afeta no máximo quem pediu agora,
-- e essa pessoa só precisa pedir de novo.
DELETE FROM "password_reset_tokens";

ALTER TABLE "password_reset_tokens"
  ADD COLUMN IF NOT EXISTS "tentativas" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "password_reset_tokens_token_key";

CREATE INDEX IF NOT EXISTS "password_reset_tokens_usuarioId_token_idx"
  ON "password_reset_tokens" ("usuarioId", "token");
