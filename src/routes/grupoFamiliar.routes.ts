import { Router } from 'express';
import { GrupoFamiliarController } from '../controllers/grupoFamiliar.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const grupoFamiliarController = new GrupoFamiliarController();

router.post('/', authMiddleware.authenticate, grupoFamiliarController.create);

router.post('/:grupoId/convidar', authMiddleware.authenticate, grupoFamiliarController.convidar);

// Não conflita com o PATCH de '/convites/:membroId/responder' logo abaixo:
// ':grupoId' casa com um único segmento, e aquela rota tem três.
router.patch('/:grupoId', authMiddleware.authenticate, grupoFamiliarController.update);

router.patch('/convites/:membroId/responder', authMiddleware.authenticate, grupoFamiliarController.responderConvite,);

router.get('/convites/pendentes', authMiddleware.authenticate, grupoFamiliarController.getConvitesPendentes);

router.get('/:grupoId', authMiddleware.authenticate, grupoFamiliarController.getById);

router.get('/usuario/:usuarioId', authMiddleware.authenticate, grupoFamiliarController.getByUsuario);

router.delete('/:grupoId/membros/:usuarioId', authMiddleware.authenticate, grupoFamiliarController.removerMembro);

export { router as grupoFamiliarRoutes };
