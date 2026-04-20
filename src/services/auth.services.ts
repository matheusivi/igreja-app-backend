// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RegisterDTO, LoginDTO, AuthResponse } from '../dtos/auth.dto';
import { UsuarioRepository } from '../repository/usuario.repository';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
  private readonly SALT_ROUNDS = 10;
  private usuarioRepository: UsuarioRepository;

  constructor() {
    this.usuarioRepository = new UsuarioRepository();
  }

  public async register(data: RegisterDTO): Promise<AuthResponse> {
    const { nomeCompleto, email, senha, dataNascimento, estadoCivil, profissao } = data;

    // Verifica se o e-mail já existe
    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(email);
    if (usuarioExistente) {
      throw new Error('Este e-mail já está cadastrado no sistema.');
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, this.SALT_ROUNDS);

    // Cria o usuário
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
      throw new Error('E-mail ou senha inválidos.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new Error('E-mail ou senha inválidos.');
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
   * Busca usuário por ID - Usado pela rota /me
   */
  public async getUserById(id: number) {
    const usuario = await this.usuarioRepository.buscarPorId(id);
    
    if (!usuario) {
      throw new Error('Usuário não encontrado.');
    }

    return usuario;
  }

  private generateToken(userId: number, perfil: string): string {
    return jwt.sign(
      { id: userId, perfil },
      this.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  public verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('Token inválido ou expirado.');
    }
  }
}