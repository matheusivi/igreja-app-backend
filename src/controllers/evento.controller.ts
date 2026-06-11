import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { EventoService } from "../services/evento.services";
import {
  CreateEventoSchema,
  UpdateEventoSchema,
  ListarEventosQuerySchema,
} from "../validation/evento.validation";
import { AppError } from "../utils/AppError";

export class EventoController {
  private eventoService: EventoService;

  constructor() {
    this.eventoService = new EventoService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    const validatedData = CreateEventoSchema.parse(req.body);
    const usuarioId = req.user!.id;

    const evento = await this.eventoService.create(validatedData, usuarioId);

    res.status(201).json({
      success: true,
      message: "Evento criado com sucesso",
      data: evento,
    });
  };

  public getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const eventoId = Number(req.params.id);
    if (isNaN(eventoId)) throw new AppError("ID do evento inválido", 400);

    const evento = await this.eventoService.getById(eventoId);

    res.status(200).json({
      success: true,
      data: evento,
    });
  };

  public listarPorMes = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const { mes, ano } = ListarEventosQuerySchema.parse(req.query);

    const resultado = await this.eventoService.listarPorMes(mes, ano);

    res.status(200).json({
      success: true,
      ...resultado,
    });
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    const eventoId = Number(req.params.id);
    if (isNaN(eventoId)) throw new AppError("ID do evento inválido", 400);

    const validatedData = UpdateEventoSchema.parse(req.body);
    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    const evento = await this.eventoService.update(
      eventoId,
      validatedData,
      usuarioId,
      perfil,
    );

    res.status(200).json({
      success: true,
      message: "Evento atualizado com sucesso",
      data: evento,
    });
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    const eventoId = Number(req.params.id);
    if (isNaN(eventoId)) throw new AppError("ID do evento inválido", 400);

    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    await this.eventoService.delete(eventoId, usuarioId, perfil);

    res.status(200).json({
      success: true,
      message: "Evento excluído com sucesso",
    });
  };
}
