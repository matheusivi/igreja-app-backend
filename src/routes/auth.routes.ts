// src/routes/auth.routes.ts
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { senhaLimiter } from "../middlewares/rateLimiter";

const router = Router();
const authController = new AuthController();

// Rotas públicas
router.post("/register", authController.register);
router.post("/login", authController.login);

// Rota protegida - retorna dados do usuário logado
router.get("/me", authMiddleware.authenticate, authController.getCurrentUser);
router.patch("/me", authMiddleware.authenticate, authController.updateMe);

/**
 * Promover a Líder e rebaixar a Membro.
 *
 * ═══ POR QUE "LÍDER" SAIU DAQUI ═══
 * A rota aceitava Líder, e o corpo aceitava os quatro perfis. Somados, os
 * dois davam isto: um Líder chamava a rota passando o próprio id e
 * "Administrador", e virava administrador do app.
 *
 * Não havia tela para isso — mas rota não precisa de tela. Precisa do
 * endereço e de um token, e o token quem tem é o próprio interessado.
 *
 * Quem distribui autoridade não pode ser quem a recebeu: é a regra que separa
 * "ter um cargo" de "poder criar cargos".
 */
router.patch(
  "/usuarios/:id/perfil",
  authMiddleware.authenticate,
  authMiddleware.requireRole(
    ["Administrador", "Pastor"],
    "Só o pastor ou o administrador podem definir quem é líder.",
  ),
  authController.atualizarPerfil,
);

router.post("/logout", authMiddleware.authenticate, authController.logout);

router.post(
  "/forgot-password",
  senhaLimiter, // não divide contador com o login
  authController.forgotPassword,
);

router.post("/reset-password", senhaLimiter, authController.resetPassword);

export { router as authRoutes };
