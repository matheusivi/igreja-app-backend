-- Instante da última troca de senha, usado para invalidar os JWT emitidos antes.
--
-- Nulo para todas as contas existentes de propósito: nulo significa "nunca
-- trocou", e ninguém deve ser deslogado por causa desta migração. A coluna só
-- passa a valer a partir da primeira redefinição de senha de cada pessoa.
--
-- IF NOT EXISTS para a migração poder ser reaplicada sem quebrar.
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "senhaAlteradaEm" TIMESTAMP(3);
