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
        perfil: "Membro", // Regra de negócio: sempre inicia como Membro
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
   * Busca usuário por e-mail
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  /**
   * Busca usuário por ID
   */
  async buscarPorId(id: number): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
    });
  }

  /**
   * Atualiza o perfil de um usuário (usado para promover a Líder ou Pastor)
   */
  async atualizarPerfil(id: number, novoPerfil: string): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { perfil: novoPerfil },
    });
  }
}
