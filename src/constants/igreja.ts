/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  O QUE É ESPECÍFICO DESTA IGREJA, NO SERVIDOR.                        ║
 * ║                                                                       ║
 * ║  O par deste arquivo no app é `front/src/constants/igreja.ts`.        ║
 * ║  Ao adaptar para outra congregação, edite os DOIS.                    ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

/**
 * Fuso da congregação.
 *
 * ═══ POR QUE ISTO IMPORTA ═══
 * O "dia" de um evento é decidido aqui, e não pelo relógio do servidor — que
 * pode estar em UTC, num datacenter em outro continente. Sem isso, um culto
 * marcado para as 19h de domingo em Mato Grosso do Sul nasce como segunda-feira
 * no banco, e aparece no dia errado do calendário.
 *
 * Já foi bug real: um evento salvo no dia 10 aparecia no dia 8.
 *
 * ⚠️  TROQUE ao publicar para uma igreja de outro fuso. A lista completa está
 * na base IANA — "America/Sao_Paulo", "America/Manaus", "America/Belem".
 */
export const FUSO_IGREJA = "America/Campo_Grande";
