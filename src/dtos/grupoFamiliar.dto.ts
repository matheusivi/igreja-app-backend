export interface CreateGrupoFamiliarDTO {
    nome?: string | undefined;
    imagemUrl?: string | null | undefined;
}

export interface UpdateGrupoFamiliarDTO {
    nome?: string | undefined;
    imagemUrl?: string | null | undefined;
}

export interface ConvidarMembroDTO {
    usuarioId: number;
    parentesco?: string | undefined;
}

export interface ResponderConviteDTO {
    status: 'aceito' | 'recusado';
}

export interface MembroFamiliaResponse {
    id: number;
    /**
     * Papel na família, da lista fechada em `domain/papelFamilia`.
     *
     * Chave neutra (`filho`), nunca a palavra exibida: a concordância de
     * gênero é feita na tela a partir do `sexo`, senão o cadastro teria
     * "Filho" e "Filha" como valores distintos para o mesmo papel.
     */
    parentesco: string | null;
    status: string;
    usuario: {
        id: number;
        nomeCompleto: string;
        perfil: string;
        fotoUrl: string | null;
        /** Só para escrever "Filha" em vez de "Filho". */
        sexo: string | null;
    };
    convidadoPor: {
        id: number;
        nomeCompleto: string;
    };
}

export interface GrupoFamiliarResponse {
    id: number;
    nome: string | null;
    imagemUrl: string | null;
    criadorUsuarioId: number;
    membros: MembroFamiliaResponse[];
}

export interface GrupoFamiliarComMembros {
    id: number;
    nome: string | null;
    imagemUrl: string | null;
    criadorUsuarioId: number;
    membros: {
        id: number;
        parentesco: string | null;
        status: string;
        usuario: {
            id: number;
            nomeCompleto: string;
            perfil: string;
            fotoUrl: string | null;
            sexo: string | null;
        } | null;
        convidadoPor: {
            id: number;
            nomeCompleto: string;
        } | null;
    }[];
}

export interface ListarGruposFamiliaresResponse {
    data: GrupoFamiliarResponse[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ConviteFamiliaPendenteResponse {
    id: number;
    grupoId: number;
    nomeGrupo: string | null;
    parentesco: string | null;
    convidadoPor: { id: number; nomeCompleto: string };
}