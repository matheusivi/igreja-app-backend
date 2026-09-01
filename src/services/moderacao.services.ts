import { Perfis } from "../constants/perfis";
import { ModeracaoRepository } from "../repository/moderacao.repository";
import { PedidoOracaoRepository } from "../repository/pedidoOracao.repository";
import { UsuarioRepository } from "../repository/usuario.repository";
import { AppError } from "../utils/AppError";

/** Únicos tipos denunciáveis hoje. Fechado de propósito. */
export const TIPOS_DENUNCIAVEIS = ["pedido_oracao"] as const;
export type TipoDenunciavel = (typeof TIPOS_DENUNCIAVEIS)[number];

/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  DENUNCIAR E BLOQUEAR                                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * O mural de oração é texto que uma pessoa escreve e todas leem. Isso torna o
 * app um lugar de conteúdo gerado por usuário, e as lojas exigem quatro coisas
 * para publicar: filtrar, denunciar, bloquear quem abusa e ter contato
 * publicado. Sem elas, reprova — não por qualidade, por checklist.
 *
 * ═══ MAS A RAZÃO NÃO É A LOJA ═══
 * Numa igreja, o mural é onde alguém escreve o que está vivendo. Se aparecer
 * ali algo agressivo, ou se uma desavença de fora vazar para dentro, a pessoa
 * atingida precisa de saída imediata — não de esperar encontrar um líder no
 * domingo.
 *
 * Por isso são DOIS mecanismos, e não um:
 *
 *   BLOQUEAR   resolve agora, sozinha, sem depender de ninguém
 *   DENUNCIAR  pede que a liderança olhe, e leva o tempo que levar
 *
 * Quem foi ofendido não deveria precisar de autorização para parar de ver o
 * que a ofendeu.
 */
export class ModeracaoService {
  constructor(
    private repo = new ModeracaoRepository(),
    private pedidoRepo = new PedidoOracaoRepository(),
    private usuarioRepo = new UsuarioRepository(),
  ) {}

  /**
   * Denuncia um conteúdo.
   *
   * ═══ NÃO DÁ PARA DENUNCIAR O PRÓPRIO TEXTO ═══
   * Quem escreveu já tem o botão de apagar. Deixar denunciar a si mesmo só
   * criaria fila de trabalho para a liderança resolver algo que a própria
   * pessoa resolve num toque.
   */
  async denunciar(params: {
    tipo: TipoDenunciavel;
    alvoId: number;
    denuncianteId: number;
    motivo: string;
  }) {
    const pedido = await this.pedidoRepo.buscarParaPermissao(params.alvoId);
    if (!pedido) {
      throw new AppError("Este pedido não existe mais.", 404);
    }

    if (pedido.autorUsuarioId === params.denuncianteId) {
      throw new AppError(
        "Este pedido é seu — você pode excluí-lo pelo próprio menu.",
        400,
      );
    }

    await this.repo.denunciar(params);
  }

  /** A fila da liderança. Membro comum não vê denúncia de ninguém. */
  async listarPendentes(perfil: string, page: number, limit: number) {
    this.exigirLideranca(perfil);

    const [denuncias, total] = await Promise.all([
      this.repo.listarPendentes(limit, (page - 1) * limit),
      this.repo.contarPendentes(),
    ]);

    return { data: denuncias, total, page, totalPages: Math.ceil(total / limit) };
  }

  async resolver(id: number, perfil: string) {
    this.exigirLideranca(perfil);
    await this.repo.marcarResolvida(id);
  }

  /**
   * Bloqueia alguém.
   *
   * ═══ O BLOQUEADO NÃO É AVISADO E NÃO PERDE NADA ═══
   * Ele continua publicando, e outras pessoas continuam vendo. O efeito existe
   * só para quem bloqueou.
   *
   * É deliberado. Bloqueio que notifica vira briga na saída do culto; bloqueio
   * que pune vira ferramenta de perseguição — bastaria combinar cinco pessoas
   * para silenciar alguém. O que se quer aqui é modesto e suficiente: deixar
   * de ver.
   *
   * ═══ NÃO DÁ PARA BLOQUEAR A LIDERANÇA ═══
   * Pastor e Administrador publicam aviso e evento, que é comunicação oficial
   * da igreja. Poder ocultá-los deixaria alguém sem saber da mudança de
   * horário do culto por causa de uma desavença pessoal.
   */
  async bloquear(bloqueadorId: number, bloqueadoId: number) {
    if (bloqueadorId === bloqueadoId) {
      throw new AppError("Você não pode bloquear a si mesmo.", 400);
    }

    const alvo = await this.usuarioRepo.buscarPorId(bloqueadoId);
    if (!alvo) throw new AppError("Pessoa não encontrada.", 404);

    if (alvo.perfil === Perfis.PASTOR || alvo.perfil === Perfis.ADMINISTRADOR) {
      throw new AppError(
        "Não é possível bloquear a liderança da igreja. Se houver um problema, use o botão de denunciar.",
        403,
      );
    }

    await this.repo.bloquear(bloqueadorId, bloqueadoId);
  }

  async desbloquear(bloqueadorId: number, bloqueadoId: number) {
    await this.repo.desbloquear(bloqueadorId, bloqueadoId);
  }

  async listarBloqueados(bloqueadorId: number) {
    const linhas = await this.repo.listarBloqueados(bloqueadorId);
    return linhas.map((l) => ({ ...l.bloqueado, bloqueadoEm: l.criadoEm }));
  }

  /** Usado pelo mural para esconder o que a pessoa não quer ver. */
  async idsBloqueadosPor(bloqueadorId: number): Promise<number[]> {
    return this.repo.idsBloqueadosPor(bloqueadorId);
  }

  private exigirLideranca(perfil: string): void {
    const podeVer: string[] = [
      Perfis.ADMINISTRADOR,
      Perfis.PASTOR,
      Perfis.LIDER,
    ];
    if (!podeVer.includes(perfil)) {
      throw new AppError("Apenas a liderança vê as denúncias.", 403);
    }
  }
}
