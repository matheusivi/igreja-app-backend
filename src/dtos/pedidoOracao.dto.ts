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

  /**
   * Esconde do mural os pedidos de quem ESTE usuário bloqueou.
   *
   * Igual ao campo acima: vem do token, no controller, nunca do cliente. Se
   * viesse do pedido, bastaria mandar o id de outra pessoa para enxergar o
   * mural pelos olhos dela — descobrindo quem ela bloqueou, que é justamente
   * a informação que o bloqueio existe para manter privada.
   */
  filtrarBloqueadosDe?: number | undefined;
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