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

export interface AuthResponse {
    id: number;
    nomeCompleto: string;
    email: string;
    perfil: string;
    token: string;
} 

export interface UpdateMeDTO {
  nomeCompleto?: string | undefined;
  dataNascimento?: string | undefined;
  estadoCivil?: string | undefined;
  profissao?: string | undefined;
  exibirAniversario?: boolean | undefined;
  fotoUrl?: string | undefined;
}