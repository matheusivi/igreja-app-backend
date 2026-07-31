import { z } from 'zod';

const CategoriasCurso = ['Homens', 'Mulheres', 'Casais', 'Jovens', 'Geral', 'Batismo'] as const;

/** Um item da ementa do curso. `ordem` é o número da semana/aula. */
const CapituloSchema = z.object({
  ordem: z.number().int().min(1, 'A ordem deve começar em 1'),
  titulo: z.string()
    .min(2, 'O título do capítulo deve ter pelo menos 2 caracteres')
    .max(300, 'O título do capítulo não pode ter mais de 300 caracteres')
    .trim(),
  secao: z.string().max(120).trim().optional().nullable(),
});

/** Ementa completa. Máximo generoso: o maior curso da lista tem 19 aulas. */
const CapitulosSchema = z.array(CapituloSchema).max(60, 'Ementa muito longa');

const duracaoSchema = z.string().max(60).trim().optional().nullable();
const publicoAlvoSchema = z.string().max(200).trim().optional().nullable();

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

  duracao: duracaoSchema,
  publicoAlvo: publicoAlvoSchema,
  capitulos: CapitulosSchema.optional(),
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

  categoria: z.enum(CategoriasCurso, {
    error: 'Categoria inválida. Use: Homens, Mulheres, Casais, Jovens ou Geral',
  }).optional(),

  duracao: duracaoSchema,
  publicoAlvo: publicoAlvoSchema,
  capitulos: CapitulosSchema.optional(),
});

export type CreateCursoInput = z.infer<typeof CreateCursoSchema>;
export type UpdateCursoInput = z.infer<typeof UpdateCursoSchema>;
// Os schemas e tipos de sala ficam em sala.validation.ts.


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