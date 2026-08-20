import { Router } from "express";
import { LeituraPlanoController } from "../controllers/leituraPlano.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new LeituraPlanoController();

/**
 * Progresso do plano de leitura anual.
 *
 * Sem `requireRole`: ler a Bíblia é de todo mundo. E sem `:usuarioId` em
 * lugar nenhum — quem está logado só alcança o próprio progresso, porque o id
 * vem do token.
 *
 * PUT e DELETE em vez de um POST que alterna: alternar depende do estado
 * atual, e numa rede instável a repetição desfaz o que a primeira fez. Estes
 * dois dizem o resultado desejado, e repetir não muda nada.
 */
router.get("/", authMiddleware.authenticate, controller.listar);
router.put("/:dia", authMiddleware.authenticate, controller.marcar);
router.delete("/:dia", authMiddleware.authenticate, controller.desmarcar);

export { router as leituraPlanoRoutes };
