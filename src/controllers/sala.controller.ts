import type { Response } from "express";
import { SalaService } from "../services/sala.services";
import type { AuthRequest } from "../middlewares/auth.middleware";
import {
  CreateSalaSchema,
  UpdateSalaSchema,
} from "../validations/curso.validation";
import type { CreateSalaDTO, UpdateSalaDTO } from "../dtos/curso.dto";

export class SalaController {
  private salaService: SalaService;

  constructor() {
    this.salaService = new SalaService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const cursoId = Number(req.params.cursoId);

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

      res.status(400).json({
        success: false,
        message: error.message || "Erro ao criar sala",
      });
    }
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
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
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Erro ao listar salas",
      });
    }
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const salaId = Number(req.params.id);
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
        message: status === 500 ? "Erro ao atualizar sala" : error.message,
      });
    }
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const salaId = Number(req.params.id);
      const usuarioId = req.user!.id;
      const perfil = req.user!.perfil;

      await this.salaService.delete(salaId, usuarioId, perfil);

      res.status(200).json({
        success: true,
        message: "Sala Excluido com sucesso",
      });
    } catch (error: any) {
      let status = 500;
      if (error.message?.includes("não encontrado")) status = 404;
      else if (error.message?.includes("permissão")) status = 403;

      res.status(status).json({
        success: false,
        message: status === 500 ? "Erro ao excluir sala" : error.message,
      });
    }
  };
}
