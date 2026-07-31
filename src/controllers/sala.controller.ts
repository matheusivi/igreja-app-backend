// src/controllers/sala.controller.ts
import type { Response } from "express";
import { SalaService } from "../services/sala.services";
import type { AuthRequest } from "../middlewares/auth.middleware";
// Os schemas de sala vivem em sala.validation. Este controller importava de
// curso.validation, que tinha uma cópia antiga com os MESMOS nomes — e ela
// exigia data no formato "YYYY-MM-DD". Nome duplicado em dois arquivos é
// invisível no import: dá para editar o schema errado por horas sem efeito.
import {
  CreateSalaSchema,
  UpdateSalaSchema,
} from "../validation/sala.validation";
import type { CreateSalaDTO, UpdateSalaDTO } from "../dtos/sala.dto";
import { AppError } from "../utils/AppError";

export class SalaController {
  private salaService: SalaService;

  constructor() {
    this.salaService = new SalaService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    const cursoId = Number(req.params.cursoId);
    if (isNaN(cursoId)) {
      throw new AppError("ID do curso inválido", 400);
    }

    const validatedData = CreateSalaSchema.parse({
      ...req.body,
      cursoId,
    });

    const usuarioId = req.user!.id;

    const sala = await this.salaService.create(
      validatedData as CreateSalaDTO,
      usuarioId,
    );

    res.status(201).json({
      success: true,
      message: "Sala criada com sucesso",
      data: sala,
    });
  };

  public getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const salaId = Number(req.params.id);
    if (isNaN(salaId)) throw new AppError("ID da sala inválido", 400);

    const sexoUsuario = req.user!.sexo;

    const sala = await this.salaService.getById(salaId, sexoUsuario);

    res.status(200).json({
      success: true,
      data: sala,
    });
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    const { cursoId, busca, limit, page, cursoNome, liderNome, status } =
      req.query;
    const sexoUsuario = req.user!.sexo;

    const resultado = await this.salaService.list(
      {
        ...(cursoId ? { cursoId: Number(cursoId) } : {}),
        ...(busca ? { busca: String(busca) } : {}),
        ...(cursoNome ? { cursoNome: String(cursoNome) } : {}),
        ...(liderNome ? { liderNome: String(liderNome) } : {}),
        ...(status ? { status: String(status) } : {}),
        ...(limit ? { limit: Number(limit) } : {}),
        ...(page ? { page: Number(page) } : {}),
      },
      sexoUsuario,
    );

    res.status(200).json({
      success: true,
      ...resultado,
    });
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    const salaId = Number(req.params.id);
    if (isNaN(salaId)) {
      throw new AppError("ID da sala inválido", 400);
    }

    const validatedData = UpdateSalaSchema.parse(req.body);
    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    const sala = await this.salaService.update(
      salaId,
      validatedData as UpdateSalaDTO,
      usuarioId,
      perfil,
    );

    res.status(200).json({
      success: true,
      message: "Sala atualizada com sucesso",
      data: sala,
    });
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    const salaId = Number(req.params.id);
    if (isNaN(salaId)) {
      throw new AppError("ID da sala inválido", 400);
    }

    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    await this.salaService.delete(salaId, usuarioId, perfil);

    res.status(200).json({
      success: true,
      message: "Sala excluída com sucesso",
    });
  };
}
