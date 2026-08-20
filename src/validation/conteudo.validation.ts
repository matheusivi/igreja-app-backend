// src/schemas/conteudo.schema.ts
import { z } from "zod";

/**
 * Um bloco do post. O conteúdo é uma sequência deles, na ordem escrita.
 *
 * `valor` é o texto do parágrafo, ou a URL da imagem/vídeo.
 */
export const BlocoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("texto"),
    valor: z.string().min(1, "Parágrafo vazio").max(20000),
  }),
  z.object({
    tipo: z.literal("imagem"),
    valor: z.url("URL da imagem inválida"),
  }),
  z.object({
    tipo: z.literal("video"),
    valor: z.url("URL do vídeo inválida"),
  }),
]);

const BlocosSchema = z
  .array(BlocoSchema)
  .min(1, "Adicione ao menos um parágrafo, imagem ou vídeo.")
  .max(200, "Conteúdo muito longo.");

export const CreateConteudoSchema = z.object({
  tipo: z.enum(
    ["Estudo", "Devocional", "Aviso", "Material", "Apresentacao"],
    { message: "Tipo de conteúdo inválido" },
  ),

  titulo: z
    .string()
    .min(3, "O título deve ter pelo menos 3 caracteres")
    .max(200, "O título não pode ter mais de 200 caracteres")
    .trim(),

  blocos: BlocosSchema,

  principal: z.boolean().optional().default(false),

  dataValidade: z.iso
    .datetime({ message: "Data de validade inválida" })
    .optional(),
});

export const UpdateConteudoSchema = z.object({
  tipo: z
    .enum(["Estudo", "Devocional", "Aviso", "Material", "Apresentacao"])
    .optional(),

  titulo: z
    .string()
    .min(3, "O título deve ter pelo menos 3 caracteres")
    .max(200, "O título não pode ter mais de 200 caracteres")
    .trim()
    .optional(),

  // Enviado inteiro quando muda: a sequência é substituída, não mesclada.
  blocos: BlocosSchema.optional(),

  principal: z.boolean().optional(),

  dataValidade: z.iso
    .datetime({ message: "Data de validade inválida" })
    .optional(),
});

// Tipos inferidos do Zod
export type CreateConteudoInput = z.infer<typeof CreateConteudoSchema>;
export type UpdateConteudoInput = z.infer<typeof UpdateConteudoSchema>;

/**
 * Filtros da listagem de avisos e devocionais.
 *
 * O controller lia `Number(req.query.limit)` sem teto. Mesmo problema do
 * mural de oração: um `?limit=999999` faz o servidor montar a resposta
 * inteira na memória.
 *
 * O padrão é 15 — o tamanho de uma rolagem no app. A Home pede 3
 * explicitamente, e continua podendo.
 */
export const ListarConteudosQuerySchema = z.object({
  tipo: z.string().trim().optional(),
  busca: z.string().trim().optional(),
  orderBy: z.enum(["recent", "oldest"]).optional(),
  incluirVencidos: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(15),
  page: z.coerce.number().int().min(1).default(1),
});
