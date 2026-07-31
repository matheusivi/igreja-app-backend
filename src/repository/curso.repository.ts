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
  capitulos: {
    select: { id: true, ordem: true, titulo: true, secao: true },
    orderBy: { ordem: "asc" },
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

  /**
   * Troca a ementa inteira do curso.
   *
   * Apaga e recria em vez de fazer diff: a ementa é curta (10 a 19 itens) e
   * a ordem importa. Casar item a item para descobrir o que mudou seria mais
   * código e mais chance de deixar a numeração furada.
   */
  async substituirCapitulos(
    cursoId: number,
    // `| undefined` explícito por causa do `exactOptionalPropertyTypes` do
    // tsconfig: com ele ligado, `secao?: string | null` recusa um objeto que
    // traz `secao: undefined`, e é exatamente isso que o DTO produz.
    capitulos: {
      ordem: number;
      titulo: string;
      secao?: string | null | undefined;
    }[],
  ) {
    return prisma.$transaction([
      prisma.capituloCurso.deleteMany({ where: { cursoId } }),
      prisma.capituloCurso.createMany({
        data: capitulos.map((c) => ({
          cursoId,
          ordem: c.ordem,
          titulo: c.titulo,
          secao: c.secao ?? null,
        })),
      }),
    ]);
  }

  /**
   * Toda matrícula já registrada no curso, de qualquer status.
   *
   * É o que diz se existe histórico a perder: alguém que concluiu conta tanto
   * quanto alguém que está cursando agora.
   */
  async contarMatriculas(cursoId: number): Promise<number> {
    return prisma.usuarioSala.count({
      where: { sala: { cursoId } },
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