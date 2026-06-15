import type { Response } from "express";
import { PedidoOracaoService } from "../services/pedidoOracao.services";
import type { AuthRequest } from "../middlewares/auth.middleware";
import { CreatePedidoOracaoSchema, UpdatePedidoOracaoSchema } from "../validation/pedidoOracao.validation";
import { AppError } from "../utils/AppError";

export class PedidoOracaoController {
  private pedidoOracaoService: PedidoOracaoService;

  constructor() {
    this.pedidoOracaoService = new PedidoOracaoService();
  }

  public create = async (req: AuthRequest, res: Response): Promise<void> => {
    const validatedData = CreatePedidoOracaoSchema.parse(req.body);
    const usuarioId = req.user!.id;

    const pedido = await this.pedidoOracaoService.create(
      validatedData,
      usuarioId,
    );

    res.status(201).json({
      sucess: true,
      message: "Pedido de oração enviado com sucesso",
      data: pedido,
    });
  };

  public list = async (req: AuthRequest, res: Response): Promise<void> => {
    const { busca, limit, page } = req.query;

    const resultado = await this.pedidoOracaoService.list({
      ...(busca ? { busca: String(busca) } : {}),
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });

    res.status(200).json({
      success: true,
      ...resultado,
    });
  };

public update = async (req: AuthRequest, res: Response): Promise<void> => {
  const pedidoId = Number(req.params.id);
  if (isNaN(pedidoId)) throw new AppError('ID do pedido inválido', 400);

  const { descricaoPedido } = UpdatePedidoOracaoSchema.parse(req.body);
  const usuarioId = req.user!.id;
  const perfil = req.user!.perfil;

  const pedido = await this.pedidoOracaoService.update(
    pedidoId,
    descricaoPedido,
    usuarioId,
    perfil,
  );

  res.status(200).json({
    success: true,
    message: 'Pedido de oração atualizado com sucesso',
    data: pedido,
  });
};

  public delete = async (req: AuthRequest, res: Response): Promise<void> => {
    const pedidoId = Number(req.params.id);
    if (isNaN(pedidoId)) {
      throw new AppError("ID do pedido inválido", 400);
    }

    const usuarioId = req.user!.id;
    const perfil = req.user!.perfil;

    await this.pedidoOracaoService.delete(pedidoId, usuarioId, perfil);

    res.status(200).json({
      sucess: true,
      message: "Pedido de oração removido com sucesso",
    });
  };
}
