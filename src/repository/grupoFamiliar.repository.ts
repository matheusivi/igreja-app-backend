import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const includeMembros = {
    membros: {
        include: {
            usuario: {
                select: {
                    id: true,
                    nomeCompleto: true,
                    perfil: true,
                    fotoUrl: true,
                    // O papel é guardado com chave neutra (`filho`) e exibido
                    // com a palavra certa ("Filha") a partir daqui. Sem o
                    // sexo, a tela escreveria "Filho: Maria".
                    sexo: true,
                },
            },
            convidadoPor: {
                select: {
                    id: true,
                    nomeCompleto: true,
                },
            },
        },
    },
} satisfies Prisma.GrupoFamiliarInclude;

export class GrupoFamiliarRepository {
    async criar(data: Prisma.GrupoFamiliarCreateInput) {
        return prisma.grupoFamiliar.create({
            data,
            include: includeMembros,
        });
    }

    async buscarPorId(id: number) {
        return prisma.grupoFamiliar.findUnique({
            where: { id },
            include: includeMembros,
        });
    }

    async atualizar(id: number, data: Prisma.GrupoFamiliarUpdateInput) {
        return prisma.grupoFamiliar.update({
            where: { id },
            data,
            include: includeMembros,
        });
    }

   async buscarPorUsuario(usuarioId: number, skip: number = 0, take: number = 20) {
  return prisma.grupoFamiliar.findMany({
    where: {
      membros: {
        some: {
          usuarioId,
          status: 'aceito',
        },
      },
    },
    include: includeMembros,
    skip,
    take,
  });
}

    async buscarMembroPorId(id: number): Promise<{
        id: number;
        usuarioId: number;
        grupoFamiliarId: number;
        status: string;
    } | null> {
        return prisma.membroFamilia.findUnique({
            where: { id },
            select: {
                id: true,
                usuarioId: true,
                grupoFamiliarId: true,
                status: true,
            },
        });
    }

    async buscarMembroPorUsuarioEGrupo(usuarioId: number, grupoFamiliarId: number) {
        return prisma.membroFamilia.findUnique({
            where: {
                usuarioId_grupoFamiliarId: { usuarioId, grupoFamiliarId },
            },
        });
    }

    async criarConvite(data: Prisma.MembroFamiliaCreateInput) {
        return prisma.membroFamilia.create({ data });
    }

    async atualizarPapel(usuarioId: number, grupoFamiliarId: number, parentesco: string | null) {
        return prisma.membroFamilia.update({
            // A chave composta existe no schema (`@@unique`), então dá para
            // endereçar o vínculo por pessoa+grupo em vez de exigir que a tela
            // conheça o id da linha de `membros_familia` — um número que só o
            // banco conhece e que a URL não deveria precisar carregar.
            where: { usuarioId_grupoFamiliarId: { usuarioId, grupoFamiliarId } },
            data: { parentesco },
        });
    }

    async atualizarStatusConvite(id: number, status: string) {
        return prisma.membroFamilia.update({
            where: { id },
            data: { status },
        });
    }

    /**
     * Aceita um convite e recusa todos os outros que a pessoa tinha em aberto.
     *
     * ═══ POR QUE OS OUTROS CAEM JUNTO ═══
     * Cada pessoa pertence a UMA família. Depois de entrar numa, qualquer
     * outro convite pendente virou um botão que só sabe dar erro — e agora
     * que o convite abre a tela de Grupos, ele daria esse erro no lugar mais
     * visível do app, para sempre.
     *
     * Recusar em silêncio parece rude, mas o convite já estava morto: aceitar
     * era impossível. O que se perde é a ilusão de escolha; o que se ganha é
     * a tela não mentir.
     *
     * ═══ POR QUE EM TRANSAÇÃO ═══
     * Se o segundo comando falhasse sozinho, a pessoa ficaria dentro da
     * família E com convites vivos que não pode aceitar — exatamente o estado
     * que este método existe para impedir. Ou os dois, ou nenhum.
     */
    async aceitarConvite(membroId: number, usuarioId: number) {
        return prisma.$transaction([
            prisma.membroFamilia.update({
                where: { id: membroId },
                data: { status: 'aceito' },
            }),
            prisma.membroFamilia.updateMany({
                where: { usuarioId, status: 'pendente', id: { not: membroId } },
                data: { status: 'recusado' },
            }),
        ]);
    }

    async buscarConvitesPendentes(usuarioId: number) {
        return prisma.membroFamilia.findMany({
            where: { usuarioId, status: 'pendente' },
            include: {
                grupoFamiliar: { select: { id: true, nome: true } },
                convidadoPor: { select: { id: true, nomeCompleto: true } },
            },
        });
    }

    /**
     * Normaliza o texto digitado, do mesmo jeito que `sem_acento` normaliza a
     * coluna. Se os dois lados não passarem pelo MESMO tratamento, "José"
     * digitado com acento não casa com "jose" gravado sem.
     */
    private static prepararTermo(busca?: string): string | null {
        const limpo = busca?.trim();
        if (!limpo) return null;
        const semAcento = limpo
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase();
        // `%` e `_` são curingas do LIKE: quem digitasse "%" receberia tudo.
        return semAcento.replace(/[\\%_]/g, (c) => `\\${c}`);
    }

