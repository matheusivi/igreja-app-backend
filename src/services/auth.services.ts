// src/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  UpdateMeDTO,
} from "../dtos/auth.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { AppError } from "../utils/AppError";
import { TokenRevogadoRepository } from "../repository/tokenRevogado.repository";
import { PasswordResetTokenRepository } from "../repository/passwordResetToken.repository";
import { enviarEmailRecuperacaoSenha } from "../lib/email";

export interface TokenPayload {
  id: number;
  perfil: string;
  sexo: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly SALT_ROUNDS = 10;
  private usuarioRepository: UsuarioRepository;
  private tokenRevogadoRepository: TokenRevogadoRepository;
  private passwordResetTokenRepository: PasswordResetTokenRepository;

  constructor(usuarioRepository?: UsuarioRepository) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.tokenRevogadoRepository = new TokenRevogadoRepository();
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET não foi definido no arquivo .env. Isso é uma falha crítica de segurança.",
      );
    }

    // Validação adicional de força do secret
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
    }

    this.JWT_SECRET = process.env.JWT_SECRET;
  }

  public async register(data: RegisterDTO): Promise<AuthResponse> {
    const {
      nomeCompleto,
      email,
      senha,
      dataNascimento,
      sexo,
      estadoCivil,
      profissao,
    } = data;

    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(email);
    if (usuarioExistente) {
      throw new AppError("Este e-mail já está cadastrado no sistema.", 409);
    }

    const senhaHash = await bcrypt.hash(senha, this.SALT_ROUNDS);

    const novoUsuario = await this.usuarioRepository.criar({
      nomeCompleto,
      email,
      senhaHash,
      dataNascimento,
      sexo,
      estadoCivil,
      profissao,
    });

    const token = this.generateToken(
      novoUsuario.id,
      novoUsuario.perfil,
      novoUsuario.sexo ?? "",
    );

    return {
      id: novoUsuario.id,
      nomeCompleto: novoUsuario.nomeCompleto,
      email: novoUsuario.email,
      perfil: novoUsuario.perfil,
      token,
    };
  }

  public async login(data: LoginDTO): Promise<AuthResponse> {
    const { email, senha } = data;

    const usuario = await this.usuarioRepository.buscarPorEmail(email);
    if (!usuario) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const token = this.generateToken(
      usuario.id,
      usuario.perfil,
      usuario.sexo ?? "",
    );

    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      perfil: usuario.perfil,
      token,
    };
  }

  /**
   * Busca usuário por ID SEM retornar a senha
   * Usado pela rota /me e middlewares
   */
  public async getUserById(id: number) {
    const usuario = await this.usuarioRepository.buscarPorId(id);

    if (!usuario) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    return usuario;
  }

  private generateToken(userId: number, perfil: string, sexo: string): string {
    return jwt.sign(
      { id: userId, perfil, sexo },
      this.JWT_SECRET,
      { expiresIn: "24h" }, // Reduzido de 7d para 24h (melhor prática)
    );
  }

  public verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new AppError("Token inválido ou expirado.", 401);
    }
  }

  public async updateMe(usuarioId: number, data: UpdateMeDTO): Promise<object> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    const usuarioAtualizado = await this.usuarioRepository.atualizarDados(
      usuarioId,
      data,
    );

    return usuarioAtualizado;
  }

  public async atualizarPerfil(
    usuarioId: number,
    novoPerfil: string,
  ): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    await this.usuarioRepository.atualizarPerfil(usuarioId, novoPerfil);
  }

  public async logout(token: string): Promise<void> {
    const decoded = this.verifyToken(token);

    // exp vem em segundos no JWT — converter para Date
    const expiraEm = new Date(decoded.exp * 1000);

    await this.tokenRevogadoRepository.revogar(token, expiraEm);
  }

  public async forgotPassword(email: string): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    // não revelar se o e-mail existe ou não — segurança
    if (!usuario) return;

    const token = await this.passwordResetTokenRepository.criar(usuario.id);

    await enviarEmailRecuperacaoSenha(
      usuario.email,
      usuario.nomeCompleto,
      token,
    );
  }

  public async resetPassword(token: string, novaSenha: string): Promise<void> {
    const registro =
      await this.passwordResetTokenRepository.buscarValido(token);

    if (!registro) {
      throw new AppError("Token inválido ou não encontrado.", 400);
    }

    if (registro.usado) {
      throw new AppError("Este token já foi utilizado.", 400);
    }

    if (new Date() > registro.expiraEm) {
      throw new AppError("Token expirado. Solicite um novo link.", 400);
    }

    const senhaHash = await bcrypt.hash(novaSenha, this.SALT_ROUNDS);

    await this.usuarioRepository.atualizarSenha(registro.usuarioId, senhaHash);
    await this.passwordResetTokenRepository.invalidar(token);
  }
}
