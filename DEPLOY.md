# Subir o backend na VPS

Roteiro do começo ao fim. Cada bloco é para colar no terminal da VPS, na ordem.

Onde aparecer `api.seudominio.com.br`, troque pelo subdomínio que você criar.

---

## Antes de começar

Duas coisas precisam estar prontas:

**1. O DNS apontando.** No painel do seu domínio, crie:

```
Tipo  Nome   Valor
A     api    <IP público da VPS>
```

Confira daí mesmo antes de seguir — DNS leva de minutos a algumas horas:

```bash
dig +short api.seudominio.com.br
```

Tem que responder o IP da VPS. Se vier vazio, espere; se vier outro IP, o registro está errado.

**2. Acesso SSH à VPS**, com um usuário que possa usar `sudo`.

---

## Passo 1 — Preparar a máquina

### Swap

Sua VPS está com **swap zerado**. Com 4 GB e outro app junto, um pico de memória mata processo em vez de ficar lento. Swap é a rede de proteção — lento é melhor que morto.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Saia e entre no SSH de novo (o grupo só vale em sessão nova). Confira:

```bash
docker --version && docker compose version
```

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Só 22, 80 e 443 abertos. O Postgres e a API não aparecem aqui porque escutam apenas em `127.0.0.1` — ver o comentário no `docker-compose.yml`.

---

## Passo 2 — Levar o código

```bash
sudo mkdir -p /opt/ibvi && sudo chown $USER:$USER /opt/ibvi
cd /opt/ibvi
git clone <URL-DO-SEU-REPOSITORIO> .
```

Sem repositório ainda? Do **seu computador**:

```bash
rsync -av --exclude node_modules --exclude .env --exclude dist \
  ./igreja-app-backend/ usuario@IP:/opt/ibvi/
```

---

## Passo 3 — As variáveis

```bash
cd /opt/ibvi
cp .env.producao.example .env
```

Gere os dois segredos e anote:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=')"
echo "JWT_SECRET=$(openssl rand -base64 48)"
```

> A senha do Postgres passa por dentro de uma URL de conexão, por isso o `tr` tira `/`, `+` e `=`.

```bash
nano .env      # cole os valores e preencha Resend e Cloudinary
chmod 600 .env # só o dono lê
```

---

## Passo 4 — Subir

```bash
docker compose up -d --build
```

A primeira vez demora — está compilando o TypeScript e baixando as imagens.

```bash
docker compose ps
docker compose logs -f api
```

O que você quer ver nos logs, nesta ordem:

```
→ Aplicando migrações pendentes…
→ Migrações em dia. Subindo o servidor.
🚀 Servidor rodando na porta 3000
```

Testando por dentro:

```bash
curl http://127.0.0.1:3000/health
```

Tem que responder `{"status":"healthy",...,"database":"connected"}`. Se disser `unhealthy`, o problema é o banco — veja `docker compose logs db`.

---

## Passo 5 — Nginx e HTTPS

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx

sudo cp /opt/ibvi/deploy/nginx-api.conf /etc/nginx/sites-available/ibvi-api
sudo nano /etc/nginx/sites-available/ibvi-api   # trocar SUBDOMINIO.SEUDOMINIO.COM.BR (3 lugares)
```

**Ainda não ative.** O arquivo aponta para certificados que não existem, e o Nginx não recarrega — derrubando o outro app junto. Peça o certificado primeiro:

```bash
sudo certbot certonly --nginx -d api.seudominio.com.br
```

Agora sim:

```bash
sudo ln -s /etc/nginx/sites-available/ibvi-api /etc/nginx/sites-enabled/
sudo nginx -t          # NUNCA pule este teste
sudo systemctl reload nginx
```

Do seu computador:

```bash
curl https://api.seudominio.com.br/health
```

A renovação é automática. Confirme que o timer está de pé:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## Passo 6 — Ligar o app no servidor

No `igreja-app-front`, crie ou edite o `.env`:

