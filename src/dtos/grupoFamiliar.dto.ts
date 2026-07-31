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