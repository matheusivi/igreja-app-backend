export const Perfis = {
    MEMBRO: 'Membro',
    LIDER: 'Líder',
    PASTOR: 'Pastor',
    ADMINISTRADOR: 'Administrador',
} as const;

export type Perfil = typeof Perfis[keyof typeof Perfis];