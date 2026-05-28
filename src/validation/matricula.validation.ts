import { z } from 'zod';

export const SalaIdParamSchema = z.coerce
    .number()
    .int('ID da sala deve ser um número inteiro')
    .positive('ID da sala deve ser maior que zero')
    .refine((id) => id > 0, {
        message: 'ID da sala inválido',
    });

export const UsuarioIdParamSchema = z.coerce
    .number()
    .int('ID do usuário deve ser um número inteiro')
    .positive('ID do usuário deve ser maior que zero');

export const AtualizarStatusSchema = z.object({
    status: z.enum(["concluido", "desistente"], {
        message: "Status deve ser 'concluido' ou 'desistente'",
    }),
});


export const MatricularSalaSchema = z.object({
    salaId: z.number().int().positive(),
});

export const MatriculaValidation = {
    SalaIdParamSchema,
    UsuarioIdParamSchema,
    AtualizarStatusSchema,
    MatricularSalaSchema,
} as const;