```
EXPO_PUBLIC_API_URL=https://api.seudominio.com.br
```

Sem barra no final, e **com https** — o app recusa `http://` em build de produção.

---

## Passo 7 — Criar o primeiro administrador

Cadastre-se normalmente pelo app. Todo mundo nasce Membro, e Pastor/Administrador só se define direto no banco, de propósito:

```bash
docker compose exec db psql -U ibvi -d ibvi \
  -c "UPDATE usuarios SET perfil='Administrador' WHERE email='seu@email.com';"
```

Depois disso você já promove líderes pelo próprio app.

Os cursos:

```bash
docker compose exec api npx prisma db seed 2>/dev/null || \
docker compose exec api node -e "require('./dist/prisma/seed-cursos.js')"
```

---

## Backup — faça antes de precisar

O banco vive num volume do Docker. `docker compose down -v` apaga tudo, sem perguntar.

```bash
mkdir -p /opt/ibvi/backups
cat > /opt/ibvi/backup.sh <<'EOF'
#!/bin/bash
set -e
cd /opt/ibvi
ARQ="backups/ibvi-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U ibvi ibvi | gzip > "$ARQ"
# 14 dias de histórico: o suficiente para perceber um problema e voltar
find backups -name '*.sql.gz' -mtime +14 -delete
echo "ok: $ARQ"
EOF
chmod +x /opt/ibvi/backup.sh

# todo dia às 3h
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/ibvi/backup.sh >> /opt/ibvi/backups/log.txt 2>&1") | crontab -
```

**Teste a restauração pelo menos uma vez.** Backup que nunca foi restaurado não é backup, é esperança:

```bash
gunzip -c backups/ARQUIVO.sql.gz | docker compose exec -T db psql -U ibvi -d ibvi
```

E leve uma cópia para fora da VPS de vez em quando. Backup na mesma máquina não protege de perder a máquina.

---

## Atualizar depois

```bash
cd /opt/ibvi
git pull
docker compose up -d --build
```

O entrypoint aplica migrações pendentes sozinho, antes de o servidor atender.

**Mudou só o app, não o backend?** Então não é aqui — é `eas update`. Ver `PUBLICAR.md` no projeto do front.

---

## Dia a dia

```bash
docker compose logs -f api           # acompanhar
docker compose logs --tail=100 api   # últimas linhas
docker compose restart api           # reiniciar só a API
docker compose ps                    # o que está de pé
docker stats --no-stream             # memória e CPU
docker compose down                  # parar (o banco continua no volume)
```

Abrir o banco à mão:

```bash
docker compose exec db psql -U ibvi -d ibvi
```

---

## Quando algo dá errado

| Sintoma | Onde olhar |
|---|---|
| App diz que não alcança o servidor | `curl https://api.../health` — se responder, o problema é o `EXPO_PUBLIC_API_URL` do app |
| `health` responde `unhealthy` | `docker compose logs db`. Banco subindo ou senha errada no `.env` |
| Contêiner reiniciando sem parar | `docker compose logs api`. Quase sempre migração falhando ou variável faltando |
| Todo mundo tomando 401 | Foi o que aconteceu no dia 19: migração não aplicada. Veja se o log traz "Migrações em dia" |
| 502 no Nginx | A API caiu. `docker compose ps` e depois os logs |
| Certificado vencido | `sudo certbot renew` e `sudo systemctl reload nginx` |
| Servidor lento demais | `free -h` e `docker stats`. Provavelmente memória — confira se o swap está ativo |

---

## O que ainda falta depois disto

- **Remetente de e-mail próprio.** Enquanto o `EMAIL_REMETENTE` apontar para `resend.dev`, a recuperação de senha só chega para você. A congregação não recebe nada e o app não tem como avisar.
- **Domínio da igreja.** O subdomínio pessoal resolve agora; antes de abrir para a congregação, vale o domínio no CNPJ da igreja — é para onde tudo aponta.