    /**
     * Lista famílias, com busca por nome da família OU nome de integrante.
     *
     * ═══ POR QUE DUAS CONSULTAS ═══
     * A primeira é SQL cru, porque precisa de `sem_acento` (que o Prisma não
     * expõe dentro do `where`) e de ordenação por relevância. Ela devolve
     * apenas os IDS.
     *
     * A segunda é Prisma comum, para trazer os membros com foto e nome sem
     * montar o JOIN à mão. Fazer tudo em SQL cru significaria remontar a
     * árvore família→membros→usuário em JavaScript — muito código para
     * reproduzir o que o `include` já faz certo.
     *
     * Como o `IN` não preserva ordem, a ordenação da primeira consulta é
     * reaplicada em memória. Sem isso a relevância calculada com cuidado
     * seria descartada pelo banco em silêncio.
     *
     * ═══ RELEVÂNCIA ═══
     *   0 — o nome da família começa com o termo
     *   1 — o nome da família contém o termo
     *   2 — a família não casou; quem casou foi um integrante
     *
     * A faixa 2 é o caso que motivou tudo: digitar "Maria" e receber a casa
     * da Maria, mesmo que a família se chame "Os Guerreiros".
     */
    async buscarFamilias(params: { busca?: string | undefined; take: number; skip: number }) {
        const raiz = GrupoFamiliarRepository.prepararTermo(params.busca);
        const contem = raiz === null ? null : `%${raiz}%`;
        const prefixo = raiz === null ? null : `${raiz}%`;

        const linhas = await prisma.$queryRaw<{ id: number }[]>`
        SELECT g.id
        FROM grupos_familiares g
        WHERE (
                ${contem}::text IS NULL
                OR sem_acento(g.nome) LIKE ${contem} ESCAPE '\\'
                OR EXISTS (
                     SELECT 1
                       FROM membros_familia mf
                       JOIN usuarios u ON u.id = mf."usuarioId"
                      WHERE mf."grupoFamiliarId" = g.id
                        AND mf.status = 'aceito'
                        AND sem_acento(u."nomeCompleto") LIKE ${contem} ESCAPE '\\'
                   )
              )
        ORDER BY
          CASE
            WHEN ${contem}::text IS NULL THEN 0
            WHEN sem_acento(g.nome) LIKE ${prefixo} ESCAPE '\\' THEN 0
            WHEN sem_acento(g.nome) LIKE ${contem}  ESCAPE '\\' THEN 1
            ELSE 2
          END,
          -- Família sem nome vai para o fim em vez de encabeçar a lista por
          -- causa do NULL, que o Postgres ordena primeiro por padrão.
          g.nome ASC NULLS LAST,
          g.id ASC
        LIMIT ${params.take} OFFSET ${params.skip}
      `;

        const ids = linhas.map((l) => l.id);
        if (ids.length === 0) return [];

        const grupos = await prisma.grupoFamiliar.findMany({
            where: { id: { in: ids } },
            include: includeMembros,
        });

        const porId = new Map(grupos.map((g) => [g.id, g]));
        return ids.map((id) => porId.get(id)!).filter(Boolean);
    }

    /** Mesmo filtro de `buscarFamilias` — precisa acompanhar aquela consulta. */
    async contarFamilias(busca?: string): Promise<number> {
        const raiz = GrupoFamiliarRepository.prepararTermo(busca);
        const contem = raiz === null ? null : `%${raiz}%`;

        const [linha] = await prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*)::bigint AS total
        FROM grupos_familiares g
        WHERE (
                ${contem}::text IS NULL
                OR sem_acento(g.nome) LIKE ${contem} ESCAPE '\\'
                OR EXISTS (
                     SELECT 1
                       FROM membros_familia mf
                       JOIN usuarios u ON u.id = mf."usuarioId"
                      WHERE mf."grupoFamiliarId" = g.id
                        AND mf.status = 'aceito'
                        AND sem_acento(u."nomeCompleto") LIKE ${contem} ESCAPE '\\'
                   )
              )
      `;

        // COUNT volta como BigInt, e `JSON.stringify` de BigInt lança
        // TypeError — o erro apareceria só na resposta HTTP, longe daqui.
        return Number(linha?.total ?? 0);
    }

    /**
     * O grupo de que a pessoa já faz parte — nome incluído.
     *
     * Existe ao lado de `contarPorUsuario` porque as duas perguntas são
     * diferentes: "posso criar?" quer um booleano, "por que não posso
     * convidar esta pessoa?" quer o nome para pôr na mensagem.
     */
    async buscarGrupoAceitoDoUsuario(usuarioId: number) {
        return prisma.grupoFamiliar.findFirst({
            where: { membros: { some: { usuarioId, status: 'aceito' } } },
            select: { id: true, nome: true },
        });
    }

    async contarPorUsuario(usuarioId: number): Promise<number> {
  return prisma.grupoFamiliar.count({
    where: {
      membros: {
        some: {
          usuarioId,
          status: 'aceito',
        },
      },
    },
  });
}



  
    async removerMembro(usuarioId: number, grupoFamiliarId: number) {
        return prisma.membroFamilia.delete({
            where: {
                usuarioId_grupoFamiliarId: { usuarioId, grupoFamiliarId },
            },
        });
    }

    async contarMembrosAtivos(grupoFamiliarId: number): Promise<number> {
        return prisma.membroFamilia.count({
            where: {
                grupoFamiliarId,
                status: 'aceito',
            },
        });
    }

    async deletarGrupo(id: number) {
        return prisma.grupoFamiliar.delete({
            where: { id },
  });
}
}