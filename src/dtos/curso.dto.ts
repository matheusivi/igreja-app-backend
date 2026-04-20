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

// ====================== SALAS ======================
export interface CreateSalaDTO {
  cursoId: number;
  nomeSala: string;
  dataInicio?: string;      // formato "YYYY-MM-DD"
  dataFim?: string;         // formato "YYYY-MM-DD"
}

export interface SalaResponse {
  id: number;
  nomeSala: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string;           // "ativa" | "inativa" | "concluída"
  curso: {
    id: number;
    nome: string;
  };
}

// ====================== MATRÍCULA EM SALA ======================
export interface MatricularSalaDTO {
  salaId: number;
}




// ====================== HISTÓRICO DO USUÁRIO ======================
export interface HistoricoCursoResponse {
  cursoId: number;
  nomeCurso: string;
  categoria: string;
  status: string;           // "em andamento" | "concluído"
  dataAdicao: Date;
}

// ====================== LISTAGEM ======================

export interface ListCursosQuery {
  categoria?: string;
  busca?: string;           // busca por nome do curso
  limit?: number;
  page?: number;
  orderBy?: 'recent' | 'oldest';
}

// Para listagem de salas de um curso
export interface ListSalasQuery {
  cursoId?: number | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  busca?: string | undefined;
  cursoNome?: string | undefined;    // busca pelo nome do curso
  liderNome?: string | undefined;    // busca pelo nome do criador do curso
}

// Adicione no final do arquivo

export interface UpdateSalaDTO {
  nomeSala?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: 'ativa' | 'inativa' | 'concluída';
}

