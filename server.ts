import "./src/config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./src/config/env";
import { prisma } from "./src/lib/prisma";
import { logger } from "./src/lib/logger";
import { cloudinaryConfigurado } from "./src/lib/cloudinary";

import {
  cadastroLimiter,
  generalLimiter,
  loginLimiter,
} from "./src/middlewares/rateLimiter";
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
import { uploadRoutes } from "./src/routes/upload.routes";
import { configuracaoRoutes } from "./src/routes/configuracao.routes";
import { leituraPlanoRoutes } from "./src/routes/leituraPlano.routes";
import { moderacaoRoutes } from "./src/routes/moderacao.routes";

// ======================
// Aplicação
// ======================
const app = express();
const PORT = env.PORT || 3000;

/**
 * Confiar no proxy que está imediatamente à frente (Nginx, na VPS).
 *
 * Sem isto, o Express enxerga o IP do proxy em toda requisição e trata a
 * internet inteira como um único cliente — o limitador de requisições
 * bloquearia a igreja toda de uma vez.
 *
 * O valor é 1, e não `true`: confiar em todos os proxies deixaria qualquer um
 * forjar o cabeçalho `X-Forwarded-For` e se passar por outro IP. Em
 * desenvolvimento não há proxy nenhum, e a configuração é inofensiva.
 */
app.set("trust proxy", 1);

// ======================
// Segurança
// ======================
app.use(helmet());
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000", "http://192.168.1.32:3000"],
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
// Um limitador POR ROTA, e não o mesmo nas duas: instância única de
// `rateLimit()` significa CONTADOR único, então login e cadastro dividiam as
// mesmas fichas. Quem se cadastrava gastava o orçamento de quem ia entrar.
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", cadastroLimiter);

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
app.use("/api/configuracao", configuracaoRoutes);
app.use("/api/familias", grupoFamiliarRoutes);
app.use("/api/eventos", eventoRoutes);
app.use("/api/plano-leitura", leituraPlanoRoutes);
app.use("/api/moderacao", moderacaoRoutes);
app.use("/api/upload", uploadRoutes);

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

  // Aviso explícito no boot: sem isso, credencial faltando só apareceria como
  // um 503 no meio de um upload, longe da causa.
  if (cloudinaryConfigurado) {
    logger.info("🖼️  Cloudinary configurado — upload de imagens disponível");
  } else {
    logger.warn(
      "⚠️  Cloudinary sem credenciais no .env — upload de imagens vai responder 503",
    );
  }
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
