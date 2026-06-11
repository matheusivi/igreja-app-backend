import { prisma } from "../lib/prisma";

export class TokenRevogadoRepository {
  async revogar(token: string, expiraEm: Date): Promise<void> {
    await prisma.tokenRevogado.create({
      data: { token, expiraEm },
    });
  }

  async estaRevogado(token: string): Promise<boolean> {
    const registro = await prisma.tokenRevogado.findUnique({
      where: { token },
    });
    return registro !== null;
  }

  async limparExpirados(): Promise<void> {
    await prisma.tokenRevogado.deleteMany({
      where: { expiraEm: { lt: new Date() } },
    });
  }
}
