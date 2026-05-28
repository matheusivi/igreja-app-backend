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
router.get('/me',
  authMiddleware.authenticate,
  authController.getCurrentUser
);



export { router as authRoutes };