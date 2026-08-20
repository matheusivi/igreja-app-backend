import { z } from "zod";

/**
 * O dia do plano, no formato `YYYY-MM-DD`.
 *
 * ═══ REGEX E DEPOIS CALENDÁRIO ═══
 * A expressão garante a FORMA; sozinha, ela aceita `2026-02-31`. A checagem
 * seguinte reconstrói a data e compara com o texto original — se o mês ou o
 * dia não existirem, o JavaScript "corrige" para o mês seguinte e a
 * comparação falha.
 *
 * Sem isso, dias impossíveis entrariam no banco e ficariam para sempre: não
 * aparecem em nenhuma tela (o plano não tem 31 de fevereiro), então ninguém
 * os encontraria para apagar, e ainda assim contariam no progresso.
 */
export const DiaDoPlanoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
  .refine((valor) => {
    const [ano, mes, dia] = valor.split("-").map(Number);
    const data = new Date(Date.UTC(ano!, mes! - 1, dia!));
    return (
      data.getUTCFullYear() === ano &&
      data.getUTCMonth() === mes! - 1 &&
      data.getUTCDate() === dia
    );
  }, "Esta data não existe no calendário.");

export const AnoQuerySchema = z.object({
  // Faixa larga de propósito: o app só pede o ano do plano vigente, e apertar
  // aqui só criaria um erro para o dia em que o plano virar.
  ano: z.coerce.number().int().min(2000).max(2100),
});

export const DiaParamSchema = z.object({ dia: DiaDoPlanoSchema });
