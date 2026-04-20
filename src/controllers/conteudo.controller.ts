import type { Response } from "express";
import type {
  CreateConteudoDTO,
  UpdateConteudoDTO,
} from "../dtos/conteudo.dto";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { ConteudoService } from "../services/conteudo.services";
import {
  CreateConteudoSchema,
  UpdateConteudoSchema,
} from "../validations/conteudo.schema";

export class ConteudoController {
  private conteudoService: ConteudoService;

  constructor() {
    this.conteudoService = new ConteudoService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validação com Zod
      const validatedData = CreateConteudoSchema.parse(req.body);

      const usuarioId = req.user!.id;
      const conteudo = await this.conteudoService.create(
        validatedData,
        usuarioId,
      );

      res.status(201).json({
        success: true,
        message: "Conteúdo criado com sucesso",
        data: conteudo,
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
        message: error.message || "Erro ao criar conteúdo",
      });
    }
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        tipo,
        limit = 20,
        busca,
        orderBy = "recent",
        page = 1,
      } = req.query;

      const conteudos = await this.conteudoService.list({
        ...(tipo ? { tipo: String(tipo) } : {}),
        ...(busca ? { busca: String(busca) } : {}),
        limit: Number(limit),
        page: Number(page),
        orderBy: orderBy as "recent" | "oldest",
      });

      res.status(200).json({
        success: true,
        count: conteudos.length,
        data: conteudos,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Erro ao listar conteúdos",
      });
    }
  };

  public update = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const conteudoId = Number(req.params.id);
      const validatedData = UpdateConteudoSchema.parse(req.body);
      const usuarioId = req.user!.id;
      const perfil = req.user!.perfil;

      const conteudo = await this.conteudoService.update(
        conteudoId,
        validatedData,
        usuarioId,
        perfil,
      );

      res.status(200).json({
        success: true,
        message: "Conteúdo atualizado com sucesso",
        data: conteudo,
      });
    } catch (error: any) {
      let status = 500;
      if (error.message?.includes("não encontrado")) status = 404;
      else if (error.message?.includes("permissão")) status = 403;

      res.status(status).json({
        success: false,
        message: status === 500 ? "Erro ao atualizar conteúdo" : error.message,
      });
    }
  };

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const conteudoId = Number(req.params.id);
      const usuarioId = req.user!.id;
      const perfil = req.user!.perfil;

      await this.conteudoService.delete(conteudoId, usuarioId, perfil);

      res.status(200).json({
        success: true,
        message: "Conteúdo excluído com sucesso",
      });
    } catch (error: any) {
      let status = 500;
      if (error.message?.includes("não encontrado")) status = 404;
      else if (error.message?.includes("permissão")) status = 403;

      res.status(status).json({
        success: false,
        message: status === 500 ? "Erro ao deletar conteúdo" : error.message,
      });
    }
  };
}
