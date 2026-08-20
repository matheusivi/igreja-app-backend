import { z } from 'zod';
import { PAPEIS_FAMILIA } from '../domain/papelFamilia';

/**
 * O papel na família, vindo da lista fechada.
 *
 * `null` é aceito de propósito: é assim que se LIMPA um papel definido por
 * engano. Campo ausente significa "não mexer" — sem essa distinção, corrigir
 * um erro exigiria remover a pessoa do grupo e convidá-la de novo, que é
 * exatamente o que acontecia antes.
 */
const papelSchema = z.enum(PAPEIS_FAMILIA, {
    error: 'Papel na família inválido',
});

/**
 * Foto do grupo (URL do Cloudinary). `null` é aceito de propósito: é assim que
 * o app remove a foto, já que campo ausente significa "não mexer".
 */
const imagemUrlSchema = z.union([z.url('URL da imagem inválida'), z.null()]);

export const CreateGrupoFamiliarSchema = z.object({
    nome: z.string().max(100, 'O nome não pode ter mais de 100 caracteres').trim().optional(),
    imagemUrl: imagemUrlSchema.optional(),
});

export const UpdateGrupoFamiliarSchema = z.object({
    nome: z.string().max(100, 'O nome não pode ter mais de 100 caracteres').trim().optional(),
    imagemUrl: imagemUrlSchema.optional(),
});

export const ConvidarMembroSchema = z.object({
    usuarioId: z.number({ error: 'ID do usuário é obrigatório' }).int().positive(),
    parentesco: papelSchema.optional(),
});

export const AtualizarPapelSchema = z.object({
    parentesco: z.union([papelSchema, z.null()]),
});

export const ListarFamiliasQuerySchema = z.object({
    busca: z.string().trim().optional(),
    // Teto de 50: a lista traz os membros de cada família junto, então cada
    // item pesa muito mais que uma linha de usuário. Sem teto, `?limit=1000`
    // puxaria a igreja inteira com todas as fotos numa resposta só.
    limit: z.coerce.number().int().min(1).max(50).default(20),
    page: z.coerce.number().int().min(1).default(1),
});

export const ResponderConviteSchema = z.object({
    status: z.enum(['aceito', 'recusado'], {
        error: 'Status é obrigatório',
    }),
});