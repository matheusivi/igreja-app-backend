import { z } from "zod";

export const ListarUsuariosQuerySchema = z.object({
  busca: z.string().trim().optional(),
  perfil: z
    .enum(["Membro", "Líder", "Pastor", "Administrador"], {
      error: "Perfil inválido",
    })
    .optional(),
  sexo: z
    .enum(["Masculino", "Feminino"], {
      error: "Sexo inválido",
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

export const ListarProfissionaisQuerySchema = z.object({
  busca: z.string().trim().optional(),
  // Teto de 30: a lista rola infinitamente no app, então cada página é uma
  // página de rolagem, não um catálogo. Pedaço pequeno chega rápido no 4G.
  limit: z.coerce.number().int().min(1).max(30).default(15),
  page: z.coerce.number().int().min(1).default(1),
});

export const MesQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12).optional(),
});
