import type {
    CreatePedidoOracaoDTO,
    ListPedidosOracaoDTO,
    PedidoOracaoResponse,
    PedidoOracaoComAutorSimples,
    ListarPedidosOracaoResponse,
} from '../dtos/pedidoOracao.dto';
import { UsuarioRepository } from '../repository/usuario.repository';
import { PedidoOracaoRepository } from '../repository/pedidoOracao.repository';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';
import {  Perfis } from '../constants/perfis';

export class PedidoOracaoService {
    private usuarioRepository: UsuarioRepository;
    private pedidoOracaoRepository: PedidoOracaoRepository;

    constructor(
        usuarioRepository?: UsuarioRepository,
        pedidoOracaoRepository?: PedidoOracaoRepository,
    ) {
        this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
        this.pedidoOracaoRepository = pedidoOracaoRepository ?? new PedidoOracaoRepository();
    }

    public async create(
        data: CreatePedidoOracaoDTO,
        usuariId: number,
    ): Promise<PedidoOracaoResponse> {
        const usuario = await this.usuarioRepository.buscarPorId(usuariId);
        if (!usuario) {
            throw new AppError('Usuário não encontrado', 400);
        }
        const novoPedido = await this.pedidoOracaoRepository.criar({
            autor: { connect: { id: usuariId } },
            descricaoPedido: data.descricaoPedido,
            visibilidade: 'todos',
        });

        return this.formatarResponse(novoPedido)
    }

public async list(
  filters: ListPedidosOracaoDTO = {},
): Promise<ListarPedidosOracaoResponse> { 
  const { busca, limit = 20, page = 1 } = filters;

  const skip = (page - 1) * limit;

  const whereClause: Prisma.PedidoOracaoWhereInput = {};
  if (busca) {
    whereClause.descricaoPedido = { contains: busca, mode: 'insensitive' };
  }

  const [pedidos, total] = await Promise.all([
    this.pedidoOracaoRepository.listar({
      where: whereClause,
      orderBy: { dataEnvio: 'desc' },
      take: limit,
      skip,
    }) as Promise<PedidoOracaoComAutorSimples[]>,
    this.pedidoOracaoRepository.contar(whereClause),
  ]);

  return {
    data: pedidos.map((pedido) => this.formatarResponse(pedido)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}


    public async delete(
        pedidoId: number,
        usuarioId: number,
        perfil: string,
    ): Promise<void> {
        const pedidoExistente = await this.pedidoOracaoRepository.buscarParaPermissao(pedidoId);

        if (!pedidoExistente) {
            throw new AppError('Pedido de oração não encontrado.', 404);
        };

        const podeDeletar =
            pedidoExistente.autorUsuarioId === usuarioId ||
            perfil === Perfis.ADMINISTRADOR ||
            perfil === Perfis.PASTOR;

        if (!podeDeletar) {
            throw new AppError('Você não tem permissão para excluir este pedido', 403);
        };

        await this.pedidoOracaoRepository.deletar(pedidoId);
    }

    private formatarResponse(
        pedido: PedidoOracaoComAutorSimples
    ): PedidoOracaoResponse {
        return {
            id: pedido.id,
            descricaoPedido: pedido.descricaoPedido,
            dataEnvio: pedido.dataEnvio,
            visibilidade: pedido.visibilidade,
            autor: {
                id: pedido.autor?.id ?? 0,
                nomeCompleto: pedido.autor?.nomeCompleto || '',
                perfil: pedido.autor?.perfil || '',
            },
        };
    }
}