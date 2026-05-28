// src/routes/matricula.routes.ts
import { Router } from 'express';
import { MatriculaController } from '../controllers/matricula.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const matriculaController = new MatriculaController();

// ====================== ROTAS DO MEMBRO ======================

// Usuário se matricula em uma sala
router.post('/:salaId',
    authMiddleware.authenticate,
    matriculaController.matricular
);

// Usuário cancela sua própria matrícula
router.delete('/:salaId',
    authMiddleware.authenticate,
    matriculaController.cancelar
);

// ====================== ROTAS DO LÍDER / PASTOR / ADMIN ======================

// Lista participantes de uma sala
router.get('/sala/:salaId/participantes',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    matriculaController.listarParticipantes
);

// Remove um participante da sala
router.delete('/sala/:salaId/participantes/:usuarioId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    matriculaController.removerParticipante
);

// Atualiza status de um participante
router.patch('/sala/:salaId/participantes/:usuarioId/status',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    matriculaController.atualizarStatusParticipante
);

// Histórico pessoal do usuário
router.get('/historico',
    authMiddleware.authenticate,
    matriculaController.meuHistorico
);

export { router as matriculaRoutes };