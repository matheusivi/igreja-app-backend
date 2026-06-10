// src/dtos/sala.dto.ts
import { Prisma } from "@prisma/client";
// ====================== SALAS ======================
export interface CreateSalaDTO {
  cursoId: number;
  nomeSala: string;
  dataInicio?: string; // formato "YYYY-MM-DD"
  dataFim?: string; // formato "YYYY-MM-DD"
}

export interface UpdateSalaDTO {
  nomeSala?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: "ativa" | "inativa" | "concluída";
}

export interface SalaResponse {
  id: number;
  nomeSala: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string; // "ativa" | "inativa" | "concluída"
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
  nomeSala: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: string;
  curso?: {
    // ← Tornei opcional com '?'
    id: number;
    nome: string;
  } | null;
};

export interface ListarSalasResponse {
  data: SalaResponse[];
  total: number;
  page: number;
  totalPages: number;
}
