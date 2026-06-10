import { Router } from 'express';
import { PedidoOracaoController } from '../controllers/pedidoOracao.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const pedidoOracaoController = new PedidoOracaoController();

router.post(
    '/',
    authMiddleware.authenticate,
    pedidoOracaoController.create,
);

router.get(
    '/',
    authMiddleware.authenticate,
    pedidoOracaoController.list,
);

router.delete(
    '/:id',
    authMiddleware.authenticate,
    pedidoOracaoController.delete,
);

export { router as pedidoOracaoRoutes };