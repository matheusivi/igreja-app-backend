
-- Diretório profissional da comunidade.
--
-- ═══ POR QUE `divulgarTrabalho` NASCE FALSO ═══
-- O padrão poderia ser `true` para o diretório já nascer cheio. Seria errado:
-- a profissão foi informada no cadastro de MEMBRO, e publicá-la junto com um
-- telefone para 400 pessoas é outra finalidade. Quem entra tem que ter
-- escolhido entrar.
--
-- O efeito colateral é bom: um diretório opt-in contém só gente que QUER ser
-- procurada, então o contato chega desejado em vez de invasivo.
--
-- ═══ POR QUE NÃO HÁ COLUNA DE IDADE ═══
-- A idade não é exibida. `dataNascimento` já existe e serve a uma única coisa
-- aqui: barrar menores de idade na consulta, do lado do servidor. Guardar
-- idade calculada seria um dado a mais para vazar, e que envelhece sozinho.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS "telefone"         text,
  ADD COLUMN IF NOT EXISTS "especializacao"   text,
  ADD COLUMN IF NOT EXISTS "divulgarTrabalho" boolean NOT NULL DEFAULT false;

-- Índice parcial: a listagem SEMPRE filtra por quem se divulga, e essa fatia
-- é pequena perto da igreja inteira. O índice cobre exatamente a fatia
-- consultada, sem carregar as linhas que nunca entram no resultado.
--
-- Diferente do índice único que foi descartado em famílias: aquele exigia
-- manutenção manual a cada migração do Prisma por ser UNIQUE parcial sobre
-- coluna que o schema declara. Este é um índice comum de leitura — o Prisma
-- não tenta reconciliar, porque não há restrição de integridade envolvida.
CREATE INDEX IF NOT EXISTS "usuarios_divulgam_trabalho"
  ON usuarios ("divulgarTrabalho")
  WHERE "divulgarTrabalho" = true;
