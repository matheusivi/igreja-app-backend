// src/dtos/conteudo.dto.ts

export interface CreateConteudoDTO {
  tipo: 'Estudo' | 'Devocional' | 'Aviso' | 'Material' | 'Apresentacao';
  titulo: string;
  
  // Campos separados para facilitar o frontend
  texto?: string | undefined;           // Texto principal (pode ser rich text)
  imagemUrl?: string | undefined;       // URL da imagem (se houver)
  videoUrl?: string | undefined;        // URL do vídeo (YouTube ou link direto)
  
  formato: 'texto' | 'imagem' | 'vídeo' | 'combinacao';
  principal?: boolean | undefined;      // Usado apenas para tipo "Apresentacao"
  
  // Campos opcionais por tipo
  dataValidade?: string | undefined;    // Para Avisos (opcional)
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


export interface ListarConteudosDTO {
 tipo?: string;           // filtro por tipo (Devocional, Estudo, etc.)
  busca?: string;          // busca por título
  limit?: number;          // quantidade de itens por página
  page?: number;           // número da página
  orderBy?: 'recent' | 'oldest'; // ordenação
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

