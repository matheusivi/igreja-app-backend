import { Router } from "express";
import { ConfiguracaoController } from "../controllers/configuracao.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const configuracaoController = new ConfiguracaoController();

/**
 * Leitura PÚBLICA, sem token.
 *
 * O login, o cadastro e a recuperação de senha mostram o nome da igreja — e
 * acontecem ANTES de existir token. Exigir autenticação aqui deixaria
 * justamente as três primeiras telas do app sem saber de que igreja são.
 *
 * O que vaza é o que já está impresso na fachada: nome, foto e versículo.
 * Nenhum dado de pessoa passa por aqui.
 */
router.get("/", configuracaoController.obter);

// A restrição a Pastor/Administrador mora no SERVIÇO, e não aqui, porque é
// regra de negócio — a rota só garante que existe alguém autenticado.
router.patch("/", authMiddleware.authenticate, configuracaoController.atualizar);

export { router as configuracaoRoutes };
