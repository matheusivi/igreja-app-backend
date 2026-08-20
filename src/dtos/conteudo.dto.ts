// src/dtos/conteudo.dto.ts

/** Um item da sequência do post. */
export interface BlocoConteudo {
  tipo: 'texto' | 'imagem' | 'video';
  valor: string;
}

export interface CreateConteudoDTO {
  tipo: 'Estudo' | 'Devocional' | 'Aviso' | 'Material' | 'Apresentacao';
  titulo: string;
  blocos: BlocoConteudo[];
  principal?: boolean | undefined;
  dataValidade?: string | undefined;
}

export interface UpdateConteudoDTO {
  tipo?: 'Estudo' | 'Devocional' | 'Aviso' | 'Material' | 'Apresentacao' | undefined;
  titulo?: string | undefined;
  blocos?: BlocoConteudo[] | undefined;
  principal?: boolean | undefined;
  dataValidade?: string | undefined;
}

export interface ListarConteudosDTO {
  tipo?: string | undefined;
  /**
   * Traz também os avisos cuja validade já passou. Usado pela tela de gestão
   * — sem isso, um aviso vencido ficaria invisível e impossível de excluir.
   */
  incluirVencidos?: boolean | undefined;
  busca?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  orderBy?: 'recent' | 'oldest' | undefined;
}

export interface ConteudoResponse {
  id: number;
  tipo: string;
  titulo: string;
  /** A sequência do post, na ordem escrita. É o que a tela de leitura usa. */
  blocos: BlocoConteudo[];
  /** Derivados dos blocos — usados por listagens e resumos. */
  texto?: string | undefined;
  imagemUrl?: string | undefined;
  videoUrl?: string | undefined;
  formato: string;
  dataPublicacao: Date;
  principal: boolean;
  autor: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  };
}

// Tipo interno para o Service
export type ConteudoComUsuarioSimples = {
  id: number;
  tipo: string;
  titulo: string;
  blocos?: unknown;
  texto: string | null;
  imagemUrl: string | null;
  videoUrl: string | null;
  formato: string;
  dataPublicacao: Date;
  principal: boolean;
  dataValidade: Date | null;
  usuario?: {
    id: number;
    nomeCompleto: string;
    perfil: string;
  } | null;
};


export interface ListarConteudosResponse {
  data: ConteudoResponse[];
  total: number;
  page: number;
  totalPages: number;
}

