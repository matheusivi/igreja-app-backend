// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RegisterDTO, LoginDTO, AuthResponse } from '../dtos/auth.dto';
import { UsuarioRepository } from '../repository/usuario.repository';
import { AppError } from '../utils/AppError';
import { Perfis } from '../constants/perfis';

export interface TokenPayload {
  id: number;
  perfil: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly SALT_ROUNDS = 10;
  private usuarioRepository: UsuarioRepository;

  constructor(usuarioRepository?: UsuarioRepository) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();

    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET não foi definido no arquivo .env. Isso é uma falha crítica de segurança.'
      );
    }

    // Validação adicional de força do secret
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');
    }

    this.JWT_SECRET = process.env.JWT_SECRET;
  }

  public async register(data: RegisterDTO): Promise<AuthResponse> {
    const { nomeCompleto, email, senha, dataNascimento, estadoCivil, profissao } = data;

    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(email);
    if (usuarioExistente) {
      throw new AppError('Este e-mail já está cadastrado no sistema.', 409);
    }

    const senhaHash = await bcrypt.hash(senha, this.SALT_ROUNDS);

    const novoUsuario = await this.usuarioRepository.criar({
      nomeCompleto,
      email,
      senhaHash,
      dataNascimento,
      estadoCivil,
      profissao,
    });

    const token = this.generateToken(novoUsuario.id, novoUsuario.perfil);

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
      throw new AppError('E-mail ou senha inválidos.', 401);
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError('E-mail ou senha inválidos.', 401);
    }

    const token = this.generateToken(usuario.id, usuario.perfil);

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
      throw new AppError('Usuário não encontrado.', 404);
    }

    return usuario;
  }

  private generateToken(userId: number, perfil: string): string {
    return jwt.sign(
      { id: userId, perfil },
      this.JWT_SECRET,
      { expiresIn: '24h' }        // Reduzido de 7d para 24h (melhor prática)
    );
  }

  public verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new AppError('Token inválido ou expirado.', 401);
    }
  }
}