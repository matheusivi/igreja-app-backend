import { z } from 'zod';

export const CreateCursoSchema = z.object({
  nome: z.string()
    .min(3, 'O nome do curso deve ter pelo menos 3 caracteres')
    .max(150, 'O nome do curso não pode ter mais de 150 caracteres')
    .trim(),

  descricaoMaterial: z.string()
    .max(10000, 'A descrição não pode ter mais de 10000 caracteres')
    .optional()
    .nullable()
    .transform(val => val ? val.trim() : val),

  categoria: z.string()
    .min(2, "A categoria é obrigatória")
    .max(50, "A categoria não pode ter mais de 50 caracteres")
    .trim(),
});

export const CreateSalaSchema = z.object({
  cursoId: z.number({
    message: "O ID do curso é obrigatório e deve ser um número"
  }).positive("ID do curso deve ser maior que zero"),

  nomeSala: z.string()
    .min(3, "O nome da sala deve ter pelo menos 3 caracteres")
    .max(150, "O nome da sala não pode ter mais de 150 caracteres")
    .trim(),

  dataInicio: z.iso.date({ message: "Data de início inválida" })
    .optional(),

  dataFim: z.iso.date({ message: "Data de fim inválida" })
    .optional(),
});

export const UpdateCursoSchema = z.object({
  nome: z.string()
    .min(3, 'O nome do curso deve ter pelo menos 3 caracteres')
    .max(150, 'O nome do curso não pode ter mais de 150 caracteres')
    .trim()
    .optional(),

  descricaoMaterial: z.string()
    .max(10000, 'A descrição não pode ter mais de 10000 caracteres')
    .optional()
    .nullable()
    .transform(val => val ? val.trim() : val),

  categoria: z.string()
    .min(2, "A categoria é obrigatória")
    .max(50, "A categoria não pode ter mais de 50 caracteres")
    .trim()
    .optional(),
});

export type CreateCursoInput = z.infer<typeof CreateCursoSchema>;
export type UpdateCursoInput = z.infer<typeof UpdateCursoSchema>;
export type CreateSalaInput = z.infer<typeof CreateSalaSchema>;

export const UpdateSalaSchema = z.object({
  nomeSala: z.string()
    .min(3, "O nome da sala deve ter pelo menos 3 caracteres")
    .max(150, "O nome da sala não pode ter mais de 150 caracteres")
    .trim()
    .optional(),

  dataInicio: z.string().optional(),
  
  dataFim: z.string().optional(),

  status: z.enum(['ativa', 'inativa', 'concluída']).optional()
});

export type UpdateSalaInput = z.infer<typeof UpdateSalaSchema>;