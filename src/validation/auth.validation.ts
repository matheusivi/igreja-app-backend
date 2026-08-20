import { z } from "zod";
import { PROFISSOES } from "../domain/profissoes";

export const RegisterSchema = z.object({
  nomeCompleto: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres")
    .max(100, "O nome não pode ter mais de 100 caracteres")
    .trim(),

  email: z.email("E-mail inválido"),

  /**
   * Oito, e não seis.
   *
   * O app já exigia 8 na tela de cadastro e na de redefinição; só este schema
   * aceitava 6. Ninguém percebia porque a tela barrava antes — mas quem
   * chamasse a API direto criava conta com senha mais fraca do que a regra
   * anunciada, e a mesma senha era recusada depois ao ser redefinida.
   *
   * Regra que existe em dois lugares com valores diferentes não é regra: é
   * uma armadilha esperando alguém chegar pelo caminho errado.
   */
  senha: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(100, "A senha não pode ter mais de 100 caracteres")
    .regex(
      /(?=.*[A-Z])(?=.*\d)/,
      "A senha deve conter pelo menos uma letra maiúscula e um número",
    ),

  sexo: z.enum(["Masculino", "Feminino"], {
    error: "Sexo deve ser Masculino ou Feminino",
  }),

  dataNascimento: z.iso
    .date({ message: "Data de nascimento inválida" })
    .optional(),

  estadoCivil: z
    .string()
    .max(30, "Estado civil não pode ter mais de 30 caracteres")
    .trim()
    .optional(),

  /**
   * Da lista fechada em `domain/profissoes`.
   *
   * ═══ SEM `null` AQUI, AO CONTRÁRIO DO UPDATE ═══
   * No cadastro não existe "limpar": ou a pessoa escolhe uma profissão, ou
   * omite o campo. `null` só faz sentido em `UpdateMeSchema`, onde significa
   * "apague o que eu tinha escolhido antes".
   *
   * Os dois schemas são parecidos e por isso convidam a serem editados
   * juntos — foi o que aconteceu, e o `null` vazou para cá. `RegisterDTO`
   * declara `string | undefined`, então o TypeScript pegou na compilação.
   */
  profissao: z
    .enum(PROFISSOES as [string, ...string[]], { error: "Profissão inválida" })
    .optional(),
});

export const LoginSchema = z.object({
  email: z.email("E-mail inválido"),
  senha: z.string().min(1, "A senha é obrigatória"),
});

export const UpdateMeSchema = z.object({
  nomeCompleto: z
    .string()
    .min(3, "O nome deve ter pelo menos 3 caracteres")
    .max(100, "O nome não pode ter mais de 100 caracteres")
    .trim()
    .optional(),

  sexo: z
    .enum(["Masculino", "Feminino"], {
      error: "Sexo deve ser Masculino ou Feminino",
    })
    .optional(),

  dataNascimento: z.iso
    .date({ message: "Data de nascimento inválida" })
    .optional(),

  estadoCivil: z
    .string()
    .max(30, "Estado civil não pode ter mais de 30 caracteres")
    .trim()
    .optional(),

  /**
   * Da lista fechada em `domain/profissoes`. `null` limpa a profissão.
   *
   * O texto livre saiu: gerava "Pedreiro", "pedreiro" e "Pedreiro autônomo"
   * como três coisas distintas, e quem procurava um pedreiro encontrava uma
   * delas. A descrição do trabalho continua livre em `especializacao`.
   */
  profissao: z
    .union([z.enum(PROFISSOES as [string, ...string[]], { error: "Profissão inválida" }), z.null()])
    .optional(),

  exibirAniversario: z.boolean().optional(),

  /**
   * Telefone só de dígitos, guardado sem máscara.
   *
   * A máscara é assunto da tela: gravar "(67) 99999-1234" obrigaria toda
   * consulta e todo link de WhatsApp a limpar a string de novo, e bastaria um
   * lugar esquecer para o botão abrir uma conversa com número inválido.
   *
   * 10 a 13 dígitos cobre fixo com DDD (10), celular com DDD (11) e os dois
   * com o 55 na frente (12 e 13).
   *
   * `null` remove o telefone — campo ausente significa "não mexer".
   */
  telefone: z
    .union([
      z
        .string()
        .trim()
        .regex(/^\d{10,13}$/, "Telefone deve ter entre 10 e 13 dígitos, só números"),
      z.null(),
    ])
    .optional(),

  especializacao: z
    .string()
    .max(120, "Especialização não pode ter mais de 120 caracteres")
    .trim()
    .optional(),

  divulgarTrabalho: z.boolean().optional(),

  // null é aceito de propósito: é assim que o app remove a foto de perfil.
  // Só `optional()` não bastaria — campo ausente significa "não mexer".
  fotoUrl: z.union([z.url("URL da foto inválida"), z.null()]).optional(),
});

/**
 * Só os dois perfis que a igreja distribui no dia a dia.
 *
 * ═══ POR QUE PASTOR E ADMINISTRADOR FICARAM DE FORA ═══
 * Antes o enum aceitava os quatro. Um Pastor podia criar outro Administrador
 * pela mesma chamada que promove alguém a líder — e Administrador é o perfil
 * que manda em tudo, inclusive em quem é pastor.
 *
 * Esses dois passam a ser definidos direto no banco. É trabalhoso de
 * propósito: são poucas contas, mudam uma vez a cada anos, e exigir acesso ao
 * banco significa que ninguém as cria por engano nem no calor de uma
 * discussão. Facilidade só vale onde o erro é barato.
 */
export const AtualizarPerfilSchema = z.object({
  perfil: z.enum(["Membro", "Líder"], {
    error:
      "Por aqui só dá para definir Membro ou Líder. Pastor e Administrador são definidos direto no sistema.",
  }),
});

export const ForgotPasswordSchema = z.object({
  email: z.email("E-mail inválido"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  novaSenha: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(100, "A senha não pode ter mais de 100 caracteres")
    .regex(
      /(?=.*[A-Z])(?=.*\d)/,
      "A senha deve conter pelo menos uma letra maiúscula e um número",
    ),
});

export type AtualizarPerfilInput = z.infer<typeof AtualizarPerfilSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;
