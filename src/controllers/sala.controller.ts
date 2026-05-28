// src/controllers/sala.controller.ts
import type { Response } from "express";
import { SalaService } from "../services/sala.services";
import type { AuthRequest } from "../middlewares/auth.middleware";
import {
  CreateSalaSchema,
  UpdateSalaSchema,
} from "../validation/curso.validation";
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
      usuarioId
    );

    res.status(201).json({
      success: true,
      message: "Sala criada com sucesso",
      data: sala,
    });
  };

  public getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const salaId = Number(req.params.id);
    if (isNaN(salaId)) {
      throw new AppError("ID da sala inválido", 400);
    }

    const sala = await this.salaService.getById(salaId);

    res.status(200).json({
      success: true,
      data: sala,
    });
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      cursoId,
      status,
      limit = 20,
      page = 1,
      busca,
      cursoNome,
      liderNome,
    } = req.query;

    const salas = await this.salaService.list({
      cursoId: cursoId ? Number(cursoId) : undefined,
      status: status as string | undefined,
      busca: busca as string | undefined,
      cursoNome: cursoNome as string | undefined,
      liderNome: liderNome as string | undefined,
      limit: Number(limit),
      page: Number(page),
    });

    res.status(200).json({
      success: true,
      count: salas.length,
      data: salas,
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
      perfil
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