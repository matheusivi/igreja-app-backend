import { Router } from "express";
import { EventoController } from "../controllers/evento.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const eventoController = new EventoController();

router.post(
  "/",
  authMiddleware.authenticate,
  authMiddleware.requireRole(["Administrador", "Pastor", "Líder"]),
  eventoController.create,
);

router.get("/", authMiddleware.authenticate, eventoController.listarPorMes);

router.get("/:id", authMiddleware.authenticate, eventoController.getById);

router.put(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.requireRole(["Administrador", "Pastor", "Líder"]),
  eventoController.update,
);

router.delete(
  "/:id",
  authMiddleware.authenticate,
  authMiddleware.requireRole(["Administrador", "Pastor", "Líder"]),
  eventoController.delete,
);

export { router as eventoRoutes };
