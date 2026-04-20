import type { Request, Response } from "express";
import { AuthService } from "../services/auth.services";
import type { RegisterDTO, LoginDTO } from "../dtos/auth.dto";
import type { AuthRequest } from "../middlewares/auth.middleware";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RegisterDTO = req.body;
      const result = await this.authService.register(data);

      res.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: LoginDTO = req.body;
      const result = await this.authService.login(data);

      res.status(200).json({
        success: true,
        message: "Login realizado com sucesso",
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    }
  };

  /**
   * Retorna os dados do usuário atualmente logado
   * Rota: GET /api/auth/me
   * Usada para testar o middleware de autenticação
   */
  public getCurrentUser = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Usuário não autenticado",
        });
        return;
      }

      const usuario = await this.authService.getUserById(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          id: usuario.id,
          nomeCompleto: usuario.nomeCompleto,
          email: usuario.email,
          perfil: usuario.perfil,
          profissao: usuario.profissao,
          exibirAniversario: usuario.exibirAniversario,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Erro ao buscar informações do usuário logado",
        error: error.message,
      });
    }
  };
}
