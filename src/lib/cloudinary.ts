import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/**
 * Hospedagem das imagens do app (foto de perfil, capas de evento etc.).
 *
 * As credenciais são opcionais no `env`: sem elas o servidor sobe normalmente
 * e só o upload fica indisponível, com mensagem clara. Isso permite rodar o
 * projeto localmente sem precisar configurar Cloudinary.
 */
// Copiados para constantes locais de propósito: o TypeScript só consegue
// estreitar `string | undefined` para `string` em variáveis, não em
// propriedades de objeto. Com `exactOptionalPropertyTypes` ligado no tsconfig,
// passar `env.CLOUDINARY_CLOUD_NAME` direto para o config não compila.
const cloudName = env.CLOUDINARY_CLOUD_NAME;
const apiKey = env.CLOUDINARY_API_KEY;
const apiSecret = env.CLOUDINARY_API_SECRET;

export const cloudinaryConfigurado = Boolean(cloudName && apiKey && apiSecret);

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/** Pastas separadas para facilitar organização e limpeza no painel. */
export type PastaUpload =
  | "perfis"
  | "eventos"
  | "conteudos"
  | "familias"
  // Capa do topo da Home. Pasta própria porque é UMA imagem para a igreja
  // inteira — misturá-la com as de evento tornaria impossível achá-la no
  // painel do Cloudinary no dia em que alguém precisar.
  | "hero";

export type ResultadoUpload = {
  url: string;
  publicId: string;
};

/**
 * Envia a imagem para o Cloudinary.
 *
 * As transformações rodam no envio (`eager` não é necessário aqui): limitamos
 * a 1200px de largura e deixamos qualidade/formato automáticos. Mesmo com a
 * compressão feita no celular, isso garante que nada gigante seja servido
 * caso o upload venha de outra origem.
 */
export async function uploadImagem(
  buffer: Buffer,
  pasta: PastaUpload,
): Promise<ResultadoUpload> {
  if (!cloudinaryConfigurado) {
    throw new AppError(
      "Upload de imagens não está configurado no servidor.",
      503,
    );
  }

  return new Promise<ResultadoUpload>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `ibvi/${pasta}`,
        resource_type: "image",
        transformation: [
          { width: 1200, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError("Não foi possível enviar a imagem.", 502));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    stream.end(buffer);
  });
}

/**
 * Remove uma imagem. Usado ao trocar a foto de perfil, para a antiga não
 * ficar ocupando espaço para sempre.
 */
export async function removerImagem(publicId: string): Promise<void> {
  if (!cloudinaryConfigurado) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Falhar aqui não pode quebrar o fluxo do usuário: a imagem nova já foi
    // salva. No pior caso sobra um arquivo órfão no Cloudinary.
  }
}

/**
 * Extrai o publicId a partir da URL salva no banco.
 * Ex.: https://res.cloudinary.com/x/image/upload/v123/ibvi/perfis/abc.jpg
 *      -> ibvi/perfis/abc
 */
export function extrairPublicId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url);
  return match?.[1] ?? null;
}
