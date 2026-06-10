export interface UsuarioResumoResponse {
  id: number;
  nomeCompleto: string;
  fotoUrl: string | null;
  perfil: string;
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
}

export interface ListarUsuariosQuery {
  busca?: string | undefined;
  perfil?: string | undefined;
  sexo?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
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
  }[];
}

export interface AniversariantesResponse {
  mes: number;
  data: AniversariantesDiaResponse[];
}
