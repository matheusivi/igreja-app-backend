import { z } from "zod";

export const CreatePedidoOracaoSchema = z.object({
  descricaoPedido: z
    .string()
    .min(5, "O pedido deve ter pelo menos 5 caracteres")
    .max(5000, "O pedido não pode ter mais de 5000 caracteres")
    .trim(),
});

export const UpdatePedidoOracaoSchema = z.object({
  descricaoPedido: z
    .string()
    .min(5, "O pedido deve ter pelo menos 5 caracteres")
    .max(5000, "O pedido não pode ter mais de 5000 caracteres")
    .trim(),
});

/**
 * Filtros da listagem do mural.
 *
 * ═══ POR QUE O TETO DE 50 ═══
 * O controller lia `Number(req.query.limit)` sem limite nenhum. Um
 * `?limit=999999` mandava o banco montar a resposta inteira na memória do
 * servidor — não é ataque sofisticado, é uma URL digitada errado.
 *
 * 15 é o que o app pede por rolagem; 50 é a folga para quem tiver motivo.
 *
 * ═══ `apenasMeus` NÃO RECEBE ID ═══
 * É um booleano de propósito. Se aceitasse `usuarioId`, qualquer pessoa
 * listaria os pedidos de outra trocando um número na URL. O id vem do token,
 * no controller — este schema só diz SE filtra, nunca POR QUEM.
 */
export const ListarPedidosOracaoQuerySchema = z.object({
  busca: z.string().trim().optional(),
  apenasMeus: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(15),
  page: z.coerce.number().int().min(1).default(1),
});
