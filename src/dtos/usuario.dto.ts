export interface UsuarioResumoResponse {
  id: number;
  nomeCompleto: string;
  fotoUrl: string | null;
  perfil: string;
  /** Só para concordância de gênero ao exibir o papel na família. */
  sexo: string | null;
  /**
   * A família da pessoa, quando ela tem vínculo ACEITO em uma.
   *
   * Vem junto da pessoa de propósito. Quem procura alguém na igreja quase
   * nunca quer só o nome — quer saber de que casa aquela pessoa é, para
   * visitar, para ligar, para saber quem avisar. Buscar a pessoa e depois
   * abrir o perfil dela só para descobrir a família seriam dois passos para
   * uma pergunta só.
   *
   * `null` em ambos quando a pessoa ainda não pertence a nenhuma família —
   * que é informação útil por si: é exatamente quem a liderança precisa
   * acolher.
   */
  familiaId: number | null;
  familia: string | null;
}

export interface UsuarioPerfilResponse {
  id: number;
  nomeCompleto: string;
  email: string;
  perfil: string;
  sexo: string | null;
  fotoUrl: string | null;
  dataNascimento: Date | null;
  exibirAniversario: boolean;
  estadoCivil: string | null;
  profissao: string | null;
  batizado: boolean;
}

export interface ListarUsuariosQuery {
  busca?: string | undefined;
  perfil?: string | undefined;
  sexo?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
}

/**
 * Um profissional no diretório da comunidade.
 *
 * Repare no que NÃO está aqui: data de nascimento, idade, e-mail, família.
 * A listagem é pública para todo membro logado, então ela carrega só o que
 * serve para escolher um prestador de serviço e falar com ele. A data de
 * nascimento é usada na consulta para barrar menores de idade e fica no
 * servidor.
 */
export interface ProfissionalResponse {
  id: number;
  nomeCompleto: string;
  fotoUrl: string | null;
  profissao: string | null;
  especializacao: string | null;
  /** Só dígitos, sem máscara. A tela formata e monta o link do WhatsApp. */
  telefone: string | null;
}

export interface ListarProfissionaisResponse {
  data: ProfissionalResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListarUsuariosResponse {
  data: UsuarioResumoResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AniversariantesDiaResponse {
  dia: number;
  aniversariantes: {
    id: number;
    nomeCompleto: string;
    fotoUrl: string | null;
    perfil: string;
    /**
     * Nome do grupo familiar da pessoa, quando ela pertence a um com vínculo
     * ACEITO. `null` para quem não está em nenhum.
     *
     * Entrou para o card de aniversário da Home mostrar "Família Oliveira"
     * embaixo do nome — situa a pessoa muito melhor que o cargo, e é o que
     * uma igreja usa para se referir aos seus.
     */
    familia: string | null;
    /** Foto do grupo familiar, quando o grupo tem uma. */
    familiaFoto: string | null;
    profissao: string | null;
  }[];
}

export interface AniversariantesResponse {
  mes: number;
  data: AniversariantesDiaResponse[];
}
