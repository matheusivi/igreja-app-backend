import { Router } from 'express';
import { ConteudoController } from '../controllers/conteudo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const conteudoController = new ConteudoController();

router.post('/',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    conteudoController.create
);

router.get('/',
    authMiddleware.authenticate,
    conteudoController.list
)

router.get('/:id',
    authMiddleware.authenticate,
    conteudoController.getById
)



router.put('/:id', authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    conteudoController.update)

router.delete('/:id', authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    conteudoController.delete)

export { router as conteudoRoutes };