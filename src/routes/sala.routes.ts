import { Router } from 'express';
import { SalaController } from '../controllers/sala.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const salaController = new SalaController();

router.post('/:cursoId',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    salaController.create
);

router.get('/',
    authMiddleware.authenticate,
    salaController.list
);

router.get('/:id',
    authMiddleware.authenticate,
    salaController.getById
);

router.put('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    salaController.update
);

router.delete('/:id',
    authMiddleware.authenticate,
    authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
    salaController.delete
)

export { router as salaRoutes };