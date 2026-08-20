import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { LeituraPlanoService } from "../services/leituraPlano.services";
import {
  AnoQuerySchema,
  DiaParamSchema,
} from "../validation/leituraPlano.validation";
import { AppError } from "../utils/AppError";

/**
 * O progresso de leitura de quem está logado.
 *
 * O `usuarioId` vem SEMPRE do token, nunca da URL nem do corpo. Não é
 * detalhe: uma rota `/plano-leitura/:usuarioId` deixaria qualquer pessoa
 * autenticada ler — e marcar — o progresso de qualquer outra trocando um
 * número no endereço.
 */
export class LeituraPlanoController {
  private service: LeituraPlanoService;

  constructor() {
    this.service = new LeituraPlanoService();
  }

  public listar = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { ano } = AnoQuerySchema.parse(req.query);
    const dias = await this.service.listarDoAno(req.user.id, ano);

    res.status(200).json({ success: true, data: dias });
  };

  /**
   * Marcar e desmarcar são IDEMPOTENTES: mandar duas vezes dá no mesmo.
   *
   * É o que torna a tela otimista segura. Ela pinta o dia na hora e envia
   * depois; se a rede repetir a requisição — coisa comum em 4G ruim — a
   * segunda não vira erro nem registro duplicado.
   */
  public marcar = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { dia } = DiaParamSchema.parse(req.params);
    await this.service.marcar(req.user.id, dia);

    res.status(200).json({ success: true, message: "Leitura marcada." });
  };

  public desmarcar = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError("Usuário não autenticado", 401);

    const { dia } = DiaParamSchema.parse(req.params);
    await this.service.desmarcar(req.user.id, dia);

    res.status(200).json({ success: true, message: "Leitura desmarcada." });
  };
}
