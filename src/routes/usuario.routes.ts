import { Router } from "express";
import { UsuarioController } from "../controllers/usuario.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const usuarioController = new UsuarioController();

router.get("/", authMiddleware.authenticate, usuarioController.listar);

router.get(
  "/aniversariantes",
  authMiddleware.authenticate,
  usuarioController.aniversariantes,
);

// ANTES de "/:id". O Express casa na ordem de registro: se "/:id" viesse
// primeiro, "profissionais" seria lido como um id e a rota devolveria 400.
// É a mesma armadilha de "/aniversariantes" logo acima.
router.get(
  "/profissionais",
  authMiddleware.authenticate,
  usuarioController.profissionais,
);

router.get("/:id", authMiddleware.authenticate, usuarioController.buscarPerfil);

export { router as usuarioRoutes };
