export interface CreatePedidoOracaoDTO {
  descricaoPedido: string;
}

export interface ListPedidosOracaoDTO {
  busca?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  /**
   * Quando presente, traz só os pedidos DESTE usuário.
   *
   * Preenchido pelo controller a partir do token — nunca do que o cliente
   * mandou. A aba "Meus pedidos" precisa filtrar no SERVIDOR: filtrando no
   * app, sobre a página carregada, ela apareceria vazia para quem tem pedidos
   * antigos, já que a primeira página traz os mais recentes de todo mundo.
   */
  somenteDoUsuarioId?: number | undefined;
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
    fotoUrl: string | null;
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
    fotoUrl: string | null;
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