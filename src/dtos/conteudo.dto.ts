// src/dtos/conteudo.dto.ts

export interface CreateConteudoDTO {
  tipo: 'Estudo' | 'Devocional' | 'Aviso' | 'Material' | 'Apresentacao';
  titulo: string;
  texto?: string | undefined;
  imagemUrl?: string | undefined;
  videoUrl?: string | undefined;
  formato: 'texto' | 'imagem' | 'vídeo' | 'combinacao';
  principal?: boolean | undefined;
  dataValidade?: string | undefined;
}

export interface UpdateConteudoDTO {
  tipo?: 'Estudo' | 'Devocional' | 'Aviso' | 'Material' | 'Apresentacao' | undefined;
  titulo?: string | undefined;
  texto?: string | undefined;
  imagemUrl?: string | undefined;
  videoUrl?: string | undefined;
  formato?: 'texto' | 'imagem' | 'vídeo' | 'combinacao' | undefined;
  principal?: boolean | undefined;
  dataValidade?: string | undefined;
}

export interface ListarConteudosDTO {
  tipo?: string | undefined;
  busca?: string | undefined;
  limit?: number | undefined;
  page?: number | undefined;
  orderBy?: 'recent' | 'oldest' | undefined;
}

export interface ConteudoResponse {
  id: number;
  tipo: string;
  titulo: string;
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