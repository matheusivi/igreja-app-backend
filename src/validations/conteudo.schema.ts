// src/schemas/conteudo.schema.ts
import { z } from 'zod';

export const CreateConteudoSchema = z.object({
  tipo: z.enum(['Estudo', 'Devocional', 'Aviso', 'Material', 'Apresentacao'], {
    message: 'Tipo de conteúdo inválido'
  }),

  titulo: z.string()
    .min(3, "O título deve ter pelo menos 3 caracteres")
    .max(200, "O título não pode ter mais de 200 caracteres")
    .trim(),

  texto: z.string()
    .min(10, "O texto deve ter pelo menos 10 caracteres")
    .optional(),

  imagemUrl: z.url("URL da imagem inválida").optional(),
  
  videoUrl: z.url("URL do vídeo inválida").optional(),

  formato: z.enum(['texto', 'imagem', 'vídeo', 'combinacao'], {
    message: 'Formato inválido'
  }),

  principal: z.boolean().optional().default(false),

  dataValidade: z.iso.datetime({ message: "Data de validade inválida" }).optional(),
});

export const UpdateConteudoSchema = z.object({
  tipo: z.enum(['Estudo', 'Devocional', 'Aviso', 'Material', 'Apresentacao']).optional(),

  titulo: z.string()
    .min(3, "O título deve ter pelo menos 3 caracteres")
    .max(200, "O título não pode ter mais de 200 caracteres")
    .trim()
    .optional(),

  texto: z.string().min(10, "O texto deve ter pelo menos 10 caracteres").optional(),
  
  imagemUrl: z.url("URL da imagem inválida").optional(),
  
  videoUrl: z.url("URL do vídeo inválida").optional(),

  formato: z.enum(['texto', 'imagem', 'vídeo', 'combinacao']).optional(),

  principal: z.boolean().optional(),

  dataValidade: z.iso.datetime({ message: "Data de validade inválida" }).optional(),
});

// Tipos inferidos do Zod
export type CreateConteudoInput = z.infer<typeof CreateConteudoSchema>;
export type UpdateConteudoInput = z.infer<typeof UpdateConteudoSchema>;