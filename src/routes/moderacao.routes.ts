import { Router } from "express";
import { ModeracaoController } from "../controllers/moderacao.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new ModeracaoController();

/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  DENUNCIAR E BLOQUEAR                                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * ═══ SEM `requireRole` NAS QUATRO PRIMEIRAS ═══
 * Denunciar e bloquear são de QUALQUER pessoa. Exigir perfil aqui inverteria
 * o sentido: quem mais precisa dessas ferramentas é justamente o membro comum,
 * sem cargo, que se sentiu exposto num mural onde a igreja inteira lê.
 *
 * A trava existe, mas é outra: o autor da ação vem do token. Ninguém denuncia
 * nem bloqueia em nome de outra pessoa.
 */
router.post("/denuncias", authMiddleware.authenticate, controller.denunciar);

router.post("/bloqueios", authMiddleware.authenticate, controller.bloquear);
router.delete(
  "/bloqueios/:usuarioId",
  authMiddleware.authenticate,
  controller.desbloquear,
);
router.get(
  "/bloqueios",
  authMiddleware.authenticate,
  controller.listarBloqueados,
);

/**
 * A fila da liderança.
 *
 * A restrição mora no SERVIÇO, e não num `requireRole` aqui, pelo mesmo motivo
 * de sempre neste projeto: é regra de negócio, e regra de negócio precisa
 * valer por qualquer caminho que chegue até ela — inclusive um script futuro
 * que chame o serviço sem passar por rota nenhuma.
 */
router.get("/denuncias", authMiddleware.authenticate, controller.listarDenuncias);
router.patch(
  "/denuncias/:id/resolver",
  authMiddleware.authenticate,
  controller.resolverDenuncia,
);

export { router as moderacaoRoutes };
