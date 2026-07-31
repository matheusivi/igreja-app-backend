const { z } = await import('zod');
// réplica do CreateSalaSchema de sala.validation.ts
const S = z.object({
  cursoId: z.number().int().positive(),
  nomeSala: z.string().min(3).max(100).trim(),
  dataInicio: z.iso.datetime({ message: 'Data de início inválida' }).optional(),
  dataFim: z.iso.datetime({ message: 'Data de término inválida' }).optional(),
  capacidade: z.union([z.number().int().positive(), z.null()]).optional(),
});
const r = S.safeParse({
  cursoId: 15,
  nomeSala: 'Turma da manha',
  capacidade: 20,
  dataInicio: '2026-07-31T00:00:00.000Z',
  dataFim: '2026-08-12T00:00:00.000Z',
});
console.log(r.success ? 'OK — passa' : JSON.stringify(r.error.issues, null, 2));
