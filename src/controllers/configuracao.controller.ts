import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { ConfiguracaoService } from "../services/configuracao.services";
import { AtualizarConfiguracaoSchema } from "../validation/configuracao.validation";

export class ConfiguracaoController {
  private service: ConfiguracaoService;

  constructor() {
    this.service = new ConfiguracaoService();
  }

  public obter = async (_req: AuthRequest, res: Response): Promise<void> => {
    const data = await this.service.obter();
    res.status(200).json({ success: true, data });
  };

  public atualizar = async (req: AuthRequest, res: Response): Promise<void> => {
    const validado = AtualizarConfiguracaoSchema.parse(req.body);

    const data = await this.service.atualizar(validado, req.user!.perfil);

    res.status(200).json({ success: true, data });
  };
}
