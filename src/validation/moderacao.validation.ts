import { z } from "zod";
import { TIPOS_DENUNCIAVEIS } from "../services/moderacao.services";

/**
 * Denúncia de um conteúdo.
 *
 * ═══ POR QUE O MOTIVO É LISTA FECHADA ═══
 * Texto livre parece mais generoso, mas cria dois problemas. Quem denuncia
 * trava na frente do campo em branco justo no momento em que está incomodado.
 * E quem revisa recebe cinquenta redações diferentes para o mesmo problema, o
 * que impede agrupar e priorizar.
 *
 * Seis opções cobrem o que de fato acontece num mural de igreja, e "Outro"
 * existe para o que ninguém previu.
 */
export const MOTIVOS_DENUNCIA = [
  "Conteúdo ofensivo ou agressivo",
  "Exposição de terceiros sem consentimento",
  "Conteúdo sexual ou impróprio",
  "Golpe, propaganda ou spam",
  "Discurso de ódio",
  "Outro",
] as const;

export const DenunciarSchema = z.object({
  tipo: z.enum(TIPOS_DENUNCIAVEIS, { error: "Tipo de conteúdo inválido" }),
  alvoId: z.coerce.number().int().positive(),
  motivo: z.enum(MOTIVOS_DENUNCIA, { error: "Selecione um motivo da lista" }),
});

/**
 * O id de quem se quer bloquear.
 *
 * Só o alvo. Quem bloqueia vem do token, sempre — se viesse do corpo, seria
 * possível bloquear pessoas em nome de outra.
 */
export const BloquearSchema = z.object({
  usuarioId: z.coerce.number().int().positive(),
});

export const ListarDenunciasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
