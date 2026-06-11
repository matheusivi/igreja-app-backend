// src/controllers/auth.controller.ts
import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { AuthService } from "../services/auth.services";
import type { RegisterDTO, LoginDTO } from "../dtos/auth.dto";
import {
  RegisterSchema,
  LoginSchema,
  UpdateMeSchema,
  AtualizarPerfilSchema,
} from "../validation/auth.validation";
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
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const usuario = await this.authService.getUserById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        id: usuario.id,
        nomeCompleto: usuario.nomeCompleto,
        email: usuario.email,
        perfil: usuario.perfil,
        sexo: usuario.sexo,
        dataNascimento: usuario.dataNascimento,
        exibirAniversario: usuario.exibirAniversario,
        estadoCivil: usuario.estadoCivil,
        fotoUrl: usuario.fotoUrl,
        profissao: usuario.profissao,
      },
    });
  };

  public updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const validatedData = UpdateMeSchema.parse(req.body);
    const usuario = await this.authService.updateMe(req.user.id, validatedData);

    res.status(200).json({
      success: true,
      message: "Perfil atualizado com sucesso",
      data: usuario,
    });
  };

  public atualizarPerfil = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    const usuarioId = Number(req.params.id);
    if (isNaN(usuarioId)) throw new AppError("ID do usuário inválido", 400);

    const { perfil } = AtualizarPerfilSchema.parse(req.body);

    await this.authService.atualizarPerfil(usuarioId, perfil);

    res.status(200).json({
      success: true,
      message: "Perfil do usuário atualizado com sucesso",
    });
  };

  public logout = async (req: AuthRequest, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      throw new AppError("Token não fornecido.", 401);
    }

    await this.authService.logout(token);

    res.status(200).json({
      success: true,
      message: "Logout realizado com sucesso.",
    });
  };
}
