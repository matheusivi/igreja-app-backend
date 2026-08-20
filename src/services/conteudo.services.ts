// src/services/conteudo.service.ts
import type {
  BlocoConteudo,
  CreateConteudoDTO,
  UpdateConteudoDTO,
  ConteudoResponse,
  ListarConteudosDTO,
  ConteudoComUsuarioSimples,
  ListarConteudosResponse,
} from "../dtos/conteudo.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { ConteudoRepository } from "../repository/conteudo.repository";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";
import { Perfis } from "../constants/perfis";
import { extrairPublicId, removerImagem } from "../lib/cloudinary";

/**
 * Deriva os campos planos a partir dos blocos.
 *
 * O post é a sequência de blocos, mas listagens e buscas precisam de coisas
 * simples: um texto para o resumo, uma imagem para o card. Em vez de fazer
 * cada tela percorrer os blocos, o servidor calcula isso na gravação.
 *
 * A capa é a PRIMEIRA imagem do corpo — foi a decisão de não ter um campo de
 * capa separado, para a pessoa não ter que pensar em imagem em dois lugares.
 */
function derivarDosBlocos(blocos: BlocoConteudo[]) {
  const textos = blocos
    .filter((b) => b.tipo === "texto")
    .map((b) => b.valor.trim())
    .filter(Boolean);

  const imagem = blocos.find((b) => b.tipo === "imagem")?.valor ?? null;
  const video = blocos.find((b) => b.tipo === "video")?.valor ?? null;

  const temTexto = textos.length > 0;
  const quantidade = [temTexto, !!imagem, !!video].filter(Boolean).length;

  return {
    // Parágrafos separados por linha em branco: é o formato que a tela de
    // leitura já usava para quebrar o texto.
    texto: temTexto ? textos.join("\n\n") : null,
    imagemUrl: imagem,
    videoUrl: video,
    formato:
      quantidade > 1
        ? "combinacao"
        : imagem
          ? "imagem"
          : video
            ? "vídeo"
            : "texto",
  };
}

/**
 * Converte os blocos para o tipo que o Prisma aceita em coluna Json.
 *
 * O `InputJsonValue` do Prisma exige uma assinatura de índice que nenhuma
 * interface nossa tem — por isso a conversão explícita. Não há perda de
 * segurança: o array já passou pelo Zod antes de chegar aqui.
 */
function paraJson(blocos: BlocoConteudo[]): Prisma.InputJsonValue {
  return blocos as unknown as Prisma.InputJsonValue;
}

/**
 * Blocos de um conteúdo já gravado.
 *
 * Conteúdo publicado antes desta mudança não tem `blocos`, só os campos
 * antigos. Em vez de migrar o banco, montamos a sequência na leitura — assim
 * nada do que já foi publicado se perde nem precisa ser reeditado.
 */
function blocosDe(conteudo: ConteudoComUsuarioSimples): BlocoConteudo[] {
  if (Array.isArray(conteudo.blocos) && conteudo.blocos.length > 0) {
    return conteudo.blocos as BlocoConteudo[];
  }

  const legado: BlocoConteudo[] = [];
  if (conteudo.imagemUrl) legado.push({ tipo: "imagem", valor: conteudo.imagemUrl });
  if (conteudo.texto) legado.push({ tipo: "texto", valor: conteudo.texto });
  if (conteudo.videoUrl) legado.push({ tipo: "video", valor: conteudo.videoUrl });
  return legado;
}

export class ConteudoService {
  private usuarioRepository: UsuarioRepository;
  private conteudoRepository: ConteudoRepository;

