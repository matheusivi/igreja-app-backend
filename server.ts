import "./src/config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./src/config/env";
import { prisma } from "./src/lib/prisma";
import { logger } from "./src/lib/logger";

import { authLimiter, generalLimiter } from "./src/middlewares/rateLimiter";
import { requestLogger } from "./src/middlewares/requestLogger.middleware";
import { errorHandler } from "./src/middlewares/error.middleware";
import { TokenRevogadoRepository } from "./src/repository/tokenRevogado.repository";
import { PasswordResetTokenRepository } from "./src/repository/passwordResetToken.repository";

import { authRoutes } from "./src/routes/auth.routes";
import { conteudoRoutes } from "./src/routes/conteudo.routes";
import { cursoRoutes } from "./src/routes/curso.routes";
import { salaRoutes } from "./src/routes/sala.routes";
import { matriculaRoutes } from "./src/routes/matricula.routes";
import { pedidoOracaoRoutes } from "./src/routes/pedidoOracao.routes";
import { grupoFamiliarRoutes } from "./src/routes/grupoFamiliar.routes";
import { usuarioRoutes } from "./src/routes/usuario.routes";
import { eventoRoutes } from "./src/routes/evento.routes";

// ======================
// Aplicação
// ======================
const app = express();
const PORT = env.PORT || 3000;

// ======================
// Segurança
// ======================
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);

// ======================
// Middlewares Globais
// ======================
app.use(generalLimiter);
app.use(express.json({ limit: env.PAYLOAD_SIZE }));
app.use(express.urlencoded({ limit: env.PAYLOAD_SIZE, extended: true }));
app.use(requestLogger);

// ======================
// Enviar Email
// ======================

const passwordResetTokenRepository = new PasswordResetTokenRepository();

// ======================
// Rate Limiting por Rota
// ======================
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ======================
// Rotas da API
// ======================
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/conteudos", conteudoRoutes);
app.use("/api/cursos", cursoRoutes);
app.use("/api/salas", salaRoutes);
app.use("/api/matriculas", matriculaRoutes);
app.use("/api/pedido-oracao", pedidoOracaoRoutes);
app.use("/api/familias", grupoFamiliarRoutes);
app.use("/api/eventos", eventoRoutes);

// ======================
// Health Check
// ======================
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    logger.error(error, "Health check falhou — banco indisponível");
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

// ======================
// Middleware 404
// ======================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada",
  });
});

// ======================
// Middleware Global de Erros
// ======================
app.use(errorHandler);

// ======================
// Limpeza de Tokens Expirados
// ======================
const tokenRevogadoRepository = new TokenRevogadoRepository();
setInterval(
  async () => {
    await tokenRevogadoRepository.limparExpirados();
    await passwordResetTokenRepository.limparExpirados();
    logger.info("🧹 Tokens expirados removidos");
  },
  24 * 60 * 60 * 1000,
);

// ======================
// Inicialização do Servidor
// ======================
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
});

// ======================
// Graceful Shutdown
// ======================
const shutdown = async (signal: string) => {
  logger.info(`${signal} recebido. Encerrando servidor...`);

  server.close(async () => {
    logger.info("Servidor HTTP encerrado.");

    try {
      await prisma.$disconnect();
      logger.info("Conexão com o banco encerrada.");
      process.exit(0);
    } catch (error) {
      logger.error(error, "Erro ao encerrar conexão com o banco.");
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
