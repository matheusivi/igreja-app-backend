export const MatriculaStatus = {
  ATIVO: 'ativo',
  CONCLUIDO: 'concluido',
  DESISTENTE: 'desistente',
  CANCELADO_PELO_USUARIO: 'cancelado_pelo_usuario',
} as const;

export type MatriculaStatusType = typeof MatriculaStatus[keyof typeof MatriculaStatus];