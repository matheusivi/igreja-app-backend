// src/repository/usuario.repository.ts
import type { RegisterDTO } from "../dtos/auth.dto";
import type { Usuario } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

export class UsuarioRepository {
  private prisma = prisma;

  /**
   * Cria um novo usuário (sempre como Membro)
   */
  async criar(
    data: Omit<RegisterDTO, "senha"> & { senhaHash: string },
  ): Promise<Usuario> {
    return this.prisma.usuario.create({
      data: {
        nomeCompleto: data.nomeCompleto,
        email: data.email,
        senha: data.senhaHash,
        perfil: "Membro",
        sexo: data.sexo,
        dataNascimento: data.dataNascimento
          ? new Date(data.dataNascimento)
          : null,
        estadoCivil: data.estadoCivil || null,
        profissao: data.profissao || null,
        exibirAniversario: true,
      },
    });
  }

  /**
   * Busca usuário por e-mail (usado no login e registro)
   */
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  /**
   * ╔═══════════════════════════════════════════════════════════════════╗
   * ║  EXCLUSÃO DE CONTA — irreversível                                 ║
   * ╚═══════════════════════════════════════════════════════════════════╝
   *
   * Apaga tudo que é da PESSOA e anonimiza o que resta.
   *
   * ═══ POR QUE NÃO UM `delete` E PRONTO ═══
   * Avisos, cursos, eventos e grupos familiares guardam quem os criou. O banco
   * recusa apagar alguém que tenha qualquer um deles — e mesmo que aceitasse,
   * apagar levaria junto conteúdo da igreja. O aviso de um líder que saiu
   * continua sendo um aviso da igreja.
   *
   * Então o registro sobra como casca vazia, sem uma única informação pessoal,
   * apenas para as chaves estrangeiras continuarem válidas.
   *
   * ═══ TUDO NUMA TRANSAÇÃO ═══
   * Se qualquer passo falhar, nada acontece. O estado intermediário — dados
   * pessoais meio apagados, conta ainda funcionando — seria o pior desfecho
   * possível: a pessoa acharia que excluiu, e não excluiu.
   *
   * ═══ O QUE DELIBERADAMENTE FICA ═══
   * Convites de família que ELA enviou a outras pessoas. São registros sobre a
   * vida de terceiros, e apagá-los desfaria vínculos que não são dela.
   */
  async excluirConta(id: number, senhaInutilizavel: string): Promise<void> {
    const marcador = `removido-${id}@conta-removida.invalid`;

    await this.prisma.$transaction([
      // ── Registros pessoais: somem por completo ──────────────────────
      this.prisma.pedidoOracao.deleteMany({ where: { autorUsuarioId: id } }),
      this.prisma.leituraPlano.deleteMany({ where: { usuarioId: id } }),
      this.prisma.membroFamilia.deleteMany({ where: { usuarioId: id } }),
      this.prisma.usuarioSala.deleteMany({ where: { usuarioId: id } }),
      this.prisma.usuarioCurso.deleteMany({ where: { usuarioId: id } }),
      this.prisma.passwordResetToken.deleteMany({ where: { usuarioId: id } }),
      this.prisma.bloqueio.deleteMany({ where: { bloqueadorId: id } }),
      this.prisma.bloqueio.deleteMany({ where: { bloqueadoId: id } }),

      // ── A casca ─────────────────────────────────────────────────────
      this.prisma.usuario.update({
        where: { id },
        data: {
          // O e-mail precisa continuar único, e `.invalid` é um domínio
          // reservado que não existe e nunca vai existir — não há risco de
          // alguém registrá-lo e receber correspondência de volta.
          email: marcador,
          nomeCompleto: "Conta removida",
          // Hash aleatório: nenhuma senha do mundo confere com ele. Deixar o
          // hash antigo permitiria entrar com a senha de sempre.
          senha: senhaInutilizavel,
          sexo: null,
          dataNascimento: null,
          estadoCivil: null,
          fotoUrl: null,
          profissao: null,
          telefone: null,
          especializacao: null,
          divulgarTrabalho: false,
          exibirAniversario: false,
          perfil: "Membro",
          contaRemovidaEm: new Date(),
          // Invalida qualquer token ainda em circulação, pela mesma
          // comparação que a troca de senha usa.
          senhaAlteradaEm: new Date(),
        },
      }),
    ]);
  }

