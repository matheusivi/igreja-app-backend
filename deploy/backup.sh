#!/bin/bash
set -euo pipefail

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  BACKUP DIÁRIO DO BANCO                                               ║
# ╚═══════════════════════════════════════════════════════════════════════╝
#
# O banco vive num volume do Docker. Isso o protege de recriar contêiner e de
# trocar imagem — mas não de `docker compose down -v`, não de disco com defeito,
# e não de alguém apagar a tabela errada às onze da noite.
#
# O que está lá dentro não se recompra: cadastros da congregação, pedidos de
# oração, progresso de leitura de quem vem lendo o ano inteiro. Código se
# recupera do git; isso não se recupera de lugar nenhum.
#
# ═══ COMO INSTALAR ═══
#   bash /opt/ibvi/deploy/backup.sh               # testa uma vez, agora
#   (crontab -l 2>/dev/null | grep -v backup.sh; echo "0 3 * * * /bin/bash /opt/ibvi/deploy/backup.sh >> /opt/ibvi/backups/log.txt 2>&1") | crontab -
#
# Chamar com `bash` na frente, e não `chmod +x` no arquivo: o Git guarda a
# permissão como parte do conteúdo, então o `chmod` feito na VPS vira alteração
# local e trava o `git pull` seguinte com "your local changes would be
# overwritten". Aconteceu. Assim não acontece de novo.
#
# Às 3h porque é quando ninguém está usando: o `pg_dump` segura uma transação
# longa, e de madrugada ela não disputa com ninguém.

cd /opt/ibvi

DESTINO="/opt/ibvi/backups"
DIAS_MANTIDOS=14
ARQUIVO="$DESTINO/ibvi-$(date +%Y%m%d-%H%M).sql.gz"

mkdir -p "$DESTINO"

# ═══ LER O .env SEM DEIXAR O BASH INTERPRETÁ-LO ═══
# A tentação era `source .env`. Não funciona, e a falha é feia: `.env` NÃO é
# sintaxe de bash. Basta um valor com caractere especial para o shell tentar
# executá-lo.
#
# Foi exatamente o que aconteceu com esta linha:
#
#     EMAIL_REMETENTE=IBVI <nao-responda@ibvi.novafeira.com.br>
#
# Os sinais `<` e `>` são redirecionamento de entrada e saída. O `source`
# engasgou com "syntax error near unexpected token", e o backup nunca rodou.
# O Docker lê o mesmo arquivo sem reclamar porque tem leitor próprio.
#
# Aqui só precisamos de dois valores, ambos simples. Extraí-los com `grep`
# lê o que interessa e nunca interpreta o resto — nem hoje, nem no dia em que
# alguém acrescentar uma variável com aspas, cifrão ou parêntese.
extrair() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

POSTGRES_USER=$(extrair POSTGRES_USER)
POSTGRES_DB=$(extrair POSTGRES_DB)

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
  echo "  ERRO: POSTGRES_USER ou POSTGRES_DB não encontrados no .env"
  exit 1
fi

echo "[$(date '+%d/%m %H:%M')] iniciando backup"

# `-T` desliga o pseudo-terminal: sem isso o docker acrescenta caracteres de
# controle no meio da saída, e o arquivo .sql sai corrompido de um jeito que
# só aparece na hora de restaurar.
#
# ═══ POR QUE --clean --if-exists ═══
# Sem `--clean`, o dump só tem `CREATE TABLE`. Restaurar num banco que já tem
# as tabelas — que é o caso real: o desastre quase nunca é "o banco sumiu", é
# "os dados ficaram errados" — daria "relation already exists" em cada tabela,
# e o restore pararia no meio.
#
# `--clean` acrescenta um `DROP` antes de cada `CREATE`. `--if-exists` faz
# esses DROPs não reclamarem quando o objeto não existe, que é o outro caso:
# restaurar em banco vazio, num servidor novo.
#
# `--no-owner` tira os `ALTER TABLE ... OWNER TO`. O dono é recriado como o
# usuário que restaura. Sem isso, restaurar num servidor onde o usuário do
# Postgres tenha outro nome falha em toda linha.
docker compose exec -T db \
  pg_dump --clean --if-exists --no-owner \
    -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$ARQUIVO"

# ═══ CONFERIR QUE O ARQUIVO PRESTA ═══
# Um `pg_dump` que falha no meio ainda deixa um .gz — pequeno e inútil. Sem
# esta checagem, o backup "funcionaria" todos os dias até o dia da restauração.
TAMANHO=$(stat -c%s "$ARQUIVO")
if [ "$TAMANHO" -lt 1024 ]; then
  echo "  ERRO: arquivo com apenas ${TAMANHO}B — o dump falhou. Mantendo os anteriores."
  rm -f "$ARQUIVO"
  exit 1
fi

# `gzip -t` lê o arquivo inteiro e confirma que descompacta. É o mais perto de
# "testei a restauração" que dá para fazer automaticamente todo dia.
if ! gzip -t "$ARQUIVO"; then
  echo "  ERRO: arquivo corrompido. Removido."
  rm -f "$ARQUIVO"
  exit 1
fi

echo "  ok: $(basename "$ARQUIVO") — $(du -h "$ARQUIVO" | cut -f1)"

# ═══ LIMPEZA ═══
# 14 dias é o suficiente para alguém perceber um problema e voltar atrás. Mais
# que isso vira disco cheio, que é outro jeito de derrubar o servidor.
REMOVIDOS=$(find "$DESTINO" -name 'ibvi-*.sql.gz' -mtime +$DIAS_MANTIDOS -print -delete | wc -l)
[ "$REMOVIDOS" -gt 0 ] && echo "  $REMOVIDOS backup(s) antigo(s) removido(s)"

echo "  total guardado: $(du -sh "$DESTINO" | cut -f1) em $(find "$DESTINO" -name 'ibvi-*.sql.gz' | wc -l) arquivos"
