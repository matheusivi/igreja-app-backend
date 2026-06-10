// src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { Response } from 'express';

const router = Router();
const authController = new AuthController();

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Rota protegida - retorna dados do usuário logado
router.patch(
  '/me',
  authMiddleware.authenticate,
  authController.updateMe,
);

router.patch(
  '/usuarios/:id/perfil',
  authMiddleware.authenticate,
  authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
  authController.atualizarPerfil,
);



export { router as authRoutes };