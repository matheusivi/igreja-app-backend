import { LeituraPlanoRepository } from "../repository/leituraPlano.repository";

/**
 * O progresso do plano de leitura anual.
 *
 * ═══ POR QUE O SERVIÇO É TÃO FINO ═══
 * Não há regra de negócio aqui, e isso é a resposta certa: o plano em si mora
 * no app, e o servidor guarda apenas quais dias a pessoa marcou.
 *
 * Em particular, o servidor NÃO valida se o dia existe no plano nem se já
 * chegou. Marcar 30 de fevereiro seria inútil, mas inofensivo; e travar dias
 * futuros impediria quem lê adiantado no domingo de marcar a semana. Um plano
 * de leitura é compromisso pessoal, não prova com data de entrega.
 *
 * ═══ CADA UM VÊ E MEXE SÓ NO PRÓPRIO ═══
 * Nenhum método recebe "de quem" por parâmetro da requisição: o `usuarioId`
 * vem sempre do token, no controller. Não existe rota para ver o progresso
 * alheio — nem para a liderança. Quanto se lê a Bíblia não é indicador de
 * desempenho, e transformar isso em ranking pastoral estragaria a prática que
 * a ferramenta existe para apoiar.
 */
export class LeituraPlanoService {
  private repo: LeituraPlanoRepository;

  constructor(repo?: LeituraPlanoRepository) {
    this.repo = repo ?? new LeituraPlanoRepository();
  }

  public listarDoAno(usuarioId: number, ano: number): Promise<string[]> {
    return this.repo.listarDoAno(usuarioId, ano);
  }

  public marcar(usuarioId: number, dia: string): Promise<void> {
    return this.repo.marcar(usuarioId, dia);
  }

  public desmarcar(usuarioId: number, dia: string): Promise<void> {
    return this.repo.desmarcar(usuarioId, dia);
  }
}
