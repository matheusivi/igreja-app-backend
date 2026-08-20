import { prisma } from "../lib/prisma";

/** Só existe a linha 1. Ver o comentário do modelo no schema. */
const ID_UNICO = 1;

export class ConfiguracaoRepository {
  /**
   * Lê a configuração, criando-a se ainda não existir.
   *
   * O `upsert` cobre o caso de o banco ter sido criado sem passar pelo
   * `INSERT` da migração — restauração de dump antigo, ambiente novo, teste
   * com base limpa. Sem ele, a Home dependeria de uma linha que "deveria
   * existir", e o dia em que não existisse a tela quebraria por `null`.
   */
  async obter() {
    return prisma.configuracaoIgreja.upsert({
      where: { id: ID_UNICO },
      update: {},
      create: { id: ID_UNICO },
    });
  }

  async atualizar(data: {
    heroImagemUrl?: string | null | undefined;
    versiculoHome?: string | null | undefined;
  }) {
    return prisma.configuracaoIgreja.upsert({
      where: { id: ID_UNICO },
      // `!== undefined` e não truthiness: `null` é um valor legítimo aqui —
      // é assim que se REMOVE a capa e o hero volta ao emblema.
      update: {
        ...(data.heroImagemUrl !== undefined && { heroImagemUrl: data.heroImagemUrl }),
        ...(data.versiculoHome !== undefined && { versiculoHome: data.versiculoHome }),
      },
      create: {
        id: ID_UNICO,
        heroImagemUrl: data.heroImagemUrl ?? null,
        versiculoHome: data.versiculoHome ?? null,
      },
    });
  }
}
