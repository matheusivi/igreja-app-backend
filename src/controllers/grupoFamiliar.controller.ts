import type { Response } from "express";
import { GrupoFamiliarService } from "../services/grupoFamiliar.services";
import {
  CreateGrupoFamiliarSchema,
  ConvidarMembroSchema,
  ResponderConviteSchema,
} from "../validation/grupoFamiliar.validation";
import { AppError } from "../utils/AppError";
import { AuthRequest } from "../middlewares/auth.middleware";

export class GrupoFamiliarController {
  private grupoFamiliarService: GrupoFamiliarService;

  constructor() {
    this.grupoFamiliarService = new GrupoFamiliarService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    const validatedData = CreateGrupoFamiliarSchema.parse(req.body);
    const usuarioId = req.user!.id;

    const grupo = await this.grupoFamiliarService.create(
      validatedData,
      usuarioId,
    );

    res.status(200).json({
      success: true,
      data: grupo,
      message: "Grupo familiar criado com sucesso",
    });
  };

  public convidar = async (req: AuthRequest, res: Response): Promise<void> => {
    const grupoId = Number(req.params.grupoId);
    if (isNaN(grupoId)) throw new AppError("ID do grupo inválido", 400);

    const validatedData = ConvidarMembroSchema.parse(req.body);
    const usuarioId = req.user!.id;

    await this.grupoFamiliarService.convidar(grupoId, validatedData, usuarioId);

    res.status(200).json({
      success: true,
      message: "Convite enviado com sucesso",
    });
  };

  public responderConvite = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const membroId = Number(req.params.membroId);
    if (isNaN(membroId)) throw new AppError("ID do convite inválido", 400);

    const validatedData = ResponderConviteSchema.parse(req.body);
    const usuarioId = req.user!.id;

    await this.grupoFamiliarService.responderConvite(
      membroId,
      validatedData,
      usuarioId,
    );

    res.status(200).json({
      success: true,
      message:
        validatedData.status === "aceito"
          ? "Convite aceito"
          : "Convite recusado",
    });
  };

  public getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const grupoId = Number(req.params.grupoId);
    if (isNaN(grupoId)) throw new AppError("ID do grupo inválido", 400);

    const grupo = await this.grupoFamiliarService.getById(grupoId);

    res.status(200).json({
      success: true,
      data: grupo,
    });
  };

  public getByUsuario = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const usuarioId = Number(req.params.usuarioId);
    if (isNaN(usuarioId)) throw new AppError("ID do usuário inválido", 400);

    const solicitanteId = req.user!.id;
    const perfil = req.user!.perfil;

    const podeVer =
      solicitanteId === usuarioId ||
      perfil === "Administrador" ||
      perfil === "Pastor";

    if (!podeVer) {
      throw new AppError(
        "Você não tem permissão para ver os grupos deste usuário.",
        403,
      );
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const resultado = await this.grupoFamiliarService.getByUsuario(
      usuarioId,
      page,
      limit,
    );

    res.status(200).json({
      success: true,
      ...resultado,
    });
  };

  public removerMembro = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const grupoId = Number(req.params.grupoId);
    const membroUsuarioId = Number(req.params.usuarioId);

    if (isNaN(grupoId) || isNaN(membroUsuarioId)) {
      throw new AppError("IDs inválidos", 400);
    }

    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    await this.grupoFamiliarService.removerMembro(
      grupoId,
      membroUsuarioId,
      usuarioId,
      perfil,
    );

    res.status(200).json({
      success: true,
      message: "Membro removido com sucesso",
    });
  };
}
