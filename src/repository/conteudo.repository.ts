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
    // Aceita lista para ordenar por destaque e depois por data.
    orderBy?:
      | Prisma.ConteudoOrderByWithRelationInput
      | Prisma.ConteudoOrderByWithRelationInput[];
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
   * Tira o destaque dos demais conteúdos do mesmo tipo.
   *
   * Um destaque por tipo: um Aviso em destaque e um Devocional em destaque
   * podem coexistir, dois Avisos não.
   */
  async limparPrincipais(tipo: string, excetoId?: number) {
    return prisma.conteudo.updateMany({
      where: {
        tipo,
        principal: true,
        ...(excetoId !== undefined ? { id: { not: excetoId } } : {}),
      },
      data: { principal: false },
    });
  }

  /**
   * O destaque atual de um tipo, se houver.
   *
   * Só os dois campos que decidem se ele ainda vale. Trazer o conteúdo
   * inteiro — com blocos, texto e autor — para ler duas datas seria carregar
   * um post completo a cada listagem.
   */
  async buscarPrincipal(tipo: string) {
    return prisma.conteudo.findFirst({
      where: { tipo, principal: true },
      select: { id: true, dataPublicacao: true, dataValidade: true },
    });
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