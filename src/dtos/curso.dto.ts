// src/dtos/curso.dto.ts

// ====================== CURSOS ======================
export interface CreateCursoDTO {
  nome: string;
  descricaoMaterial?: string | null | undefined;
  categoria: string;        // "Homens", "Mulheres", "Casais", "Jovens", "Adolescentes", "Geral", etc.
}

export interface UpdateCursoDTO {
  nome?: string | undefined;
  descricaoMaterial?: string | null | undefined;
  categoria?: string | undefined;
}

export interface CursoResponse {
  id: number;
  nome: string;
  descricaoMaterial?: string | null | undefined;
  categoria: string;
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
  criador?: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  } | null;
};