  /**
   * Busca usuário por ID SEM retornar a senha (versão segura)
   * Usado em /me, middlewares e qualquer lugar que retorne dados do usuário
   */
  async buscarPorId(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        perfil: true,
        sexo: true,
        dataNascimento: true,
        exibirAniversario: true,
        estadoCivil: true,
        fotoUrl: true,
        profissao: true,
        telefone: true,
        especializacao: true,
        divulgarTrabalho: true,
        batizado: true,
      },
    });
  }

  /**
   * Atualiza o perfil de um usuário (usado para promover Líder ou Pastor)
   */
  async atualizarPerfil(id: number, novoPerfil: string): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { perfil: novoPerfil },
    });
  }

  /**
   * O mínimo que o middleware de autenticação precisa a cada requisição.
   *
   * ═══ POR QUE NÃO REUSAR `buscarPorId` ═══
   * Ele traz 14 colunas para montar a tela de perfil. O middleware usa duas —
   * e roda em TODA requisição autenticada do app. Pedir o resto é trabalho que
   * nunca é lido.
   *
   * `senhaAlteradaEm` entra aqui e NÃO em `buscarPorId` de propósito: é dado
   * de sessão, não de perfil. Em `buscarPorId` ele vazaria para a resposta do
   * `/me`, onde ninguém pediu por ele.
   */
  async buscarParaSessao(id: number) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: { id: true, perfil: true, senhaAlteradaEm: true },
    });
  }

  /**
   * Grava a senha nova E carimba o instante da troca.
   *
   * Os dois campos andam juntos SEMPRE. Separá-los em métodos diferentes
   * criaria o caminho de trocar a senha e esquecer o carimbo — que é
   * exatamente o defeito que isto corrige, e ele voltaria calado: a senha
   * nova funcionaria, e a sessão antiga também.
   */
  async atualizarSenha(id: number, senhaHash: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { senha: senhaHash, senhaAlteradaEm: new Date() },
    });
  }

  async atualizarDados(
    id: number,
    data: {
      nomeCompleto?: string | undefined;
      sexo?: string | undefined;
      dataNascimento?: string | undefined;
      estadoCivil?: string | undefined;
      /** `null` limpa a profissão escolhida. */
      profissao?: string | null | undefined;
      exibirAniversario?: boolean | undefined;
      telefone?: string | null | undefined;
      especializacao?: string | undefined;
      divulgarTrabalho?: boolean | undefined;
      fotoUrl?: string | null | undefined;
    },
  ) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(data.nomeCompleto !== undefined && {
          nomeCompleto: data.nomeCompleto,
        }),
        ...(data.sexo !== undefined && { sexo: data.sexo }),
        ...(data.dataNascimento !== undefined && {
          dataNascimento: new Date(data.dataNascimento),
        }),
        ...(data.estadoCivil !== undefined && {
          estadoCivil: data.estadoCivil,
        }),
        ...(data.profissao !== undefined && { profissao: data.profissao }),
        ...(data.exibirAniversario !== undefined && {
          exibirAniversario: data.exibirAniversario,
        }),
        ...(data.telefone !== undefined && { telefone: data.telefone }),
        ...(data.especializacao !== undefined && {
          especializacao: data.especializacao,
        }),
        ...(data.divulgarTrabalho !== undefined && {
          divulgarTrabalho: data.divulgarTrabalho,
        }),
        ...(data.fotoUrl !== undefined && { fotoUrl: data.fotoUrl }),
      },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        perfil: true,
        sexo: true,
        dataNascimento: true,
        exibirAniversario: true,
        estadoCivil: true,
        fotoUrl: true,
        profissao: true,
        telefone: true,
        especializacao: true,
        divulgarTrabalho: true,
        // Sem isto o app perdia o `batizado` toda vez que o perfil era salvo,
        // e o selo "Batizado" sumia da tela de Perfil.
        batizado: true,
      },
    });
  }

  /**
   * Prepara o texto digitado para o `LIKE`.
   *
   * Três coisas, nesta ordem:
   *
   * 1. **Vazio vira `null`.** É o que faz o `IS NULL` da consulta desligar o
   *    filtro. Sem isso, busca em branco viraria `LIKE '%%'` — que funciona,
   *    mas por acidente.
   *
   * 2. **Escapa `%`, `_` e `\`.** São curingas do `LIKE`. Quem digitasse "%"
   *    receberia a igreja inteira, e "_" casaria qualquer letra. Não é falha
   *    de segurança (o valor vai parametrizado), é resultado errado.
   *
   * 3. **Tira o acento em JS também.** A coluna passa por `sem_acento` no
   *    banco; se o termo não passasse pelo mesmo tratamento, "José" digitado
   *    com acento não casaria com "jose" normalizado. Os dois lados têm que
   *    ser normalizados da MESMA forma — `normalize('NFD')` mais a remoção
   *    dos diacríticos faz aqui o que o `translate` faz lá.
   */
  private static prepararTermo(busca?: string): string | null {
    const limpo = busca?.trim();
    if (!limpo) return null;

    const semAcento = limpo
      .normalize("NFD")
      // `̀-ͯ` é o bloco de sinais diacríticos combinantes. Escrito
      // por código, e não colando os acentos literais: num arquivo de texto
      // eles são invisíveis e qualquer editor pode normalizá-los de volta,
      // desarmando a limpeza sem deixar rastro no diff.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const escapado = semAcento.replace(/[\\%_]/g, (c) => `\\${c}`);
    return `%${escapado}%`;
  }

  /**
   * A mesma normalização, mas ancorada no INÍCIO: `maria%`.
   *
   * Serve só para a faixa de relevância "o nome começa com o termo". Existe
   * como função própria em vez de um `ltrim(termo, '%')` dentro do SQL —
   * aquilo funcionava, mas dependia de o leitor perceber que o primeiro `%`
   * é curinga e o segundo pode ser um `%` escapado do usuário. Regra sutil
   * dentro de string SQL é como se esconde um bug.
   */
  private static prepararPrefixo(busca?: string): string | null {
    const completo = UsuarioRepository.prepararTermo(busca);
    return completo === null ? null : completo.slice(1);
  }

  async listar(params: {
    where?: Prisma.UsuarioWhereInput;
    take?: number;
    skip?: number;
  }) {
    return this.prisma.usuario.findMany({
      ...(params.where !== undefined && { where: params.where }),
      select: {
        id: true,
        nomeCompleto: true,
        fotoUrl: true,
        perfil: true,
      },
      orderBy: { nomeCompleto: "asc" },
      ...(params.take !== undefined && { take: params.take }),
      ...(params.skip !== undefined && { skip: params.skip }),
    });
  }

  async contar(where?: Prisma.UsuarioWhereInput): Promise<number> {
    return this.prisma.usuario.count({
      ...(where !== undefined && { where }),
    });
  }

  /**
   * Busca de pessoas, com a família de cada uma.
   *
   * ═══ POR QUE SQL CRU, E NÃO O `findMany` DO PRISMA ═══
   * O `contains` do Prisma vira `ILIKE`, que ignora maiúscula e NÃO ignora
   * acento. Numa igreja brasileira essa é a falha número um da busca: quem
   * digita "jose" não acha "José", quem digita "conceicao" não acha
   * "Conceição". E ninguém digita acento no celular com pressa.
   *
   * O Prisma não expõe função SQL dentro do `where`, então a normalização
   * (`sem_acento`, criada por migração) só cabe em consulta crua.
   *
   * ═══ UMA CAIXA, DUAS PERGUNTAS ═══
   * O texto casa com o nome da PESSOA **ou** com o nome da FAMÍLIA. É o que
   * faz uma única busca responder "quem é o João?" e "quem são os Souza?"
   * sem obrigar quem procura a escolher o modo certo antes de digitar.
   *
   * A família vem por `LEFT JOIN LATERAL` com `LIMIT 1` — o mesmo padrão de
   * `buscarAniversariantes`, e pela mesma razão: com `JOIN` simples, quem
   * tivesse dois vínculos apareceria duas vezes na lista. Hoje o serviço
   * garante um só, mas a consulta não depende dessa garantia para estar
   * certa.
   *
   * `status = 'aceito'`: convite pendente ainda não é vínculo. Mostrar
   * "Família Oliveira" para quem só foi convidado afirmaria algo que a
   * pessoa não confirmou.
   */
  async buscarComFamilia(params: {
    busca?: string | undefined;
    perfil?: string | undefined;
    sexo?: string | undefined;
    take: number;
    skip: number;
  }) {
    const termo = UsuarioRepository.prepararTermo(params.busca);
    const prefixo = UsuarioRepository.prepararPrefixo(params.busca);

    return this.prisma.$queryRaw<
      {
        id: number;
        nomeCompleto: string;
        fotoUrl: string | null;
        perfil: string;
        sexo: string | null;
        familiaId: number | null;
        familia: string | null;
      }[]
    >`
    SELECT u.id, u."nomeCompleto", u."fotoUrl", u.perfil, u.sexo,
           f.id   AS "familiaId",
           f.nome AS familia
    FROM usuarios u
    LEFT JOIN LATERAL (
      SELECT g.id, g.nome
        FROM membros_familia mf
        JOIN grupos_familiares g ON g.id = mf."grupoFamiliarId"
       WHERE mf."usuarioId" = u.id
         AND mf.status = 'aceito'
       ORDER BY mf.id ASC
       LIMIT 1
    ) f ON true
    WHERE (
            ${termo}::text IS NULL
            OR sem_acento(u."nomeCompleto") LIKE ${termo} ESCAPE '\'
            OR sem_acento(f.nome)           LIKE ${termo} ESCAPE '\'
          )
      AND (${params.perfil ?? null}::text IS NULL OR u.perfil = ${params.perfil ?? null})
      AND (${params.sexo ?? null}::text   IS NULL OR u.sexo   = ${params.sexo ?? null})
    /*
     * === RELEVANCIA, E NAO ALFABETO ===
     * So ordenar por nomeCompleto colocava "Ana Souza" (que apenas PERTENCE
     * a Familia Oliveira) na frente de "Bruno Oliveira" (que SE CHAMA
     * Oliveira). Quem digita um sobrenome quer primeiro quem o carrega.
     *
     * Tres faixas, e alfabetico dentro de cada uma:
     *   0 - o nome COMECA com o termo
     *   1 - o nome contem o termo em qualquer posicao
     *   2 - o nome nao casou; quem casou foi a familia
     *
     * Sem termo, prepararTermo devolve NULL e todas as linhas caem na faixa
     * 0 - a lista volta a ser puramente alfabetica, que e o certo quando nao
     * ha nada para ranquear.
     *
     * Sem acento e sem crase de proposito: este comentario vive DENTRO de um
     * template literal, e uma crase aqui fecharia a string.
     */
    ORDER BY
      CASE
        WHEN ${termo}::text IS NULL THEN 0
        WHEN sem_acento(u."nomeCompleto") LIKE ${prefixo} ESCAPE '\\' THEN 0
        WHEN sem_acento(u."nomeCompleto") LIKE ${termo} ESCAPE '\\' THEN 1
        ELSE 2
      END,
      u."nomeCompleto" ASC
    LIMIT ${params.take} OFFSET ${params.skip}
  `;
  }

  /**
   * O diretório profissional da comunidade.
   *
   * ═══ DUAS TRAVAS, AS DUAS NO SERVIDOR ═══
   *
   * 1. **`divulgarTrabalho = true`.** Ninguém entra por ter preenchido
   *    profissão. A pessoa liga o interruptor no perfil, e só então aparece.
   *
   * 2. **Maior de idade.** `dataNascimento` tem que existir E ser de pelo
   *    menos 18 anos atrás. Um diretório com telefone e foto de criança não
   *    é aceitável, e essa regra não pode morar na tela: tela se contorna
   *    chamando a API direto. Quem não tem data cadastrada também não entra —
   *    idade desconhecida não é presunção de adulto.
   *
   * `AGE(...)` em vez de subtrair anos na mão: o Postgres resolve ano
   * bissexto e virada de mês, que é onde uma conta manual erra por um dia
   * justamente no aniversário de 18 anos de alguém.
   *
   * ═══ A IDADE NÃO É DEVOLVIDA ═══
   * Ela filtra e some. Mandar a idade — ou pior, a data — para uma listagem
   * pública seria expor um dado que não ajuda ninguém a escolher um
   * eletricista.
   */
  async buscarProfissionais(params: {
    busca?: string | undefined;
    /**
     * Chaves cujo RÓTULO casa com o termo — traduzidas pelo serviço.
     * A coluna guarda `eletronica`, a pessoa digita "consertos": sem esta
     * ponte a busca falharia calada onde chave e rótulo divergem.
     */
    chaves?: string[] | undefined;
    take: number;
    skip: number;
  }) {
    const termo = UsuarioRepository.prepararTermo(params.busca);
    const prefixo = UsuarioRepository.prepararPrefixo(params.busca);
    // `ANY` de array vazio nunca casa, e é o que se quer quando o termo não
    // corresponde a profissão nenhuma. `[""]` porque array literalmente vazio
    // faz o Postgres reclamar de tipo indefinido.
    const listaChaves = (params.chaves?.length ?? 0) > 0 ? params.chaves! : [""];

    return this.prisma.$queryRaw<
      {
        id: number;
        nomeCompleto: string;
        fotoUrl: string | null;
        profissao: string | null;
        especializacao: string | null;
        telefone: string | null;
      }[]
    >`
    SELECT u.id, u."nomeCompleto", u."fotoUrl",
           u.profissao, u.especializacao, u.telefone
    FROM usuarios u
    WHERE u."divulgarTrabalho" = true
      AND u."dataNascimento" IS NOT NULL
      AND AGE(u."dataNascimento") >= INTERVAL '18 years'
      AND (
            ${termo}::text IS NULL
            OR sem_acento(u.profissao)      LIKE ${termo} ESCAPE '\'
            OR u.profissao = ANY(${listaChaves})
            OR sem_acento(u.especializacao) LIKE ${termo} ESCAPE '\'
            OR sem_acento(u."nomeCompleto") LIKE ${termo} ESCAPE '\'
          )
    /*
     * Relevancia pensada para quem PROCURA UM SERVICO, nao uma pessoa:
     *   0 - a profissao comeca com o termo ("eletricista" para "eletri")
     *   1 - profissao ou especializacao contem o termo
     *   2 - so o nome casou
     *
     * Buscar por nome aqui e o caso raro; quem sabe o nome ja liga. Por isso
     * o nome fica na ultima faixa, ao contrario da busca de membros.
     *
     * Sem crase neste comentario: ele vive dentro de template literal.
     */
    ORDER BY
      CASE
        WHEN ${termo}::text IS NULL THEN 0
        WHEN u.profissao = ANY(${listaChaves}) THEN 0
        WHEN sem_acento(u.profissao) LIKE ${prefixo} ESCAPE '\' THEN 0
        WHEN sem_acento(u.profissao) LIKE ${termo} ESCAPE '\' THEN 1
        WHEN sem_acento(u.especializacao) LIKE ${termo} ESCAPE '\' THEN 1
        ELSE 2
      END,
      u.profissao ASC NULLS LAST,
      u."nomeCompleto" ASC
    LIMIT ${params.take} OFFSET ${params.skip}
  `;
  }

  /** Mesmo filtro de `buscarProfissionais` — precisa acompanhar aquela consulta. */
  async contarProfissionais(busca?: string, chaves: string[] = []): Promise<number> {
    const termo = UsuarioRepository.prepararTermo(busca);
    const listaChaves = chaves.length > 0 ? chaves : [""];

    const [linha] = await this.prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM usuarios u
    WHERE u."divulgarTrabalho" = true
      AND u."dataNascimento" IS NOT NULL
      AND AGE(u."dataNascimento") >= INTERVAL '18 years'
      AND (
            ${termo}::text IS NULL
            OR sem_acento(u.profissao)      LIKE ${termo} ESCAPE '\'
            OR u.profissao = ANY(${listaChaves})
            OR sem_acento(u.especializacao) LIKE ${termo} ESCAPE '\'
            OR sem_acento(u."nomeCompleto") LIKE ${termo} ESCAPE '\'
          )
  `;

    return Number(linha?.total ?? 0);
  }

  /** Mesmo filtro da busca — precisa acompanhar `buscarComFamilia`. */
  async contarComFamilia(params: {
    busca?: string | undefined;
    perfil?: string | undefined;
    sexo?: string | undefined;
  }): Promise<number> {
    const termo = UsuarioRepository.prepararTermo(params.busca);

    const [linha] = await this.prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM usuarios u
    LEFT JOIN LATERAL (
      SELECT g.nome
        FROM membros_familia mf
        JOIN grupos_familiares g ON g.id = mf."grupoFamiliarId"
       WHERE mf."usuarioId" = u.id
         AND mf.status = 'aceito'
       ORDER BY mf.id ASC
       LIMIT 1
    ) f ON true
    WHERE (
            ${termo}::text IS NULL
            OR sem_acento(u."nomeCompleto") LIKE ${termo} ESCAPE '\'
            OR sem_acento(f.nome)           LIKE ${termo} ESCAPE '\'
          )
      AND (${params.perfil ?? null}::text IS NULL OR u.perfil = ${params.perfil ?? null})
      AND (${params.sexo ?? null}::text   IS NULL OR u.sexo   = ${params.sexo ?? null})
  `;

    // `COUNT` no Postgres volta como BigInt, e `JSON.stringify` de BigInt
    // lança TypeError — o erro apareceria só na resposta HTTP, longe daqui.
    return Number(linha?.total ?? 0);
  }

  /**
   * Aniversariantes do mês, com o nome da família a que a pessoa pertence.
   *
   * A família vem por SUBCONSULTA CORRELACIONADA, e não por `LEFT JOIN`, de
   * propósito: `MembroFamilia` tem `@@unique([usuarioId, grupoFamiliarId])`,
   * o que permite a mesma pessoa estar em mais de um grupo. Com `JOIN`, quem
   * está em duas famílias apareceria DUAS VEZES na lista de aniversariantes —
   * e o bug só se manifestaria no dia do aniversário de alguém nessa
   * situação, que é o pior tipo de bug para descobrir.
   *
   * `status = 'aceito'` porque convite pendente ainda não é vínculo: mostrar
   * "Família Oliveira" para quem só foi convidado seria afirmar algo que a
   * pessoa ainda não confirmou.
   *
   * `ORDER BY mf.id ASC LIMIT 1` = o vínculo mais antigo ganha, quando há
   * mais de um. É uma escolha arbitrária, mas determinística — sem o `ORDER
   * BY` o Postgres poderia devolver famílias diferentes entre requisições.
   */
  async buscarAniversariantes(mes: number) {
    return this.prisma.$queryRaw<
      {
        id: number;
        nomeCompleto: string;
        fotoUrl: string | null;
        perfil: string;
        dia: number;
        familia: string | null;
        familiaFoto: string | null;
        profissao: string | null;
      }[]
    >`
    SELECT u.id, u."nomeCompleto", u."fotoUrl", u.perfil, u.profissao,
           EXTRACT(DAY FROM u."dataNascimento")::int AS dia,
           f.nome AS familia,
           f."imagemUrl" AS "familiaFoto"
    FROM usuarios u
    /*
     * LEFT JOIN LATERAL em vez de duas subconsultas correlacionadas: preciso
     * de DOIS campos da mesma família (nome e foto), e com subconsulta
     * separada para cada um o Postgres faria a busca duas vezes — e, pior,
     * nada garantiria que as duas caíssem no MESMO grupo se a pessoa tiver
     * mais de um vínculo.
     *
     * Continua sem risco de duplicar a pessoa: o LATERAL traz no máximo uma
     * linha por causa do LIMIT 1.
     */
    LEFT JOIN LATERAL (
      SELECT g.nome, g."imagemUrl"
        FROM membros_familia mf
        JOIN grupos_familiares g ON g.id = mf."grupoFamiliarId"
       WHERE mf."usuarioId" = u.id
         AND mf.status = 'aceito'
       ORDER BY mf.id ASC
       LIMIT 1
    ) f ON true
    WHERE EXTRACT(MONTH FROM u."dataNascimento") = ${mes}
      AND u."exibirAniversario" = true
      AND u."dataNascimento" IS NOT NULL
    ORDER BY dia ASC
  `;
  }

  async marcarBatizado(id: number): Promise<void> {
    await this.prisma.usuario.update({
      where: { id },
      data: { batizado: true },
    });
  }

  /** Versão em lote — usada ao encerrar uma turma de Batismo inteira. */
  async marcarBatizadosEmLote(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.usuario.updateMany({
      where: { id: { in: ids } },
      data: { batizado: true },
    });
  }
}
