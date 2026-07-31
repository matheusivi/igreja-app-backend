import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";
import { AppError } from "../utils/AppError";

/** 8 MB — folga confortável mesmo para foto sem compressão. */
const TAMANHO_MAXIMO = 8 * 1024 * 1024;

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Recebe o arquivo em memória (não em disco): ele é repassado direto para o
 * Cloudinary e descartado. Assim o servidor não acumula arquivo nenhum.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(
        new AppError(
          "Formato não suportado. Envie uma imagem JPG, PNG, WEBP ou HEIC.",
          400,
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single("imagem");

/**
 * Traduz os erros do multer antes de chegarem ao errorHandler.
 *
 * Sem isto, "arquivo maior que 8 MB" viraria um 500 genérico ("Erro interno do
 * servidor") — o usuário não teria como saber que bastava mandar uma foto menor.
 */
export const uploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  upload(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      const mensagem =
        err.code === "LIMIT_FILE_SIZE"
          ? "A imagem é muito grande. O limite é 8 MB."
          : "Não foi possível processar o arquivo enviado.";
      next(new AppError(mensagem, 400));
      return;
    }
    next(err);
  });
};
