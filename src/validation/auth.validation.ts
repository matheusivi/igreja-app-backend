import { z } from 'zod';

export const RegisterSchema = z.object({
  nomeCompleto: z.string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome não pode ter mais de 100 caracteres')
    .trim(),

  email: z.email('E-mail inválido'),

  senha: z.string()
    .min(6, 'A senha deve ter pelo menos 6 caracteres')
    .max(100, 'A senha não pode ter mais de 100 caracteres')
    .regex(/(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra maiúscula e um número'),

  sexo: z.enum(['Masculino', 'Feminino'], {
    error: 'Sexo deve ser Masculino ou Feminino',
  }),

  dataNascimento: z.iso.date({ message: 'Data de nascimento inválida' })
    .optional(),

  estadoCivil: z.string()
    .max(30, 'Estado civil não pode ter mais de 30 caracteres')
    .trim()
    .optional(),

  profissao: z.string()
    .max(100, 'Profissão não pode ter mais de 100 caracteres')
    .trim()
    .optional(),
});

export const LoginSchema = z.object({
  email: z.email('E-mail inválido'),
  senha: z.string().min(1, 'A senha é obrigatória'),
});

export const UpdateMeSchema = z.object({
  nomeCompleto: z.string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome não pode ter mais de 100 caracteres')
    .trim()
    .optional(),

  dataNascimento: z.iso.date({ message: 'Data de nascimento inválida' })
    .optional(),

  estadoCivil: z.string()
    .max(30, 'Estado civil não pode ter mais de 30 caracteres')
    .trim()
    .optional(),

  profissao: z.string()
    .max(100, 'Profissão não pode ter mais de 100 caracteres')
    .trim()
    .optional(),

  exibirAniversario: z.boolean().optional(),

  fotoUrl: z.url('URL da foto inválida').optional(),
});

export const AtualizarPerfilSchema = z.object({
  perfil: z.enum(['Membro', 'Líder', 'Pastor', 'Administrador'], {
    error: 'Perfil inválido. Use: Membro, Líder, Pastor ou Administrador',
  }),
});


export type AtualizarPerfilInput = z.infer<typeof AtualizarPerfilSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;