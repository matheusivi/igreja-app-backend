-- Nome da congregacao fora do codigo.
--
-- Ele estava escrito em SETE lugares do app — login, cadastro, recuperacao de
-- senha, hero da Home, aniversariantes, avisos e contribuicao. Trocar exigia
-- achar os sete e publicar versao nova.
--
-- O valor inicial e o que ja estava no codigo, entao nada muda de aparencia
-- ate alguem editar.
ALTER TABLE "configuracao_igreja"
  ADD COLUMN IF NOT EXISTS "nomeIgreja" text;

UPDATE "configuracao_igreja"
   SET "nomeIgreja" = 'IBVI Nova Andradina'
 WHERE "id" = 1 AND "nomeIgreja" IS NULL;
