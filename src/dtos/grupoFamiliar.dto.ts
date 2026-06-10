export interface CreateGrupoFamiliarDTO {
    nome?: string | undefined;
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
    parentesco: string | null;
    status: string;
    usuario: {
        id: number;
        nomeCompleto: string;
        perfil: string;
        fotoUrl: string | null;
    };
    convidadoPor: {
        id: number;
        nomeCompleto: string;
    };
}

export interface GrupoFamiliarResponse {
    id: number;
    nome: string | null;
    membros: MembroFamiliaResponse[];
}

export interface GrupoFamiliarComMembros {
    id: number;
    nome: string | null;
    membros: {
        id: number;
        parentesco: string | null;
        status: string;
        usuario: {
            id: number;
            nomeCompleto: string;
            perfil: string;
            fotoUrl: string | null;
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