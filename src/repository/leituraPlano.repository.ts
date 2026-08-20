import { prisma } from "../lib/prisma";

/**
 * O progresso de cada pessoa no plano de leitura anual.
 *
 * Guarda só os dias LIDOS. Não há linha para "não li" — a ausência é a
 * resposta, e isso evita 365 registros falsos por pessoa.
 */
export class LeituraPlanoRepository {
  /**
   * Os dias que a pessoa marcou num ano.
   *
   * O filtro por prefixo (`2026-`) só funciona porque `dia` é texto no
   * formato `YYYY-MM-DD` — é a mesma propriedade que faz a ordenação
   * alfabética coincidir com a cronológica.
   */
  async listarDoAno(usuarioId: number, ano: number): Promise<string[]> {
    const linhas = await prisma.leituraPlano.findMany({
      where: { usuarioId, dia: { startsWith: `${ano}-` } },
      select: { dia: true },
      orderBy: { dia: "asc" },
    });

    return linhas.map((l) => l.dia);
  }

  /**
   * Marca o dia como lido.
   *
   * `upsert` e não `create`: dois toques rápidos no mesmo dia — ou uma
   * repetição de requisição na rede instável do celular — chegariam como duas
   * chamadas. Com `create`, a segunda estouraria erro de chave única e a tela
   * mostraria falha para uma ação que na verdade deu certo.
   */
  async marcar(usuarioId: number, dia: string): Promise<void> {
    await prisma.leituraPlano.upsert({
      where: { usuarioId_dia: { usuarioId, dia } },
      update: {},
      create: { usuarioId, dia },
    });
  }

  /**
   * Desmarca.
   *
   * `deleteMany` em vez de `delete` pelo mesmo motivo: apagar o que já não
   * existe é o resultado desejado, não um erro. `delete` lançaria P2025.
   */
  async desmarcar(usuarioId: number, dia: string): Promise<void> {
    await prisma.leituraPlano.deleteMany({ where: { usuarioId, dia } });
  }
}
