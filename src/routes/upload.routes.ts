import { Router } from "express";
import { UploadController } from "../controllers/upload.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { uploadMiddleware } from "../middlewares/upload.middleware";

const router = Router();
const uploadController = new UploadController();

// Só usuário autenticado envia imagem — evita virar hospedagem aberta.
router.post(
  "/",
  authMiddleware.authenticate,
  uploadMiddleware,
  uploadController.enviarImagem,
);

export { router as uploadRoutes };
