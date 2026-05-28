// src/controllers/conteudo.controller.ts
import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { ConteudoService } from "../services/conteudo.services";
import {
  CreateConteudoSchema,
  UpdateConteudoSchema,
} from "../validation/conteudo.validation";
import { AppError } from "../utils/AppError";

export class ConteudoController {
  private conteudoService: ConteudoService;

  constructor() {
    this.conteudoService = new ConteudoService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    const validatedData = CreateConteudoSchema.parse(req.body);
    const usuarioId = req.user!.id;

    const conteudo = await this.conteudoService.create(validatedData, usuarioId);

    res.status(201).json({
      success: true,
      message: "Conteúdo criado com sucesso",
      data: conteudo,
    });
  };

  public getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const conteudoId = Number(req.params.id);
    if (isNaN(conteudoId)) {
      throw new AppError("ID do conteúdo inválido", 400);
    }

    const conteudo = await this.conteudoService.getById(conteudoId);

    res.status(200).json({
      success: true,
      data: conteudo,
    });
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    const { tipo, busca, limit, page, orderBy } = req.query;

    const conteudos = await this.conteudoService.list({
      tipo: tipo as string | undefined,
      busca: busca as string | undefined,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      orderBy: orderBy as 'recent' | 'oldest' | undefined,
    });

    res.status(200).json({
      success: true,
      count: conteudos.length,
      data: conteudos,
    });
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    const conteudoId = Number(req.params.id);
    if (isNaN(conteudoId)) {
      throw new AppError("ID do conteúdo inválido", 400);
    }

    const validatedData = UpdateConteudoSchema.parse(req.body);
    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    const conteudo = await this.conteudoService.update(
      conteudoId,
      validatedData,
      usuarioId,
      perfil
    );

    res.status(200).json({
      success: true,
      message: "Conteúdo atualizado com sucesso",
      data: conteudo,
    });
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    const conteudoId = Number(req.params.id);
    if (isNaN(conteudoId)) {
      throw new AppError("ID do conteúdo inválido", 400);
    }

    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    await this.conteudoService.delete(conteudoId, usuarioId, perfil);

    res.status(200).json({
      success: true,
      message: "Conteúdo excluído com sucesso",
    });
  };
}