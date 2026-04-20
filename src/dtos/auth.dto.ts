export interface RegisterDTO {
    nomeCompleto: string;
    email: string;
    senha: string;
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