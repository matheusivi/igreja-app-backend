import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

const includeAutor = {
  autor: {
    select: {
      id: true,
      nomeCompleto: true,
      perfil: true,
    },
  },
} satisfies Prisma.PedidoOracaoInclude;

export class PedidoOracaoRepository {
  async criar(data: Prisma.PedidoOracaoCreateInput) {
    return prisma.pedidoOracao.create({
      data,
      include: includeAutor,
    });
  }

  async buscarPorId(id: number) {
    return prisma.pedidoOracao.findUnique({
      where: { id },
      include: includeAutor,
    });
  }

  async buscarParaPermissao(
    id: number,
  ): Promise<{ id: number; autorUsuarioId: number } | null> {
    return prisma.pedidoOracao.findUnique({
      where: { id },
      select: {
        id: true,
        autorUsuarioId: true,
      },
    });
  }

  async listar(params: {
    where?: Prisma.PedidoOracaoWhereInput;
    orderBy?: Prisma.PedidoOracaoOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }) {
    return prisma.pedidoOracao.findMany({
      ...(params.where !== undefined && { where: params.where }),
      ...(params.orderBy !== undefined && { orderBy: params.orderBy }),
      ...(params.take !== undefined && { take: params.take }),
      ...(params.skip !== undefined && { skip: params.skip }),
      include: includeAutor,
    });
  }

  async atualizar(id: number, descricaoPedido: string) {
    return prisma.pedidoOracao.update({
      where: { id },
      data: { descricaoPedido },
      include: includeAutor,
    });
  }

  async contar(where?: Prisma.PedidoOracaoWhereInput): Promise<number> {
    return prisma.pedidoOracao.count({
      ...(where !== undefined && { where }),
    });
  }

  async deletar(id: number) {
    return prisma.pedidoOracao.delete({
      where: { id },
    });
  }
}
