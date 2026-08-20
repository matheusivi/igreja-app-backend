-- Busca que ignora acento.
--
-- ═══ POR QUE NÃO A EXTENSÃO `unaccent` ═══
-- `unaccent` é a resposta canônica e resolve mais casos que isto. Foi
-- descartada por duas razões concretas:
--
--   1. `CREATE EXTENSION` exige superusuário. Numa VPS própria isso existe
--      hoje, mas amarra o deploy a um privilégio que pode não existir se o
--      banco um dia for para um Postgres gerenciado — e a migração falharia
--      no deploy, não no desenvolvimento.
--
--   2. `unaccent()` é declarada STABLE, não IMMUTABLE. Isso impede indexar
--      `unaccent(coluna)` direto: seria preciso envolver numa função própria
--      marcada IMMUTABLE, que é justamente o que estamos fazendo aqui — só
--      que com uma dependência a mais no caminho.
--
-- `translate` é núcleo do Postgres, não pede privilégio nenhum, e a função
-- abaixo é IMMUTABLE de verdade: no dia em que 400 membros virarem 4000,
-- dá para criar um índice `pg_trgm` sobre ela sem mexer em nada disto.
--
-- ═══ AS DUAS LISTAS TÊM QUE TER O MESMO TAMANHO ═══
-- `translate` casa caractere por posição. Se as strings tiverem tamanhos
-- diferentes, os excedentes são REMOVIDOS do texto em silêncio — "João"
-- viraria "Joo" e ninguém descobriria até alguém reclamar que não acha o
-- próprio nome. São 50 e 50, conferidos um a um.

CREATE OR REPLACE FUNCTION sem_acento(texto text)
RETURNS text AS $$
  SELECT lower(
    translate(
      texto,
      'áàâãäéèêëíìîïóòôõöúùûüçñýÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝ',
      'aaaaaeeeeiiiiooooouuuucnyAAAAAEEEEIIIIOOOOOUUUUCNY'
    )
  );
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

COMMENT ON FUNCTION sem_acento(text) IS
  'Normaliza para busca: minúsculas e sem acento. Usada em usuarios."nomeCompleto" e grupos_familiares.nome.';
