import type { Response } from "express";
import { CursoService } from "../services/curso.services";
import type { AuthRequest } from "../middlewares/auth.middleware";
import {
  CreateCursoSchema,
  UpdateCursoSchema,
} from "../validations/curso.validation";

export class CursoController {
  private cursoService: CursoService;

  constructor() {
    this.cursoService = new CursoService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validação com Zod
      const validatedData = CreateCursoSchema.parse(req.body);

      const usuarioId = req.user!.id;

      const curso = await this.cursoService.create(validatedData, usuarioId);

      res.status(201).json({
        success: true,
        message: "Curso criado com sucesso",
        data: curso,
      });
    } catch (error: any) {
      // Tratamento específico para erros de validação do Zod
      if (error.errors) {
        res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.errors.map((err: any) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      // Outros erros (ex: usuário não encontrado, etc.)
      res.status(400).json({
        success: false,
        message: error.message || "Erro ao criar curso",
      });
    }
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Erro ao listar cursos",
      });
    }
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cursoId = Number(req.params.id);
      if (isNaN(cursoId)) {
        res
          .status(400)
          .json({ success: false, message: "ID do curso inválido" });
        return;
      }

      const validatedData = UpdateCursoSchema.parse(req.body);

      const usuarioId = req.user!.id;
      const perfil = req.user!.perfil;

      const curso = await this.cursoService.update(
        cursoId,
        validatedData,
        usuarioId,
        perfil,
      );

      res.status(200).json({
        success: true,
        message: "Curso atualizado com sucesso",
        data: curso,
      });
    } catch (error: any) {
      if (error.errors) {
        res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.errors.map((err: any) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }

      let status = 500;
      if (error.message?.includes("não encontrado")) status = 404;
      else if (error.message?.includes("permissão")) status = 403;

      res.status(status).json({
        success: false,
        message: status === 500 ? "Erro ao atualizar curso" : error.message,
      });
    }
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cursoId = Number(req.params.id);
      const usuarioId = req.user!.id;
      const perfil = req.user!.perfil;

      await this.cursoService.delete(cursoId, usuarioId, perfil);

      res.status(200).json({
        success: true,
        message: "Curso deletado com sucesso",
      });
    } catch (error: any) {
      let status = 500;
      if (error.message?.includes("não encontrado")) status = 404;
      else if (error.message?.includes("permissão")) status = 403;

      res.status(status).json({
        success: false,
        message: status === 500 ? "Erro ao deletar curso" : error.message,
      });
    }
  };
}
