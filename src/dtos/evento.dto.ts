export interface CreateEventoDTO {
  titulo: string;
  descricao?: string | undefined;
  local?: string | undefined;
  dataInicio: string;
  dataFim?: string | undefined;
  tipo: string;
  cor?: string | undefined;
  recorrencia?: string | undefined;
  diaSemana?: number | undefined;
  diaDoMes?: number | undefined;
  dataFimRecorrencia?: string | undefined;
}

export interface UpdateEventoDTO {
  titulo?: string | undefined;
  descricao?: string | undefined;
  local?: string | undefined;
  dataInicio?: string | undefined;
  dataFim?: string | undefined;
  tipo?: string | undefined;
  cor?: string | undefined;
  recorrencia?: string | undefined;
  diaSemana?: number | undefined;
  diaDoMes?: number | undefined;
  dataFimRecorrencia?: string | undefined;
}

export interface EventoResponse {
  id: number;
  titulo: string;
  descricao: string | null;
  local: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  tipo: string;
  cor: string | null;
  recorrencia: string;
  diaSemana: number | null;
  diaDoMes: number | null;
  dataFimRecorrencia: Date | null;
  criador: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  };
}

export interface EventoOcorrencia {
  id: number;
  titulo: string;
  tipo: string;
  cor: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  local: string | null;
  recorrencia: string;
}

export interface ListarEventosMesResponse {
  mes: number;
  ano: number;
  data: {
    dia: number;
    eventos: EventoOcorrencia[];
  }[];
}

export interface EventoComCriadorSimples {
  id: number;
  titulo: string;
  descricao: string | null;
  local: string | null;
  dataInicio: Date;
  dataFim: Date | null;
  tipo: string;
  cor: string | null;
  recorrencia: string;
  diaSemana: number | null;
  diaDoMes: number | null;
  dataFimRecorrencia: Date | null;
  criadorId: number;
  criador: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  } | null;
}
