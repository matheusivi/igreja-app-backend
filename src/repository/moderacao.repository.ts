import { prisma } from "../lib/prisma";

/**
 * Denúncias e bloqueios do mural de oração.
 *
 * As duas coisas moram juntas porque respondem à mesma situação por caminhos
 * diferentes: **denunciar** pede que alguém olhe; **bloquear** resolve na hora,
 * sem depender de ninguém.
 *
 * A separação importa. Quem foi ofendido não deveria ter que esperar a
 * liderança acordar para parar de ver o que a ofendeu.
 */
export class ModeracaoRepository {
  /**
   * Registra a denúncia. Repetir a mesma não cria uma segunda.
   *
   * `upsert` em vez de `create` por causa do toque duplo: a tela pinta o botão
   * como usado antes da resposta chegar, e no 4G da igreja a requisição se
   * repete. Sem isto, a segunda tentativa devolveria erro de chave duplicada —
   * e a pessoa veria uma falha por ter denunciado direito.
   */
  async denunciar(params: {
    tipo: string;
    alvoId: number;
    denuncianteId: number;
    motivo: string;
  }) {
    return prisma.denuncia.upsert({
      where: {
        tipo_alvoId_denuncianteId: {
          tipo: params.tipo,
          alvoId: params.alvoId,
          denuncianteId: params.denuncianteId,
        },
      },
      // Já denunciou antes: o motivo novo substitui, e a denúncia volta para a
      // fila. Se a pessoa denunciou de novo, é porque continua incomodando.
      update: { motivo: params.motivo, resolvidaEm: null },
      create: params,
    });
  }

  /** O que a liderança ainda não olhou, mais antigas primeiro. */
  async listarPendentes(take: number, skip: number) {
    return prisma.denuncia.findMany({
      where: { resolvidaEm: null },
      orderBy: { criadaEm: "asc" },
      take,
      skip,
      include: {
        denunciante: { select: { id: true, nomeCompleto: true } },
      },
    });
  }

  async contarPendentes(): Promise<number> {
    return prisma.denuncia.count({ where: { resolvidaEm: null } });
  }

  /**
   * O texto denunciado, para a liderança poder julgar.
   *
   * ═══ POR QUE NÃO É UM `include` NA CONSULTA ACIMA ═══
   * `Denuncia` não tem relação com `PedidoOracao` no schema — ela guarda um
   * `tipo` e um `alvoId` soltos, porque um dia pode apontar para devocional ou
   * comentário. Relação polimórfica é o preço dessa flexibilidade, e o Prisma
   * não sabe seguir.
   *
   * Então busca-se em lote, com um `in`, e o serviço junta. É UMA consulta a
   * mais por página de denúncias — não uma por denúncia.
   */
  async buscarPedidosPorIds(ids: number[]) {
    if (ids.length === 0) return [];
    return prisma.pedidoOracao.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        descricaoPedido: true,
        dataEnvio: true,
        autor: { select: { id: true, nomeCompleto: true, perfil: true } },
      },
    });
  }

  async marcarResolvida(id: number) {
    return prisma.denuncia.update({
      where: { id },
      data: { resolvidaEm: new Date() },
    });
  }

  /**
   * Bloqueia. Repetir não dá erro — o mesmo motivo do `upsert` acima.
   */
  async bloquear(bloqueadorId: number, bloqueadoId: number) {
    return prisma.bloqueio.upsert({
      where: {
        bloqueadorId_bloqueadoId: { bloqueadorId, bloqueadoId },
      },
      update: {},
      create: { bloqueadorId, bloqueadoId },
    });
  }

  async desbloquear(bloqueadorId: number, bloqueadoId: number) {
    await prisma.bloqueio.deleteMany({
      where: { bloqueadorId, bloqueadoId },
    });
  }

  /**
   * Os ids que esta pessoa bloqueou.
   *
   * Devolve só os números porque quem chama vai usá-los num `notIn` da consulta
   * do mural. Trazer nome e foto aqui seria carregar dados para descartar.
   */
  async idsBloqueadosPor(bloqueadorId: number): Promise<number[]> {
    const linhas = await prisma.bloqueio.findMany({
      where: { bloqueadorId },
      select: { bloqueadoId: true },
    });
    return linhas.map((l) => l.bloqueadoId);
  }

  /** Para a tela de gerenciar bloqueios, onde nome e foto são necessários. */
  async listarBloqueados(bloqueadorId: number) {
    return prisma.bloqueio.findMany({
      where: { bloqueadorId },
      orderBy: { criadoEm: "desc" },
      select: {
        criadoEm: true,
        bloqueado: {
          select: { id: true, nomeCompleto: true, fotoUrl: true },
        },
      },
    });
  }
}
