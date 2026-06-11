import { prisma } from "../lib/prisma";
import crypto from "node:crypto";

export class PasswordResetTokenRepository {
  async criar(usuarioId: number): Promise<string> {
    // invalidar tokens anteriores do mesmo usuário
    await prisma.passwordResetToken.updateMany({
      where: { usuarioId, usado: false },
      data: { usado: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: { token, usuarioId, expiraEm },
    });

    return token;
  }

  async buscarValido(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        usuario: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
          },
        },
      },
    });
  }

  async invalidar(token: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { token },
      data: { usado: true },
    });
  }

  async limparExpirados(): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { expiraEm: { lt: new Date() } },
    });
  }
}
