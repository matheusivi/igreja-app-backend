// src/dtos/curso.dto.ts

// ====================== CURSOS ======================
export interface CapituloDTO {
  ordem: number;
  titulo: string;
  secao?: string | null | undefined;
}

export interface CreateCursoDTO {
  nome: string;
  descricaoMaterial?: string | null | undefined;
  categoria: string;        // "Homens", "Mulheres", "Casais", "Jovens", "Adolescentes", "Geral", etc.
  duracao?: string | null | undefined;
  publicoAlvo?: string | null | undefined;
  capitulos?: CapituloDTO[] | undefined;
}

export interface UpdateCursoDTO {
  nome?: string | undefined;
  descricaoMaterial?: string | null | undefined;
  categoria?: string | undefined;
  duracao?: string | null | undefined;
  publicoAlvo?: string | null | undefined;
  /** Quando enviado, substitui a ementa inteira. */
  capitulos?: CapituloDTO[] | undefined;
}

export interface CapituloResponse {
  id: number;
  ordem: number;
  titulo: string;
  secao: string | null;
}

export interface CursoResponse {
  id: number;
  nome: string;
  descricaoMaterial?: string | null | undefined;
  categoria: string;
  duracao: string | null;
  publicoAlvo: string | null;
  capitulos: CapituloResponse[];
  criador: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  };
}

// ====================== LISTAGEM ======================

export interface ListCursosQuery {
  categoria?: string;
  busca?: string;           // busca por nome do curso
  limit?: number;
  page?: number;
  orderBy?: 'recent' | 'oldest';
}

export type CursoComCriadorSimples = {
  id: number;
  nome: string;
  descricaoMaterial: string | null;
  categoria: string;
  duracao: string | null;
  publicoAlvo: string | null;
  criador?: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  } | null;
  capitulos?: CapituloResponse[] | undefined;
};

export interface ListarCursosResponse {
  data: CursoResponse[];
  total: number;
  page: number;
  totalPages: number;
}