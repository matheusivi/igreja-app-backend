# Comandos da VPS — IBVI Church

Servidor: `/opt/ibvi-backend` · Banco: PostgreSQL em contêiner · API: Node em contêiner

Este arquivo existe para o dia em que algo der errado e você não tiver tempo de
reconstruir o raciocínio. Vá direto na seção que precisa.

---

## 🔥 EMERGÊNCIA — o banco está errado, preciso voltar

```bash
cd /opt/ibvi-backend
bash deploy/restaurar.sh                      # lista os backups disponíveis
bash deploy/restaurar.sh backups/<arquivo>    # restaura o escolhido
```

Ele pede que você digite `RESTAURAR` por extenso — de propósito, para não
acontecer por engano.

Antes de mexer em qualquer coisa, o script guarda uma cópia do estado atual em
`backups/antes-de-restaurar-<data>.sql.gz`. Se você escolher o arquivo errado,
dá para voltar restaurando essa cópia.

Durante a restauração a API fica fora do ar por alguns segundos. É de propósito:
com ela no ar, uma requisição poderia gravar no meio da restauração e deixar o
banco num estado que não é nem o antigo nem o novo.

---

## Rotina

### Backup manual (fora do horário automático)

```bash
cd /opt/ibvi-backend
bash deploy/backup.sh
```

O automático roda às 3h da manhã, todo dia. Para conferir que está agendado:

```bash
crontab -l
tail -20 /opt/ibvi-backend/backups/log.txt
```

### Atualizar o servidor com código novo

```bash
cd /opt/ibvi-backend
git pull
docker compose up -d --build api
docker compose logs -f api          # Ctrl+C para sair do acompanhamento
```

O `docker-entrypoint.sh` roda `prisma migrate deploy` sozinho antes de a API
subir, então migrações novas são aplicadas automaticamente.

### Ver se está tudo de pé

```bash
docker compose ps                   # os dois contêineres devem estar "Up"
curl -s http://127.0.0.1:3000/health
docker compose logs --tail=50 api
```

---

## Cópia fora do servidor

Os backups moram no **mesmo disco** que o banco. Isso protege contra erro
humano e contra `docker compose down -v`, mas não protege contra o disco
falhar, o servidor ser perdido ou a conta da VPS ser encerrada.

Do seu computador (PowerShell), traga uma cópia:

```powershell
scp root@api.ibvichurch.com.br:/opt/ibvi-backend/backups/*.sql.gz "C:\Users\mathe\OneDrive\Backups-IBVI\"
```

Salvar dentro do OneDrive faz a cópia subir para a nuvem sozinha — servidor,
seu computador e nuvem, três lugares diferentes.

> ⚠️ **O arquivo contém dados pessoais da congregação**: nomes, e-mails,
> telefones, datas de nascimento, pedidos de oração. Guarde numa pasta que
> só você acessa. Não coloque em pasta compartilhada, não mande por WhatsApp,
> não deixe em pen drive esquecido na igreja.

---

## Regras que custaram caro

**Nunca `chmod +x` nos scripts do repositório.**
O Git guarda a permissão de execução como parte do conteúdo. O `chmod` feito
aqui vira alteração local e trava o `git pull` seguinte com *"your local
changes would be overwritten"*. Chame sempre com `bash` na frente:

```bash
bash deploy/backup.sh        # ✅
./deploy/backup.sh           # ❌ exige chmod, que quebra o pull
```

Se já travou:

```bash
git checkout -- deploy/backup.sh deploy/restaurar.sh
git pull
```

**Nunca `prisma migrate reset` na VPS.** Ele apaga o banco inteiro. O comando
de produção é `migrate deploy`, que só aplica o que falta — e o entrypoint já
faz isso sozinho.

**Nunca edite uma migração já aplicada.** O Prisma guarda uma assinatura de
cada arquivo. Mudar até um comentário quebra a assinatura, e ele passa a
propor apagar o banco para recomeçar. Migração aplicada é história: para
corrigir, crie uma nova.

**Nunca `docker compose down -v`.** O `-v` apaga os volumes — ou seja, o banco.
Para reiniciar sem perder nada: `docker compose restart` ou `docker compose down`
(sem o `-v`).

**Nunca `source .env` em script.** O `.env` não é sintaxe de bash. Um valor com
`<`, `>`, `$`, `(` ou aspas faz o shell tentar executá-lo. Para ler um valor:

```bash
grep -E "^NOME_DA_VARIAVEL=" .env | head -1 | cut -d= -f2-
```

---

## Como ler os comandos, se a memória falhar

| Símbolo | O que faz |
|---|---|
| `\|` | entrega a saída de um comando como entrada do próximo |
| `>` | grava a saída num arquivo, apagando o que havia |
| `>>` | acrescenta no fim do arquivo |
| `2>&1` | manda as mensagens de erro junto com a saída normal |
| `-T` (docker) | desliga o terminal interativo, para a saída não sair corrompida |

O cron tem cinco campos: **minuto hora dia mês dia-da-semana**. `*` é "qualquer".
Então `0 3 * * *` é 3h em ponto, todo dia.

---

## Onde fica o quê

```
/opt/ibvi-backend/
├── .env                     segredos (NUNCA vai para o Git)
├── docker-compose.yml       define os contêineres db e api
├── backups/                 os .sql.gz, 14 dias
└── deploy/
    ├── backup.sh
    ├── restaurar.sh
    ├── nginx-api.conf       cópia do que está em /etc/nginx/sites-available
    └── paginas/             privacidade, termos, exclusão de conta
```

O nginx roda **no host**, não em contêiner — ele é quem tem o certificado e
quem serve as três páginas estáticas.

Os contêineres escutam só em `127.0.0.1`. Isso continua valendo mesmo agora que
a máquina é só da igreja: o Docker escreve regras de iptables **por baixo** do
ufw, então publicar uma porta com `0.0.0.0` abriria o banco para a internet
inteira sem o firewall sequer perceber. O ufw mostraria "deny" e a porta estaria
aberta assim mesmo.
