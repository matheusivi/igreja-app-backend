// src/dtos/matricula.dto.ts

// ====================== MATRÍCULA EM SALA ======================
export interface MatricularSalaDTO {
  salaId: number;
}

// ====================== RESPOSTA DE MATRÍCULA ======================
export interface MatriculaResponse {
  salaId: number;
  usuarioId: number;
  nomeSala: string;
  nomeCurso: string;
  dataMatricula: Date;
  status: string;
}

// ====================== PARTICIPANTES DA SALA (para Líder) ======================
export interface ParticipanteSalaResponse {
  usuarioId: number;
  nomeCompleto: string;
  perfil: string;
  dataMatricula: Date;
  status: "ativo" | "concluido" | "desistente" | "cancelado_pelo_usuario";
}

// ====================== ATUALIZAR STATUS (Líder) ======================
export interface AtualizarStatusParticipanteDTO {
  status: "concluido" | "desistente";
}

// ====================== HISTÓRICO DO USUÁRIO ======================
export interface HistoricoCursoResponse {
  cursoId: number;
  nomeCurso: string;
  categoria: string;
  status: string; // "em andamento" | "concluído"
  dataAdicao: Date;
  nomeSala?: string; // opcional, caso queira mostrar a sala específica
  dataMatricula?: Date;
}

// ====================== TIPOS AUXILIARES ======================
export type StatusMatricula =
  | "ativo"
  | "concluido"
  | "desistente"
  | "cancelado_pelo_usuario";

export interface ListarParticipantesResponse {
  data: ParticipanteSalaResponse[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListarHistoricoResponse {
  data: HistoricoCursoResponse[];
  total: number;
  page: number;
  totalPages: number;
}
