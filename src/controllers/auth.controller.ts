// src/controllers/auth.controller.ts
import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { AuthService } from "../services/auth.services";
import type { RegisterDTO, LoginDTO } from "../dtos/auth.dto";
import { RegisterSchema, LoginSchema } from "../validation/auth.validation";
import { AppError } from "../utils/AppError";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  public register = async (req: Request, res: Response): Promise<void> => {
    const validatedData = RegisterSchema.parse(req.body);
    const result = await this.authService.register(validatedData);

    res.status(201).json({
      success: true,
      message: "Usuário cadastrado com sucesso",
      data: result,
    });
  };

  public login = async (req: Request, res: Response): Promise<void> => {
    const validatedData = LoginSchema.parse(req.body);
    const result = await this.authService.login(validatedData);

    res.status(200).json({
      success: true,
      message: "Login realizado com sucesso",
      data: result,
    });
  };

  public getCurrentUser = async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    if (!req.user) {
      throw new AppError("Usuário não autenticado", 401);
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
  };
}