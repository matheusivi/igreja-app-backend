-- Papéis na família: de texto livre para lista fechada.
--
-- A coluna continua `text` — a lista vive na validação, não no banco. Um
-- `enum` do Postgres tornaria cada novo papel ("padrasto", "tutor") uma
-- migração com `ALTER TYPE`, e essa lista ainda vai mudar conforme a igreja
-- usar. O ganho de integridade não paga esse custo agora.
--
-- ═══ 1. "CRIADOR" NÃO É PAPEL ═══
-- Era gravado em `parentesco`, e o app procurava essa string para saber quem
-- abriu o grupo. Isso é duas fontes de verdade para o mesmo fato, e a mais
-- frágil das duas: bastava alguém ser convidado com o parentesco "Criador"
-- para passar a aparecer como dono do grupo.
--
-- Nada se perde ao limpar: `grupos_familiares.criadorUsuarioId` sempre
-- existiu e é quem responde essa pergunta.
UPDATE membros_familia
   SET parentesco = NULL
 WHERE parentesco = 'Criador';

-- ═══ 2. TEXTO ANTIGO PARA AS CHAVES NOVAS ═══
-- O que já foi digitado à mão vira chave quando dá para reconhecer com
-- segurança. Comparação sem acento e sem caixa: quem digitou "Mãe", "mae" ou
-- "MÃE" queria a mesma coisa.
--
-- A conversão é conservadora de propósito — só casa a palavra INTEIRA. "Filho
-- do João" não vira `filho` automaticamente: adivinhar parentesco a partir de
-- texto solto é exatamente o tipo de palpite que, num cadastro usado para
-- saber quem responde por uma criança, não pode ser feito por uma migração.
-- O que não casar fica `NULL` e reaparece na tela como "Definir papel".
UPDATE membros_familia
   SET parentesco = CASE sem_acento(parentesco)
     WHEN 'pai'       THEN 'pai'
     WHEN 'mae'       THEN 'mae'
     WHEN 'conjuge'   THEN 'conjuge'
     WHEN 'esposo'    THEN 'conjuge'
     WHEN 'esposa'    THEN 'conjuge'
     WHEN 'marido'    THEN 'conjuge'
     WHEN 'filho'     THEN 'filho'
     WHEN 'filha'     THEN 'filho'
     WHEN 'irmao'     THEN 'irmao'
     WHEN 'irma'      THEN 'irmao'
     WHEN 'avo'       THEN 'avo'
     WHEN 'neto'      THEN 'neto'
     WHEN 'neta'      THEN 'neto'
     WHEN 'tio'       THEN 'tio'
     WHEN 'tia'       THEN 'tio'
     WHEN 'sobrinho'  THEN 'sobrinho'
     WHEN 'sobrinha'  THEN 'sobrinho'
     ELSE NULL
   END
 WHERE parentesco IS NOT NULL;
