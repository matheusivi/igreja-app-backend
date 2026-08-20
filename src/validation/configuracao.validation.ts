import { z } from "zod";

/**
 * `null` é aceito nos dois campos de propósito: é assim que se REMOVE a capa
 * (o hero volta ao emblema) ou o versículo. Campo ausente significa
 * "não mexer" — sem essa distinção, salvar só a frase apagaria a foto.
 */
export const AtualizarConfiguracaoSchema = z.object({
  heroImagemUrl: z
    .union([z.url("URL da imagem inválida"), z.null()])
    .optional(),

  versiculoHome: z
    .union([
      z
        .string()
        .trim()
        // 180 é o que cabe em três linhas no hero sem empurrar o resto da
        // Home para fora da tela. Acima disso o topo vira um parágrafo.
        .max(180, "A frase não pode ter mais de 180 caracteres"),
      z.null(),
    ])
    .optional(),
});
