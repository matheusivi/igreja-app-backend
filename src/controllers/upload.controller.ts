import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { uploadImagem, type PastaUpload } from "../lib/cloudinary";
import { AppError } from "../utils/AppError";

const PASTAS_VALIDAS: PastaUpload[] = [
  "perfis",
  "eventos",
  "conteudos",
  "familias",
  "hero",
];

export class UploadController {
  /**
   * Recebe uma imagem e devolve a URL hospedada.
   *
   * Endpoint genérico de propósito: serve para foto de perfil hoje e para
   * capas de evento, devocional e grupo familiar depois, sem precisar de uma
   * rota nova para cada caso.
   */
  public enviarImagem = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);
    if (!req.file) throw new AppError("Nenhuma imagem foi enviada.", 400);

    const pastaRecebida = String(req.body?.pasta ?? "perfis") as PastaUpload;
    const pasta = PASTAS_VALIDAS.includes(pastaRecebida)
      ? pastaRecebida
      : "perfis";

    const resultado = await uploadImagem(req.file.buffer, pasta);

    res.status(201).json({
      success: true,
      message: "Imagem enviada com sucesso",
      data: resultado,
    });
  };
}
