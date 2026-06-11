import { z } from "zod";

export const CreateEventoSchema = z
  .object({
    titulo: z
      .string()
      .min(3, "O título deve ter pelo menos 3 caracteres")
      .max(150, "O título não pode ter mais de 150 caracteres")
      .trim(),

    descricao: z
      .string()
      .max(2000, "A descrição não pode ter mais de 2000 caracteres")
      .trim()
      .optional(),

    local: z
      .string()
      .max(200, "O local não pode ter mais de 200 caracteres")
      .trim()
      .optional(),

    dataInicio: z.iso.datetime({ message: "Data de início inválida" }),

    dataFim: z.iso.datetime({ message: "Data de fim inválida" }).optional(),

    tipo: z.enum(["Culto", "Reunião", "Retiro", "Conferência", "Outro"], {
      error: "Tipo inválido",
    }),

    cor: z.string().max(7).optional(), // ex: "#FF5733"

    recorrencia: z
      .enum(["nenhuma", "semanal", "mensal"], {
        error: "Recorrência inválida",
      })
      .default("nenhuma"),

    diaSemana: z.number().int().min(0).max(6).optional(),

    diaDoMes: z.number().int().min(1).max(31).optional(),

    dataFimRecorrencia: z.iso
      .datetime({ message: "Data fim de recorrência inválida" })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.dataFim) {
        return new Date(data.dataInicio) <= new Date(data.dataFim);
      }
      return true;
    },
    {
      message: "A data de fim não pode ser anterior à data de início",
      path: ["dataFim"],
    },
  )
  .refine(
    (data) => {
      if (data.recorrencia === "semanal") {
        return data.diaSemana !== undefined;
      }
      return true;
    },
    {
      message: "diaSemana é obrigatório para recorrência semanal",
      path: ["diaSemana"],
    },
  )
  .refine(
    (data) => {
      if (data.recorrencia === "mensal") {
        return data.diaDoMes !== undefined;
      }
      return true;
    },
    {
      message: "diaDoMes é obrigatório para recorrência mensal",
      path: ["diaDoMes"],
    },
  );

export const UpdateEventoSchema = z.object({
  titulo: z
    .string()
    .min(3, "O título deve ter pelo menos 3 caracteres")
    .max(150, "O título não pode ter mais de 150 caracteres")
    .trim()
    .optional(),

  descricao: z
    .string()
    .max(2000, "A descrição não pode ter mais de 2000 caracteres")
    .trim()
    .optional(),

  local: z
    .string()
    .max(200, "O local não pode ter mais de 200 caracteres")
    .trim()
    .optional(),

  dataInicio: z.iso.datetime({ message: "Data de início inválida" }).optional(),

  dataFim: z.iso.datetime({ message: "Data de fim inválida" }).optional(),

  tipo: z
    .enum(["Culto", "Reunião", "Retiro", "Conferência", "Outro"], {
      error: "Tipo inválido",
    })
    .optional(),

  cor: z.string().max(7).optional(),

  recorrencia: z
    .enum(["nenhuma", "semanal", "mensal"], {
      error: "Recorrência inválida",
    })
    .optional(),

  diaSemana: z.number().int().min(0).max(6).optional(),
  diaDoMes: z.number().int().min(1).max(31).optional(),
  dataFimRecorrencia: z.iso
    .datetime({ message: "Data fim de recorrência inválida" })
    .optional(),
});

export const ListarEventosQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12).optional(),
  ano: z.coerce.number().int().min(2024).optional(),
});
