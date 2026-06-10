import { z } from 'zod';

export const CreateSalaSchema = z.object({
  cursoId: z.number({ error: 'ID do curso é obrigatório' }).int().positive(),

  nomeSala: z.string()
    .min(3, 'O nome da sala deve ter pelo menos 3 caracteres')
    .max(100, 'O nome da sala não pode ter mais de 100 caracteres')
    .trim(),

  dataInicio: z.iso.datetime({ message: 'Data de início inválida' }).optional(),
  dataFim: z.iso.datetime({ message: 'Data de término inválida' }).optional(),

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

export const UpdateSalaSchema = z.object({
  nomeSala: z.string()
    .min(3, 'O nome da sala deve ter pelo menos 3 caracteres')
    .max(100, 'O nome da sala não pode ter mais de 100 caracteres')
    .trim()
    .optional(),

  dataInicio: z.iso.datetime({ message: 'Data de início inválida' }).optional(),
  dataFim: z.iso.datetime({ message: 'Data de término inválida' }).optional(),

  status: z.enum(['ativa', 'inativa', 'concluída'], {
    error: 'Status inválido',
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