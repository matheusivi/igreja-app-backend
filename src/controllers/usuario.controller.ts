import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { UsuarioService } from "../services/usuario.services";
import {
  ListarUsuariosQuerySchema,
  MesQuerySchema,
} from "../validation/usuario.validation";
import { AppError } from "../utils/AppError";

export class UsuarioController {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  public listar = async (req: AuthRequest, res: Response): Promise<void> => {
    const query = ListarUsuariosQuerySchema.parse(req.query);

    const resultado = await this.usuarioService.listar(query);

    res.status(200).json({
      success: true,
      ...resultado,
    });
  };

  public buscarPerfil = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const usuarioId = Number(req.params.id);
    if (isNaN(usuarioId)) throw new AppError("ID do usuário inválido", 400);

    const usuario = await this.usuarioService.buscarPerfil(usuarioId);

    res.status(200).json({
      success: true,
      data: usuario,
    });
  };

  public aniversariantes = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const { mes } = MesQuerySchema.parse(req.query);

    const resultado = await this.usuarioService.aniversariantes(mes);

    res.status(200).json({
      success: true,
      ...resultado,
    });
  };
}