  constructor(
    usuarioRepository?: UsuarioRepository,
    conteudoRepository?: ConteudoRepository,
  ) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.conteudoRepository = conteudoRepository ?? new ConteudoRepository();
  }

  public async create(
    data: CreateConteudoDTO,
    usuarioId: number,
  ): Promise<ConteudoResponse> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    const principal = data.principal || false;

    // Só um destaque por tipo: marcar um novo Aviso como destaque tira o
    // destaque do anterior, senão a Home teria vários "principais".
    if (principal) {
      await this.conteudoRepository.limparPrincipais(data.tipo);
    }

    const novoConteudo = await this.conteudoRepository.criar({
      usuario: { connect: { id: usuarioId } },
      tipo: data.tipo,
      titulo: data.titulo,
      blocos: paraJson(data.blocos),
      ...derivarDosBlocos(data.blocos),
      principal,
      dataValidade: data.dataValidade ? new Date(data.dataValidade) : null,
    });

    return this.formatarResponse(novoConteudo);
  }

  public async getById(conteudoId: number): Promise<ConteudoResponse> {
    const conteudo = await this.conteudoRepository.buscarPorId(conteudoId);

    if (!conteudo) {
      throw new AppError("Conteúdo não encontrado.", 404);
    }

    return this.formatarResponse(conteudo);
  }

  /**
   * Devolve o destaque ao seu lugar quando ele já passou da hora.
   *
   * ═══ O PROBLEMA ═══
   * Destaque é um ato editorial com prazo — "olhem para isto AGORA" —, mas
   * era gravado como um booleano permanente. Ninguém desmarca: a liderança
   * publica o aviso da semana, marca o destaque e segue a vida. Dois meses
   * depois, um convite para um evento que já aconteceu continua no topo da
   * lista e na Home, na frente de tudo o que veio depois, porque o `orderBy`
   * põe `principal` antes da data.
   *
   * Pedir disciplina de manutenção a voluntários é um requisito que não se
   * cumpre. O sistema tem que esquecer sozinho.
   *
   * ═══ QUANDO VENCE ═══
   * - **Com `dataValidade`** (o caso do aviso): o destaque cai junto com o
   *   aviso. A liderança já disse até quando aquilo importa — não faz sentido
   *   pedir a mesma informação duas vezes, nem deixar em destaque um aviso
   *   que a própria listagem já esconde por vencido.
   *
   * - **Sem validade** (o caso do devocional): 21 dias da publicação. Três
   *   semanas é o ciclo em que a igreja se reencontra três vezes; passou
   *   disso, quem ia ver já viu, e continuar no topo só empurra o novo para
   *   baixo.
   *
   * ═══ POR QUE APAGAR, E NÃO SÓ IGNORAR ═══
   * Dava para calcular na hora de exibir e deixar a flag suja no banco. Mas
   * então cada tela precisaria repetir a mesma regra, e bastaria uma esquecer
   * para as telas discordarem entre si. Apagando, a verdade fica num lugar
   * só, e roda uma vez: da segunda listagem em diante não há mais destaque
   * vencido para achar.
   */
  private static readonly JANELA_DESTAQUE_DIAS = 21;

  private async expirarDestaqueVencido(tipo: string): Promise<void> {
    const destaque = await this.conteudoRepository.buscarPrincipal(tipo);
    if (!destaque) return;

    // Início de hoje, e não o instante atual — a mesma comparação que a
    // listagem usa para a validade, para as duas não discordarem em nada.
    const inicioDeHoje = new Date();
    inicioDeHoje.setHours(0, 0, 0, 0);

    let limite: Date;
    if (destaque.dataValidade) {
      limite = new Date(destaque.dataValidade);
    } else {
      // Zerado no início do dia. Sem isso, o prazo herda a HORA em que o
      // conteúdo foi publicado, e um post das 23h duraria quase um dia a mais
      // que um das 6h — a mesma classe de erro que já tinha feito um evento
      // do dia 10 nascer no dia 8.
      limite = new Date(destaque.dataPublicacao);
      limite.setHours(0, 0, 0, 0);
      limite.setDate(limite.getDate() + ConteudoService.JANELA_DESTAQUE_DIAS);
    }

    if (limite < inicioDeHoje) {
      await this.conteudoRepository.limparPrincipais(tipo);
    }
  }

  public async list(
    filters: ListarConteudosDTO = {},
  ): Promise<ListarConteudosResponse> {
    /**
     * 15 é o mesmo padrão do `ListarConteudosQuerySchema`.
     *
     * ═══ POR QUE ISSO IMPORTA ═══
     * Aqui estava 20 enquanto o schema já dizia 15. Não quebrava nada porque
     * a rota valida a query ANTES de chegar aqui, e a validação sempre
     * preenche o campo — ou seja, o 20 nunca rodava. Era um número morto que
     * mentia para quem lesse o serviço.
     *
     * É a mesma armadilha da senha mínima, que aceitava 6 no cadastro e
     * exigia 8 na redefinição: regra escrita em dois lugares com valores
     * diferentes não é regra, é uma discordância esperando alguém chamar o
     * serviço por outro caminho — um seed, um script, um teste.
     */
    const { tipo, limit = 15, busca, orderBy = "recent", page = 1 } = filters;

    // Antes de ordenar, e não depois: se o destaque já venceu, ele não pode
    // ganhar a primeira posição desta resposta.
    if (tipo) await this.expirarDestaqueVencido(tipo);

    const skip = (page - 1) * limit;

    const whereClause: Prisma.ConteudoWhereInput = {};
    if (tipo) whereClause.tipo = tipo;
    if (busca) {
      whereClause.titulo = { contains: busca, mode: "insensitive" };
    }

    if (!filters.incluirVencidos) {
      // Compara com o INÍCIO de hoje, não com o instante atual: assim um
      // aviso "válido até 15/08" fica no ar o dia 15 inteiro, sem depender
      // de que hora do dia foi gravado nem do fuso.
      const inicioDeHoje = new Date();
      inicioDeHoje.setHours(0, 0, 0, 0);

      whereClause.OR = [
        { dataValidade: null },
        { dataValidade: { gte: inicioDeHoje } },
      ];
    }

     const [conteudos, total] = await Promise.all([
    this.conteudoRepository.listar({
      where: whereClause,
      // Destaque primeiro, depois por data. Sem isto, marcar um aviso como
      // destaque não tinha efeito nenhum: a Home busca só os 3 mais recentes,
      // e um destaque antigo nem aparecia na consulta.
      orderBy: [
        { principal: 'desc' },
        { dataPublicacao: orderBy === 'recent' ? 'desc' : 'asc' },
      ],
      take: limit,
      skip,
    }),
    this.conteudoRepository.contar(whereClause),
  ]);

    return {
    data: conteudos.map((conteudo) => this.formatarResponse(conteudo)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
  }

  public async update(
    conteudoId: number,
    data: UpdateConteudoDTO,
    usuarioId: number,
    perfil: string,
  ): Promise<ConteudoResponse> {
    const conteudoExistente = await this.conteudoRepository.buscarPorId(conteudoId);

    if (!conteudoExistente) {
      throw new AppError("Conteúdo não encontrado.", 404);
    }

    const podeAtualizar = conteudoExistente.usuarioId === usuarioId || perfil === Perfis.ADMINISTRADOR || perfil === Perfis.PASTOR;

    if (!podeAtualizar) {
      throw new AppError("Você não tem permissão para atualizar este conteúdo.", 403);
    }

    const updateData: Prisma.ConteudoUpdateInput = {};

    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.titulo !== undefined) updateData.titulo = data.titulo;
    if (data.blocos !== undefined) {
      updateData.blocos = paraJson(data.blocos);
      Object.assign(updateData, derivarDosBlocos(data.blocos));

      // Imagens que saíram do post viram arquivo órfão no Cloudinary.
      const antigas = blocosDe(conteudoExistente)
        .filter((b) => b.tipo === "imagem")
        .map((b) => b.valor);
      const atuais = new Set(
        data.blocos.filter((b) => b.tipo === "imagem").map((b) => b.valor),
      );

      for (const url of antigas) {
        if (atuais.has(url)) continue;
        const publicId = extrairPublicId(url);
        if (publicId) await removerImagem(publicId);
      }
    }

    if (data.principal !== undefined) {
      updateData.principal = data.principal;
      if (data.principal) {
        await this.conteudoRepository.limparPrincipais(
          data.tipo ?? conteudoExistente.tipo,
          conteudoId,
        );
      }
    }
    if (data.dataValidade !== undefined) {
      updateData.dataValidade = data.dataValidade
        ? new Date(data.dataValidade)
        : null;
    }

    const conteudoAtualizado = await this.conteudoRepository.atualizar(
      conteudoId,
      updateData,
    );

    return this.formatarResponse(conteudoAtualizado);
  }

  public async delete(
    conteudoId: number,
    usuarioId: number,
    perfil: string,
  ): Promise<void> {
    const conteudoExistente = await this.conteudoRepository.buscarParaPermissao(conteudoId);

    if (!conteudoExistente) {
      throw new AppError("Conteúdo não encontrado.", 404);
    }

    const podeDeletar = conteudoExistente.usuarioId === usuarioId || perfil === Perfis.ADMINISTRADOR || perfil === Perfis.PASTOR;

    if (!podeDeletar) {
      throw new AppError("Você não tem permissão para excluir este conteúdo.", 403);
    }

    await this.conteudoRepository.deletar(conteudoId);
  }

  private formatarResponse(conteudo: ConteudoComUsuarioSimples): ConteudoResponse {
    return {
      id: conteudo.id,
      tipo: conteudo.tipo,
      titulo: conteudo.titulo,
      blocos: blocosDe(conteudo),
      texto: conteudo.texto || undefined,
      imagemUrl: conteudo.imagemUrl || undefined,
      videoUrl: conteudo.videoUrl || undefined,
      formato: conteudo.formato,
      dataPublicacao: conteudo.dataPublicacao,
      principal: conteudo.principal,
      autor: {
        id: conteudo.usuario?.id ?? 0,
        nomeCompleto: conteudo.usuario?.nomeCompleto ?? "",
        perfil: conteudo.usuario?.perfil ?? "",
      },
    };
  }
}