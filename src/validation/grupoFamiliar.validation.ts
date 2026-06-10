import { z } from 'zod';

export const CreateGrupoFamiliarSchema = z.object({
    nome: z.string().max(100, 'O nome não pode ter mais de 100 caracteres').trim().optional(),
});

export const ConvidarMembroSchema = z.object({
    usuarioId: z.number({ error: 'ID do usuário é obrigatório' }).int().positive(),
    parentesco: z.string().max(50, 'Parentesco não pode ter mais de 50 caracteres').trim().optional(),
});

export const ResponderConviteSchema = z.object({
    status: z.enum(['aceito', 'recusado'], {
        error: 'Status é obrigatório',
    }),
});