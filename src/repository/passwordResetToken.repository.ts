import { prisma } from "../lib/prisma";
import crypto from "node:crypto";

/** Quantos palpites errados um código aguenta antes de morrer. */
const MAXIMO_TENTATIVAS = 5;

/** Quanto tempo o código vale. */
const VALIDADE_MINUTOS = 15;

/**
 * Sorteia 8 dígitos, com zeros à esquerda preservados.
 *
 * ═══ POR QUE `randomInt` E NÃO `Math.random()` ═══
 * `Math.random()` é previsível: quem observa alguns resultados consegue
 * deduzir os próximos, porque o gerador é uma conta determinística com
 * semente. Para código de recuperação isso é fatal. `crypto.randomInt` puxa
 * do gerador do sistema operacional, feito para não ser adivinhado.
 *
 * O `padStart` importa: sem ele, o sorteio 42 viraria "42" em vez de
 * "00000042", e os códigos baixos ficariam mais curtos — e mais fáceis.
 */
function sortearCodigo(): string {
  return crypto.randomInt(0, 100_000_000).toString().padStart(8, "0");
}

export class PasswordResetTokenRepository {
  /**
   * Cria um código novo e mata os anteriores da mesma pessoa.
   *
   * Invalidar os antigos é o que impede alguém de acumular códigos válidos:
   * pedindo dez vezes, teria dez chances simultâneas de acerto em vez de uma.
   */
  async criar(usuarioId: number): Promise<string> {
    await prisma.passwordResetToken.updateMany({
      where: { usuarioId, usado: false },
      data: { usado: true },
    });

    const token = sortearCodigo();
    const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, usuarioId, expiraEm },
    });

    return token;
  }

  /**
   * Procura o código ATIVO daquela pessoa.
   *
   * Devolve o registro mesmo que o código digitado não bata — é assim que o
   * serviço consegue contar o erro. Buscar por (usuário, código) devolveria
   * `null` no palpite errado, e o contador nunca subiria.
   */
  async buscarAtivoDoUsuario(usuarioId: number) {
    return prisma.passwordResetToken.findFirst({
      where: { usuarioId, usado: false },
      orderBy: { criadoEm: "desc" },
    });
  }

  /** Registra um palpite errado e devolve quantos já foram. */
  async registrarErro(id: number): Promise<number> {
    const atualizado = await prisma.passwordResetToken.update({
      where: { id },
      data: { tentativas: { increment: 1 } },
      select: { tentativas: true },
    });

    // Queimou as chances: o código morre aqui, e a pessoa precisa pedir outro.
    if (atualizado.tentativas >= MAXIMO_TENTATIVAS) {
      await prisma.passwordResetToken.update({
        where: { id },
        data: { usado: true },
      });
    }

    return atualizado.tentativas;
  }

  async invalidar(id: number): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usado: true },
    });
  }

  async limparExpirados(): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { expiraEm: { lt: new Date() } },
    });
  }
}

export { MAXIMO_TENTATIVAS, VALIDADE_MINUTOS };
