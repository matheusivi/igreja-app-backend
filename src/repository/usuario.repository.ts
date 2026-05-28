// src/repository/usuario.repository.ts
import type { RegisterDTO } from "../dtos/auth.dto";
import type { Usuario } from "@prisma/client";
import { prisma } from "../lib/prisma";

export class UsuarioRepository {
  private prisma = prisma;

  /**
   * Cria um novo usuário (sempre como Membro)
   */
  async criar(
    data: Omit<RegisterDTO, "senha"> & { senhaHash: string },
  ): Promise<Usuario> {
    return this.prisma.usuario.create({
      data: {
        nomeCompleto: data.nomeCompleto,
        email: data.email,
        senha: data.senhaHash,
        perfil: "Membro",
        dataNascimento: data.dataNascimento
          ? new Date(data.dataNascimento)
          : null,
        estadoCivil: data.estadoCivil || null,
        profissao: data.profissao || null,
        exibirAniversario: true,
      },
    });
  }

  /**
   * Busca usuário por e-mail (usado no login e registro)
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  /**
   * Busca usuário por ID SEM retornar a senha (versão segura)
   * Usado em /me, middlewares e qualquer lugar que retorne dados do usuário
   */
  async buscarPorId(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        perfil: true,
        dataNascimento: true,
        exibirAniversario: true,
        estadoCivil: true,
        fotoUrl: true,
        profissao: true,
      },
    });
  }

  /**
   * Atualiza o perfil de um usuário (usado para promover Líder ou Pastor)
   */
  async atualizarPerfil(id: number, novoPerfil: string): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { perfil: novoPerfil },
    });
  }
}