// src/repository/salaCurso.repository.ts
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Curso + líder + contagem de matrículas ativas.
 *
 * O `_count` é filtrado por status "ativo" de propósito: quem cancelou ou
 * desistiu não ocupa vaga, então contar todas as linhas daria uma lotação
 * falsa e bloquearia turmas que na verdade têm lugar.
 */
const includeCompleto = {
  curso: {
    select: {
      id: true,
      nome: true,
    },
  },
  lider: {
    select: {
      id: true,
      nomeCompleto: true,
      fotoUrl: true,
    },
  },
  _count: {
    select: {
      participantes: { where: { status: "ativo" } },
    },
  },
} satisfies Prisma.SalaCursoInclude;

const includeCursoComCategoria = {
  ...includeCompleto,
  curso: {
    select: {
      id: true,
      nome: true,
      categoria: true,
    },
  },
} satisfies Prisma.SalaCursoInclude;

const includeCursoParaPermissao = {
  curso: {
    select: {
      criadorUsuarioId: true,
    },
  },
} satisfies Prisma.SalaCursoInclude;

export class SalaCursoRepository {
  /**
   * Cria uma nova sala
   */
  async criar(data: Prisma.SalaCursoCreateInput) {
    return prisma.salaCurso.create({
      data,
      include: includeCompleto,
    });
  }

  /**
   * Busca uma sala por ID com dados do curso
   */
  async buscarPorId(id: number) {
    return prisma.salaCurso.findUnique({
      where: { id },
      include: includeCompleto,
    });
  }

  async buscarPorIdComCategoria(id: number) {
    return prisma.salaCurso.findUnique({
      where: { id },
      include: includeCursoComCategoria,
    });
  }

  /**
   * Busca para verificação de permissão
   */
  async buscarParaPermissao(id: number) {
    return prisma.salaCurso.findUnique({
      where: { id },
      include: includeCursoParaPermissao,
    });
  }

  /**
   * Verifica se um curso existe
   */
  async cursoExiste(cursoId: number) {
    return prisma.curso.findUnique({
      where: { id: cursoId },
    });
  }

  /**
   * Lista salas com filtros tipados
   */
  async listar(params: {
    where?: Prisma.SalaCursoWhereInput;
    orderBy?: Prisma.SalaCursoOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }) {
    const query: Prisma.SalaCursoFindManyArgs = {
      include: includeCompleto,
    };

    if (params.where) query.where = params.where;
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.take !== undefined) query.take = params.take;
    if (params.skip !== undefined) query.skip = params.skip;

    return prisma.salaCurso.findMany(query);
  }

  async contar(where?: Prisma.SalaCursoWhereInput): Promise<number> {
    return prisma.salaCurso.count({
      ...(where !== undefined && { where }),
    });
  }

  /**
   * Atualiza uma sala
   */
  async atualizar(id: number, data: Prisma.SalaCursoUpdateInput) {
    return prisma.salaCurso.update({
      where: { id },
      data,
      include: includeCompleto,
    });
  }

  /**
   * Deleta uma sala por ID
   */
  async deletar(id: number) {
    return prisma.salaCurso.delete({
      where: { id },
    });
  }
}
