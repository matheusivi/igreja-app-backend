#!/bin/bash
set -euo pipefail

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  RESTAURAR UM BACKUP                                                  ║
# ╚═══════════════════════════════════════════════════════════════════════╝
#
# ═══ POR QUE ESTE ARQUIVO EXISTE ═══
# Backup que nunca foi restaurado não é backup, é esperança. E a hora de
# descobrir que o comando estava errado não pode ser a hora em que o banco já
# se perdeu — com o pastor perguntando quando o app volta.
#
# Rode uma vez, agora, com o banco funcionando. Se der certo hoje, dá certo no
# dia ruim.
#
#   /opt/ibvi/deploy/restaurar.sh backups/ibvi-20260901-0300.sql.gz
#
# ⚠️  ISTO SOBRESCREVE O BANCO ATUAL. Tudo criado depois daquele backup se
# perde. Por isso o script tira uma cópia de segurança ANTES de restaurar, e
# exige que você digite RESTAURAR por extenso.

cd /opt/ibvi

ARQUIVO="${1:-}"

if [ -z "$ARQUIVO" ]; then
  echo "Uso: $0 <arquivo.sql.gz>"
  echo
  echo "Backups disponíveis:"
  ls -lh backups/ibvi-*.sql.gz 2>/dev/null | awk '{print "  " $9 "   " $5 "   " $6, $7, $8}' || echo "  nenhum"
  exit 1
fi

[ -f "$ARQUIVO" ] || { echo "Arquivo não encontrado: $ARQUIVO"; exit 1; }
gzip -t "$ARQUIVO" || { echo "Arquivo corrompido: $ARQUIVO"; exit 1; }

# Mesmo cuidado do backup.sh: `.env` não é sintaxe de bash, e `source` quebra
# em valores com `<`, `>`, aspas ou parênteses. Lemos só o que interessa.
extrair() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }

POSTGRES_USER=$(extrair POSTGRES_USER)
POSTGRES_DB=$(extrair POSTGRES_DB)

if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
  echo "  ERRO: POSTGRES_USER ou POSTGRES_DB não encontrados no .env"
  exit 1
fi

echo
echo "  Banco:    $POSTGRES_DB"
echo "  Restaura: $ARQUIVO  ($(du -h "$ARQUIVO" | cut -f1))"
echo
echo "  ⚠️  O conteúdo ATUAL do banco será substituído."
echo
read -rp "  Digite RESTAURAR para confirmar: " CONFIRMA
[ "$CONFIRMA" = "RESTAURAR" ] || { echo "  Cancelado."; exit 1; }

# ═══ REDE DE SEGURANÇA ═══
# Uma cópia do estado atual antes de destruí-lo. Se o backup escolhido for o
# errado — data trocada, arquivo velho —, ainda dá para voltar.
SEGURANCA="backups/antes-de-restaurar-$(date +%Y%m%d-%H%M).sql.gz"
echo "  Guardando o estado atual em $SEGURANCA…"
# Mesmas opções do backup.sh — esta cópia precisa ser restaurável nas mesmas
# condições, senão a rede de segurança tem buraco.
docker compose exec -T db \
  pg_dump --clean --if-exists --no-owner \
    -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$SEGURANCA"

# ═══ A API PARA DURANTE A RESTAURAÇÃO ═══
# Com ela no ar, uma requisição pode gravar no meio da restauração e deixar o
# banco num estado que não é nem o antigo nem o novo.
echo "  Parando a API…"
docker compose stop api

echo "  Restaurando…"
# `ON_ERROR_STOP=1` porque o padrão do psql é seguir em frente depois de um
# erro. Sem isso, um restore que falha na metade termina dizendo "pronto", e o
# banco fica num estado que ninguém consegue descrever.
gunzip -c "$ARQUIVO" | docker compose exec -T db \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "  Subindo a API…"
docker compose start api

sleep 5
echo
echo "  Saúde do servidor:"
curl -s http://127.0.0.1:3000/health || echo "  (ainda subindo — confira com: docker compose logs api)"
echo
echo "  Pronto. Se algo saiu errado, o estado anterior está em $SEGURANCA"
