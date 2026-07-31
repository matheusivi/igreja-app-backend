# Upload de imagens (Cloudinary)

## 1. Criar a conta

1. Acesse https://cloudinary.com e crie uma conta gratuita.
2. No **Dashboard**, copie os três valores: `Cloud name`, `API Key`, `API Secret`.

## 2. Configurar o backend

Adicione ao `.env` do `igreja-app-backend`:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

As três variáveis são **opcionais** no schema de validação: sem elas o servidor
sobe normal e só o upload responde 503 com mensagem clara. Isso permite rodar o
projeto localmente sem configurar nada.

Instale as dependências (já estão no `package.json`):

```bash
npm install
```

## 3. Configurar o app

```bash
npx expo install expo-image-picker expo-image-manipulator
```

O `app.json` já traz o plugin do `expo-image-picker` com os textos de permissão
em português (exigidos pela App Store). Como um plugin nativo foi adicionado, é
preciso reiniciar com cache limpo:

```bash
npx expo start -c
```

## 4. Como funciona

```
App → comprime no aparelho → POST /api/upload (multipart) → Cloudinary → URL
```

- **Rota:** `POST /api/upload`, autenticada. Campo `imagem` (arquivo) e `pasta`
  (`perfis` | `eventos` | `conteudos` | `familias`). Responde `{ url, publicId }`.
- **Compressão no aparelho** (`src/services/upload.service.ts`): perfil vai a
  400px, capas a 1080px, JPEG a 75%. Uma foto de 4 MB vira ~60 KB. Isso derruba
  o consumo de cota e deixa o upload rápido no 4G.
- **Servidor não guarda arquivo:** o multer usa `memoryStorage` e o buffer é
  repassado direto ao Cloudinary. Nada fica em disco na VPS.
- **Limites:** 8 MB por arquivo, 1 arquivo por requisição, apenas JPG/PNG/WEBP/HEIC.
- **Foto antiga é apagada** quando o usuário troca ou remove a de perfil
  (`auth.services.ts` → `removerImagem`), senão o espaço ficaria ocupado para
  sempre por imagens que ninguém mais vê.

## 5. Cota do plano gratuito

25 créditos/mês, onde 1 crédito = 1 GB de armazenamento **ou** 1 GB de tráfego
**ou** 1000 transformações. Com a compressão atual (~60 KB por foto de perfil),
25 GB dão para cerca de 400 mil imagens ou milhões de visualizações — folga
enorme para o tamanho da igreja.

## 6. Onde a foto já aparece

- **Perfil** e **Editar perfil**: avatar tocável com selo de câmera.
- **Mural de oração**: componente `Avatar` mostra a foto do autor.
- **Aniversariantes** na Home: mesmo componente.

Falta ligar (o endpoint já aceita, só falta a tela): capa de evento, capa de
devocional/aviso e foto de grupo familiar. Basta usar o hook
`useSeletorImagem({ pasta: 'eventos' })` e salvar a URL no campo do registro.
