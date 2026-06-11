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
} satisfies Prisma.EventoInclude;

export class EventoRepository {
  async criar(data: Prisma.EventoCreateInput) {
    return prisma.evento.create({
      data,
      include: includeCriador,
    });
  }

  async buscarPorId(id: number) {
    return prisma.evento.findUnique({
      where: { id },
      include: includeCriador,
    });
  }

  async buscarParaPermissao(
    id: number,
  ): Promise<{ id: number; criadorId: number } | null> {
    return prisma.evento.findUnique({
      where: { id },
      select: { id: true, criadorId: true },
    });
  }

  async listarPorMesAno(mes: number, ano: number) {
    const dataInicioPeriodo = new Date(ano, mes - 1, 1);
    const dataFimPeriodo = new Date(ano, mes, 0, 23, 59, 59);

    return prisma.evento.findMany({
      where: {
        OR: [
          // eventos individuais no período
          {
            recorrencia: "nenhuma",
            dataInicio: {
              gte: dataInicioPeriodo,
              lte: dataFimPeriodo,
            },
          },
          // eventos recorrentes que ainda estão ativos
          {
            recorrencia: { not: "nenhuma" },
            dataInicio: { lte: dataFimPeriodo },
            OR: [
              { dataFimRecorrencia: null },
              { dataFimRecorrencia: { gte: dataInicioPeriodo } },
            ],
          },
        ],
      },
      include: includeCriador,
      orderBy: { dataInicio: "asc" },
    });
  }

  async atualizar(id: number, data: Prisma.EventoUpdateInput) {
    return prisma.evento.update({
      where: { id },
      data,
      include: includeCriador,
    });
  }

  async deletar(id: number) {
    return prisma.evento.delete({ where: { id } });
  }
}
