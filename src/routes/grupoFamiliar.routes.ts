import { Router } from 'express';
import { GrupoFamiliarController } from '../controllers/grupoFamiliar.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const grupoFamiliarController = new GrupoFamiliarController();

router.post('/', authMiddleware.authenticate, grupoFamiliarController.create);

router.post('/:grupoId/convidar', authMiddleware.authenticate, grupoFamiliarController.convidar);

router.patch('/convites/:membroId/responder', authMiddleware.authenticate, grupoFamiliarController.responderConvite,);

router.get('/:grupoId', authMiddleware.authenticate, grupoFamiliarController.getById);

router.get('/usuario/:usuarioId', authMiddleware.authenticate, grupoFamiliarController.getByUsuario);

router.delete('/:grupoId/membros/:usuarioId', authMiddleware.authenticate, grupoFamiliarController.removerMembro);

export { router as grupoFamiliarRoutes };
