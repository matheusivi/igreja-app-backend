// src/dtos/sala.dto.ts
import { Prisma } from "@prisma/client";
// ====================== SALAS ======================
export interface CreateSalaDTO {
  cursoId: number;
  nomeSala: string;
  dataInicio?: string; // formato "YYYY-MM-DD"
  dataFim?: string; // formato "YYYY-MM-DD"
  capacidade?: number | null | undefined;
}

export interface UpdateSalaDTO {
  nomeSala?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: "ativa" | "inativa" | "concluída";
  capacidade?: number | null | undefined;
}

export interface SalaResponse {
  id: number;
  nomeSala: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string; // "ativa" | "inativa" | "concluída"
  capacidade: number | null;
  /**
   * Matrículas com status "ativo". Sem isto o app não tem como mostrar
   * lotação nem bloquear turma cheia.
   */
  totalMatriculas: number;
  lider: {
    id: number;
    nomeCompleto: string;
    fotoUrl: string | null;
  } | null;
  // Exposto solto além do objeto: o app agrupa turmas por curso.
  cursoId: number;
  curso: {
    id: number;
    nome: string;
  };
}

// ====================== LISTAGEM ======================

export interface ListSalasQuery {
  cursoId?: number | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  busca?: string | undefined;
  cursoNome?: string | undefined; // busca pelo nome do curso
  liderNome?: string | undefined; // busca pelo nome do criador do curso
}

export type SalaComCursoSimples = {
  id: number;
  cursoId: number;
  nomeSala: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string;
  capacidade: number | null;
  curso?: {
    // ← Tornei opcional com '?'
    id: number;
    nome: string;
  } | null;
  lider?: {
    id: number;
    nomeCompleto: string;
    fotoUrl: string | null;
  } | null;
  /** Vem do `_count` do Prisma, já filtrado por status "ativo". */
  _count?: { participantes: number } | undefined;
};

export interface ListarSalasResponse {
  data: SalaResponse[];
  total: number;
  page: number;
  totalPages: number;
}
