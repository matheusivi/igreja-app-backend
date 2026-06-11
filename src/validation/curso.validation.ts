import { z } from 'zod';

const CategoriasCurso = ['Homens', 'Mulheres', 'Casais', 'Jovens', 'Geral', 'Batismo'] as const;

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

  categoria: z.enum(CategoriasCurso, {
    error: 'Categoria inválida. Use: Homens, Mulheres, Casais, Jovens ou Geral',
  }),
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

}).refine(
  (data) => {
    if (data.dataInicio && data.dataFim) {
      return new Date(data.dataInicio) <= new Date(data.dataFim);
    }
    return true;
  },
  {
    message: 'A data de término não pode ser anterior à data de início',
    path: ['dataFim'],
  }
);

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

  categoria: z.enum(CategoriasCurso, {
    error: 'Categoria inválida. Use: Homens, Mulheres, Casais, Jovens ou Geral',
  }).optional(),
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

  status: z.enum(['ativa', 'inativa', 'concluída'], {
    error: 'Status inválido. Use: ativa, inativa ou concluída',
  }).optional(),

}).refine(
  (data) => {
    if (data.dataInicio && data.dataFim) {
      return new Date(data.dataInicio) <= new Date(data.dataFim);
    }
    return true;
  },
  {
    message: 'A data de término não pode ser anterior à data de início',
    path: ['dataFim'],
  }
);

export type UpdateSalaInput = z.infer<typeof UpdateSalaSchema>;

export const IdParamSchema = z.coerce.number().int().positive("ID inválido");

export const CursoIdParamSchema = z.coerce.number().int().positive("ID do curso inválido");

export const ListSalasQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
  cursoId: z.coerce.number().int().positive().optional(),
  busca: z.string().optional(),
  cursoNome: z.string().optional(),
  liderNome: z.string().optional(),
});