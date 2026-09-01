import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { ModeracaoService } from "../services/moderacao.services";
import {
  BloquearSchema,
  DenunciarSchema,
  ListarDenunciasQuerySchema,
} from "../validation/moderacao.validation";
import { AppError } from "../utils/AppError";

/**
 * Denunciar, bloquear e a fila da liderança.
 *
 * Em toda ação daqui, **quem age vem do token**. O corpo do pedido diz apenas
 * SOBRE QUEM ou SOBRE O QUÊ. Sem isso seria possível denunciar em nome de
 * outra pessoa, ou ler a lista de bloqueios alheia — que é justamente o que o
 * bloqueio existe para manter em silêncio.
 */
export class ModeracaoController {
  private service = new ModeracaoService();

  public denunciar = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { tipo, alvoId, motivo } = DenunciarSchema.parse(req.body);

    await this.service.denunciar({
      tipo,
      alvoId,
      motivo,
      denuncianteId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message:
        "Denúncia enviada. A liderança vai analisar. Se preferir não ver mais publicações desta pessoa, você também pode bloqueá-la.",
    });
  };

  public bloquear = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { usuarioId } = BloquearSchema.parse(req.body);
    await this.service.bloquear(req.user.id, usuarioId);

    res.status(201).json({
      success: true,
      message: "Pessoa bloqueada. Você não verá mais as publicações dela.",
    });
  };

  public desbloquear = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const usuarioId = Number(req.params.usuarioId);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }

    await this.service.desbloquear(req.user.id, usuarioId);

    res.status(200).json({ success: true, message: "Bloqueio desfeito." });
  };

  public listarBloqueados = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const data = await this.service.listarBloqueados(req.user.id);
    res.status(200).json({ success: true, data });
  };

  public listarDenuncias = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { page, limit } = ListarDenunciasQuerySchema.parse(req.query);
    const resultado = await this.service.listarPendentes(
      req.user.perfil,
      page,
      limit,
    );

    res.status(200).json({ success: true, ...resultado });
  };

  public resolverDenuncia = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }

    await this.service.resolver(id, req.user.perfil);
    res.status(200).json({ success: true, message: "Denúncia arquivada." });
  };
}
