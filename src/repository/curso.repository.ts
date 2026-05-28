// src/repository/curso.repository.ts
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

// Select padrão para incluir dados do criador
const includeCriador = {
  criador: {
    select: {
      id: true,
      nomeCompleto: true,
      perfil: true,
    },
  },
} satisfies Prisma.CursoInclude;

export class CursoRepository {
  /**
   * Cria um novo curso
   */
  async criar(data: Prisma.CursoCreateInput) {
    return prisma.curso.create({
      data,
      include: includeCriador,
    });
  }

  /**
   * Busca um curso por ID com dados do criador
   */
  async buscarPorId(id: number) {
    return prisma.curso.findUnique({
      where: { id },
      include: includeCriador,
    });
  }

  /**
   * Busca apenas dados necessários para permissão
   */
  async buscarParaPermissao(id: number) {
    return prisma.curso.findUnique({
      where: { id },
      select: {
        id: true,
        criadorUsuarioId: true,
      },
    });
  }

  /**
   * Lista cursos com filtros tipados
   */
  async listar(params: {
    where?: Prisma.CursoWhereInput;
    orderBy?: Prisma.CursoOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }) {
    const query: Prisma.CursoFindManyArgs = {
      include: includeCriador,
    };

    if (params.where) query.where = params.where;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.take !== undefined) query.take = params.take;
    if (params.skip !== undefined) query.skip = params.skip;

    return prisma.curso.findMany(query);
  }

  /**
   * Atualiza um curso
   */
  async atualizar(id: number, data: Prisma.CursoUpdateInput) {
    return prisma.curso.update({
      where: { id },
      data,
      include: includeCriador,
    });
  }

  /**
   * Deleta um curso por ID
   */
  async deletar(id: number) {
    return prisma.curso.delete({
      where: { id },
    });
  }
}