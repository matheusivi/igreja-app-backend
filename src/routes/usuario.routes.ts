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

router.get("/:id", authMiddleware.authenticate, usuarioController.buscarPerfil);

export { router as usuarioRoutes };
