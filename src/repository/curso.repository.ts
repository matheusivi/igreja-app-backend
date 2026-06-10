import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

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
  async criar(data: Prisma.CursoCreateInput) {
    return prisma.curso.create({
      data,
      include: includeCriador,
    });
  }

  async buscarPorId(id: number) {
    return prisma.curso.findUnique({
      where: { id },
      include: includeCriador,
    });
  }

  async buscarParaPermissao(id: number) {
    return prisma.curso.findUnique({
      where: { id },
      select: {
        id: true,
        criadorUsuarioId: true,
      },
    });
  }

  // novo método
  async contarAlunosAtivos(cursoId: number): Promise<number> {
    return prisma.usuarioSala.count({
      where: {
        sala: { cursoId },
        status: 'ativo',
      },
    });
  }

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

  async atualizar(id: number, data: Prisma.CursoUpdateInput) {
    return prisma.curso.update({
      where: { id },
      data,
      include: includeCriador,
    });
  }

  async contar(where?: Prisma.CursoWhereInput): Promise<number> {
  return prisma.curso.count({
    ...(where !== undefined && { where }),
  });
}

  async deletar(id: number) {
    return prisma.curso.delete({
      where: { id },
    });
  }
}