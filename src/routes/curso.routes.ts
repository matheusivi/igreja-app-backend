import { Router } from 'express';
import { CursoController } from '../controllers/curso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const cursoController = new CursoController();

router.post('/',
  authMiddleware.authenticate,
  authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
  cursoController.create
);

router.get('/',
  authMiddleware.authenticate,
  cursoController.list
);

router.get('/:id',
  authMiddleware.authenticate,
  cursoController.getById
);


router.put('/:id',
  authMiddleware.authenticate,
  authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
  cursoController.update
);

router.delete('/:id',
  authMiddleware.authenticate,
  authMiddleware.requireRole(['Administrador', 'Pastor', 'Líder']),
  cursoController.delete
);

export { router as cursoRoutes };