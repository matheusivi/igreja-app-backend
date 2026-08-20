export interface RegisterDTO {
    nomeCompleto: string;
    email: string;
    senha: string;
    sexo: string; 
    dataNascimento?: string | undefined;
    estadoCivil?: string | undefined;
    profissao?: string | undefined;
}

export interface LoginDTO {
    email: string;
    senha: string;
}

/**
 * Tudo o que o app sabe sobre a pessoa logada — em UM lugar só.
 *
 * ═══ POR QUE ESTE TIPO EXISTE ═══
 * Cada rota montava a resposta à mão, escolhendo campo por campo. Quatro
 * listas parecidas, escritas em momentos diferentes, e elas divergiram:
 *
 *   /me      esquecia telefone, especializacao e divulgarTrabalho
 *   login    devolvia só id, nome, e-mail e perfil
 *   updateMe devolvia tudo
 *
 * O sintoma no app era desconcertante: a pessoa salvava o telefone, via
 * salvo, fechava o app, reabria — e o campo estava vazio. Nada tinha sido
 * perdido; o servidor só não contava aquele pedaço ao ser perguntado de novo.
 *
 * Errar assim é fácil demais quando a lista é escrita quatro vezes. Com um
 * tipo só, acrescentar um campo ao usuário quebra a compilação em todos os
 * lugares que precisam ser atualizados — e o compilador vira a checagem que
 * antes dependia de alguém lembrar.
 *
 * ⚠️  `senha` NÃO entra aqui, nunca. `buscarPorEmail` devolve a linha inteira
 * do banco (o login precisa do hash para conferir), então montar a resposta
 * espalhando esse objeto vazaria o hash para o aparelho.
 */
export interface UsuarioPublico {
    id: number;
    nomeCompleto: string;
    email: string;
    perfil: string;
    sexo: string | null;
    dataNascimento: Date | null;
    exibirAniversario: boolean;
    estadoCivil: string | null;
    fotoUrl: string | null;
    profissao: string | null;
    telefone: string | null;
    especializacao: string | null;
    divulgarTrabalho: boolean;
    batizado: boolean;
}

/** O usuário completo mais o token. Entrar e recarregar devolvem o mesmo. */
export interface AuthResponse extends UsuarioPublico {
    token: string;
}

export interface UpdateMeDTO {
  nomeCompleto?: string | undefined;
  sexo?: string | undefined;
  dataNascimento?: string | undefined;
  estadoCivil?: string | undefined;
  /** Chave da lista fechada. `null` limpa. */
  profissao?: string | null | undefined;
  exibirAniversario?: boolean | undefined;
  /** Só dígitos. `null` remove; ausente significa "não mexer". */
  telefone?: string | null | undefined;
  especializacao?: string | undefined;
  /** Opt-in do diretório profissional. Exige telefone e data de nascimento. */
  divulgarTrabalho?: boolean | undefined;
  fotoUrl?: string | null | undefined;
}