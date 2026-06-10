// src/repository/conteudo.repository.ts
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

// Select padrão para incluir dados do autor
const includeAutor = {
  usuario: {
    select: {
      id: true,
      nomeCompleto: true,
      perfil: true,
    },
  },
} satisfies Prisma.ConteudoInclude;

export class ConteudoRepository {
  /**
   * Cria um novo conteúdo
   */
  async criar(data: Prisma.ConteudoCreateInput) {
    return prisma.conteudo.create({
      data,
      include: includeAutor,
    });
  }

  /**
   * Busca um conteúdo por ID com dados do autor
   */
  async buscarPorId(id: number) {
    return prisma.conteudo.findUnique({
      where: { id },
      include: includeAutor,
    });
  }

  /**
   * Busca apenas dados necessários para permissão
   */
  async buscarParaPermissao(id: number) {
    return prisma.conteudo.findUnique({
      where: { id },
      select: {
        id: true,
        usuarioId: true,
      },
    });
  }

  /**
   * Lista conteúdos com filtros tipados
   */
  async listar(params: {
    where?: Prisma.ConteudoWhereInput;
    orderBy?: Prisma.ConteudoOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }) {
    const query: Prisma.ConteudoFindManyArgs = {
      include: includeAutor,
    };

    if (params.where) query.where = params.where;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.take !== undefined) query.take = params.take;
    if (params.skip !== undefined) query.skip = params.skip;

    return prisma.conteudo.findMany(query);
  }

  /**
   * Atualiza um conteúdo
   */
  async atualizar(id: number, data: Prisma.ConteudoUpdateInput) {
    return prisma.conteudo.update({
      where: { id },
      data,
      include: includeAutor,
    });
  }

  async contar(where?: Prisma.ConteudoWhereInput): Promise<number> {
  return prisma.conteudo.count({
    ...(where !== undefined && { where }),
  });
}

  /**
   * Deleta um conteúdo por ID
   */
  async deletar(id: number) {
    return prisma.conteudo.delete({
      where: { id },
    });
  }
}