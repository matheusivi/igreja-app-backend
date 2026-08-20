# ╔═══════════════════════════════════════════════════════════════════════╗
# ║  IMAGEM DE PRODUÇÃO DO BACKEND                                        ║
# ╚═══════════════════════════════════════════════════════════════════════╝
#
# Dois estágios: um compila, o outro roda. O que compila carrega TypeScript,
# jest e ts-node — nada disso precisa existir no servidor. A imagem final leva
# só o JavaScript pronto e as dependências de produção.
#
# ═══ POR QUE `slim` E NÃO `alpine` ═══
# Alpine usa musl no lugar da glibc, e o Prisma já deu trabalho aí mais de uma
# vez com engine e OpenSSL. A diferença de tamanho é de algumas dezenas de
# megabytes; a diferença de dor de cabeça, num deploy que você vai mexer uma
# vez por mês, não compensa.
#
# ═══ POR QUE A VERSÃO ESTÁ TRAVADA ═══
# `node:22-slim` e não `node:latest`. Imagem que muda sozinha é o mesmo
# problema do `runtimeVersion` do app: um dia o build reproduz, no outro não,
# e a diferença não está em commit nenhum.

# ─────────────────────────────────────────────────────────────────────────
# Estágio 1 — compilar
# ─────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

# OpenSSL é exigido pelo Prisma. Vem ausente na `slim`, e a falta só aparece
# em tempo de execução, com mensagem que não ajuda.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# `package*.json` sozinhos primeiro, e o resto do código depois: assim o Docker
# reaproveita a camada do `npm ci` enquanto as dependências não mudarem.
# Alterar uma linha de serviço não deve custar reinstalar 670 pacotes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Gerar o cliente ANTES de compilar. Foi exatamente a ordem que faltou na
# máquina local ontem: o schema tinha a coluna nova, o cliente não, e toda
# requisição autenticada virava 401.
RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────
# Estágio 2 — rodar
# ─────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./

# `--omit=dev` deixa de fora TypeScript, jest e ts-node. O CLI do Prisma
# continua entrando porque foi movido para `dependencies`: a migração roda
# aqui, em produção, no arranque do contêiner.
RUN npm ci --omit=dev && npm cache clean --force

# Schema e migrações: o entrypoint precisa deles para aplicar o que faltar.
COPY prisma ./prisma
COPY prisma.config.ts ./

# O cliente é gerado de novo aqui porque `npm ci` no estágio de execução criou
# um `node_modules` limpo, sem o que foi gerado lá atrás.
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# ═══ NÃO RODAR COMO ROOT ═══
# A imagem do Node já traz o usuário `node`. Sem esta linha o processo roda
# como root, e aí qualquer falha de execução remota tem o contêiner inteiro na
# mão em vez de uma conta sem privilégio.
USER node

EXPOSE 3000

# Healthcheck usando a rota que já existe. O compose espera por ele antes de
# considerar o serviço no ar.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
