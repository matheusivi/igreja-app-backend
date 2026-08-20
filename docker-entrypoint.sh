#!/bin/sh
set -e

# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  A MIGRAÇÃO RODA ANTES DO SERVIDOR. SEMPRE.                           ║
# ╚═══════════════════════════════════════════════════════════════════════╝
#
# Ontem, na máquina local, o schema tinha uma coluna que o banco e o cliente
# do Prisma ainda não conheciam. O sintoma foi login entrando e saindo no mesmo
# segundo, porque toda requisição autenticada estourava e virava 401.
#
# Foi chato de achar com um usuário. Com a congregação inteira, num domingo,
# seria o app simplesmente não funcionar para ninguém — e a causa estaria num
# comando esquecido, não no código.
#
# Amarrar isso aqui é o que garante que não existe estado onde o servidor está
# no ar e o banco está atrasado. Se a migração falhar, `set -e` derruba o
# contêiner, e o compose não coloca ninguém para conversar com ele.
#
# ═══ `migrate deploy`, NUNCA `migrate dev` ═══
# `dev` compara o schema com o banco, propõe alterações e pode PEDIR PARA
# APAGAR DADOS quando encontra divergência. Ele existe para a sua máquina.
# `deploy` só aplica as migrações pendentes, na ordem, sem inventar nada e sem
# nunca destruir dado.

echo "→ Aplicando migrações pendentes…"
npx prisma migrate deploy

echo "→ Migrações em dia. Subindo o servidor."

# `exec` substitui o shell pelo Node em vez de deixá-lo como processo pai.
# Sem isso o Node vira filho, não recebe o SIGTERM que o Docker manda ao
# parar, e o encerramento gracioso do `server.ts` — que fecha a conexão com o
# banco — nunca é executado. O contêiner acabaria morto à força depois de 10s.
exec "$@"
