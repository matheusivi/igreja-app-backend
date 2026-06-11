// src/repository/usuario.repository.ts
import type { RegisterDTO } from "../dtos/auth.dto";
import type { Usuario } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

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
        sexo: data.sexo,
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
        sexo: true,
        dataNascimento: true,
        exibirAniversario: true,
        estadoCivil: true,
        fotoUrl: true,
        profissao: true,
        batizado: true,
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

  async atualizarDados(
    id: number,
    data: {
      nomeCompleto?: string | undefined;
      dataNascimento?: string | undefined;
      estadoCivil?: string | undefined;
      profissao?: string | undefined;
      exibirAniversario?: boolean | undefined;
      fotoUrl?: string | undefined;
    },
  ) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nomeCompleto !== undefined && {
          nomeCompleto: data.nomeCompleto,
        }),
        ...(data.dataNascimento !== undefined && {
          dataNascimento: new Date(data.dataNascimento),
        }),
        ...(data.estadoCivil !== undefined && {
          estadoCivil: data.estadoCivil,
        }),
        ...(data.profissao !== undefined && { profissao: data.profissao }),
        ...(data.exibirAniversario !== undefined && {
          exibirAniversario: data.exibirAniversario,
        }),
        ...(data.fotoUrl !== undefined && { fotoUrl: data.fotoUrl }),
      },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        perfil: true,
        sexo: true,
        dataNascimento: true,
        exibirAniversario: true,
        estadoCivil: true,
        fotoUrl: true,
        profissao: true,
      },
    });
  }

  async listar(params: {
    where?: Prisma.UsuarioWhereInput;
    take?: number;
    skip?: number;
  }) {
    return this.prisma.usuario.findMany({
      ...(params.where !== undefined && { where: params.where }),
      select: {
        id: true,
        nomeCompleto: true,
        fotoUrl: true,
        perfil: true,
      },
      orderBy: { nomeCompleto: "asc" },
      ...(params.take !== undefined && { take: params.take }),
      ...(params.skip !== undefined && { skip: params.skip }),
    });
  }

  async contar(where?: Prisma.UsuarioWhereInput): Promise<number> {
    return this.prisma.usuario.count({
      ...(where !== undefined && { where }),
    });
  }

  async buscarAniversariantes(mes: number) {
    return this.prisma.$queryRaw<
      {
        id: number;
        nomeCompleto: string;
        fotoUrl: string | null;
        dia: number;
      }[]
    >`
    SELECT id, "nomeCompleto", "fotoUrl",
           EXTRACT(DAY FROM "dataNascimento")::int AS dia
    FROM usuarios
    WHERE EXTRACT(MONTH FROM "dataNascimento") = ${mes}
      AND "exibirAniversario" = true
      AND "dataNascimento" IS NOT NULL
    ORDER BY dia ASC
  `;
  }

  async marcarBatizado(id: number): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { batizado: true },
    });
  }
}
