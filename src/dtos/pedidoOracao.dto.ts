export interface CreatePedidoOracaoDTO {
  descricaoPedido: string;
}

export interface ListPedidosOracaoDTO {
  busca?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
}

export interface PedidoOracaoResponse {
  id: number;
  descricaoPedido: string;
  dataEnvio: Date;
  visibilidade: string;
  autor: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  };
}

export interface PedidoOracaoComAutorSimples {
  id: number;
  descricaoPedido: string;
  dataEnvio: Date;
  visibilidade: string;
  autorUsuarioId: number;
  autor: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  } | null;
}

export interface ListarPedidosOracaoResponse {
  data: PedidoOracaoResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UpdatePedidoOracaoDTO {
  descricaoPedido?: string | undefined;
}