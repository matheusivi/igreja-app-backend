// src/controllers/auth.controller.ts
import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { AuthService } from "../services/auth.services";
import {
  RegisterSchema,
  LoginSchema,
  UpdateMeSchema,
  AtualizarPerfilSchema,
  ExcluirContaSchema,
} from "../validation/auth.validation";
import { AppError } from "../utils/AppError";
import {
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../validation/auth.validation";

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

  /**
   * Exclusão da própria conta. Sempre a própria: o id vem do token, nunca do
   * pedido. Não existe forma de apagar a conta de outra pessoa por esta rota,
   * nem para a liderança.
   */
  public deleteMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { senha } = ExcluirContaSchema.parse(req.body);
    await this.authService.excluirConta(req.user.id, senha);

    res.status(200).json({
      success: true,
      message: "Sua conta foi excluída.",
    });
  };

  public getCurrentUser = async (
    req: AuthRequest,
    res: Response,
  ): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const usuario = await this.authService.getUserById(req.user.id);

    /**
     * ═══ SEM ESCOLHER CAMPO A CAMPO ═══
     * Aqui havia uma lista escrita à mão, e ela tinha ficado para trás:
     * faltavam `telefone`, `especializacao` e `divulgarTrabalho`. O
     * repositório buscava os três do banco e o controller os jogava fora.
     *
     * O efeito no app era o de dado que não salva — a pessoa preenchia o
     * telefone, via a confirmação, fechava o app, reabria e o campo estava
     * vazio. Nada se perdia: o servidor apenas não contava aquele pedaço
     * quando era perguntado de novo.
     *
     * `buscarPorId` já usa um `select` fechado — sem senha, sem token de
     * recuperação — então repassar o resultado é seguro E não pode ficar
     * desatualizado: campo novo no `select` chega ao app sozinho.
     */
    res.status(200).json({ success: true, data: usuario });
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
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const usuarioId = Number(req.params.id);
    if (isNaN(usuarioId)) throw new AppError("ID do usuário inválido", 400);

    const { perfil } = AtualizarPerfilSchema.parse(req.body);

    // O id de quem pede vem do TOKEN, nunca do corpo: é o que impede alguém
    // de se passar por outro para driblar a trava de "não altere a si mesmo".
    await this.authService.atualizarPerfil(usuarioId, perfil, req.user.id);

    res.status(200).json({
      success: true,
      message:
        perfil === "Líder"
          ? "Agora esta pessoa é líder."
          : "Esta pessoa deixou de ser líder.",
    });
  };

  public forgotPassword = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const { email } = ForgotPasswordSchema.parse(req.body);

    await this.authService.forgotPassword(email);

    // sempre retorna 200 — não revelar se o e-mail existe
    res.status(200).json({
      success: true,
      message:
        "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
    });
  };

  public resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, novaSenha } = ResetPasswordSchema.parse(req.body);

    await this.authService.resetPassword(token, novaSenha);

    res.status(200).json({
      success: true,
      message: "Senha redefinida com sucesso.",
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
