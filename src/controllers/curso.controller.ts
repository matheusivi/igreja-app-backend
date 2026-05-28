// src/controllers/curso.controller.ts
import type { Response } from "express";
import { CursoService } from "../services/curso.services";
import type { AuthRequest } from "../middlewares/auth.middleware";
import {
  CreateCursoSchema,
  UpdateCursoSchema,
} from "../validation/curso.validation";
import { AppError } from "../utils/AppError";

export class CursoController {
  private cursoService: CursoService;

  constructor() {
    this.cursoService = new CursoService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    const validatedData = CreateCursoSchema.parse(req.body);
    const usuarioId = req.user!.id;

    const curso = await this.cursoService.create(validatedData, usuarioId);

    res.status(201).json({
      success: true,
      message: "Curso criado com sucesso",
      data: curso,
    });
  };

  public getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const cursoId = Number(req.params.id);
    if (isNaN(cursoId)) {
      throw new AppError("ID do curso inválido", 400);
    }

    const curso = await this.cursoService.getById(cursoId);

    res.status(200).json({
      success: true,
      data: curso,
    });
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    const {
      categoria,
      busca,
      limit = 20,
      page = 1,
      orderBy = "recent",
    } = req.query;

    const cursos = await this.cursoService.list({
      ...(categoria ? { categoria: String(categoria) } : {}),
      ...(busca ? { busca: String(busca) } : {}),
      limit: Number(limit),
      page: Number(page),
      orderBy: orderBy as "recent" | "oldest",
    });

    res.status(200).json({
      success: true,
      count: cursos.length,
      data: cursos,
    });
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    const cursoId = Number(req.params.id);
    if (isNaN(cursoId)) {
      throw new AppError("ID do curso inválido", 400);
    }

    const validatedData = UpdateCursoSchema.parse(req.body);
    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    const curso = await this.cursoService.update(
      cursoId,
      validatedData,
      usuarioId,
      perfil
    );

    res.status(200).json({
      success: true,
      message: "Curso atualizado com sucesso",
      data: curso,
    });
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    const cursoId = Number(req.params.id);
    if (isNaN(cursoId)) {
      throw new AppError("ID do curso inválido", 400);
    }

    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    await this.cursoService.delete(cursoId, usuarioId, perfil);

    res.status(200).json({
      success: true,
      message: "Curso deletado com sucesso",
    });
  };
}