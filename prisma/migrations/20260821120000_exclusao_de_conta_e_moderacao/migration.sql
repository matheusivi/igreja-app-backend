-- ╔═══════════════════════════════════════════════════════════════════════╗
-- ║  EXCLUSÃO DE CONTA E MODERAÇÃO DO MURAL                               ║
-- ╚═══════════════════════════════════════════════════════════════════════╝
--
-- Exigências das duas lojas para publicar:
--   • quem cria conta tem que conseguir apagá-la (Google e Apple)
--   • conteúdo escrito por usuário precisa de denunciar e bloquear (Apple 1.2)

-- ─── Marca de conta removida ────────────────────────────────────────────
-- Nulo em todas as contas existentes: ninguém é afetado pela migração.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "contaRemovidaEm" TIMESTAMP(3);

-- Índice parcial: as consultas são sempre "quem NÃO foi removido", e contas
-- removidas serão uma minoria minúscula. Indexar a tabela inteira gastaria
-- espaço para responder uma pergunta que quase sempre tem a mesma resposta.
CREATE INDEX IF NOT EXISTS "usuarios_conta_removida_idx"
  ON "usuarios" ("contaRemovidaEm")
  WHERE "contaRemovidaEm" IS NOT NULL;

-- `sexo` passa a aceitar nulo. Não é afrouxamento de regra: o cadastro
-- continua exigindo o campo na validação. É que sexo é dado pessoal, e a
-- exclusão de conta precisa poder destruí-lo como destrói os outros.
ALTER TABLE "usuarios" ALTER COLUMN "sexo" DROP NOT NULL;

-- ─── Denúncias ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "denuncias" (
    "id"            SERIAL       NOT NULL,
    "tipo"          TEXT         NOT NULL,
    "alvoId"        INTEGER      NOT NULL,
    "denuncianteId" INTEGER      NOT NULL,
    "motivo"        TEXT         NOT NULL,
    "criadaEm"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidaEm"   TIMESTAMP(3),

    CONSTRAINT "denuncias_pkey" PRIMARY KEY ("id")
);

-- Uma denúncia por pessoa por conteúdo. Tocar duas vezes no botão não pode
-- inflar a contagem nem gerar trabalho repetido para a liderança.
CREATE UNIQUE INDEX IF NOT EXISTS "denuncias_tipo_alvo_denunciante_key"
  ON "denuncias" ("tipo", "alvoId", "denuncianteId");

-- A liderança pergunta sempre "o que falta resolver".
CREATE INDEX IF NOT EXISTS "denuncias_resolvida_idx" ON "denuncias" ("resolvidaEm");

ALTER TABLE "denuncias"
  ADD CONSTRAINT "denuncias_denunciante_fkey"
  FOREIGN KEY ("denuncianteId") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Bloqueios ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "bloqueios" (
    "bloqueadorId" INTEGER      NOT NULL,
    "bloqueadoId"  INTEGER      NOT NULL,
    "criadoEm"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Chave composta: o par já é a identidade. Um `id` próprio permitiria
    -- gravar o mesmo bloqueio duas vezes.
    CONSTRAINT "bloqueios_pkey" PRIMARY KEY ("bloqueadorId", "bloqueadoId")
);

-- O mural filtra por "quem EU bloqueei" a cada listagem — é este o índice
-- que impede a filtragem de virar varredura da tabela.
CREATE INDEX IF NOT EXISTS "bloqueios_bloqueador_idx" ON "bloqueios" ("bloqueadorId");

ALTER TABLE "bloqueios"
  ADD CONSTRAINT "bloqueios_bloqueador_fkey"
  FOREIGN KEY ("bloqueadorId") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bloqueios"
  ADD CONSTRAINT "bloqueios_bloqueado_fkey"
  FOREIGN KEY ("bloqueadoId") REFERENCES "usuarios"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
