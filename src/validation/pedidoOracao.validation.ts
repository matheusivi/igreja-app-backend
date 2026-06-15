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