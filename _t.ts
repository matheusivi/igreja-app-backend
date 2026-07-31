import { CreateSalaSchema } from "./src/validation/sala.validation";
const payload = {
  cursoId: 12,
  nomeSala: "Turma da manha",
  capacidade: 20,
  dataInicio: new Date("2026-03-10T00:00:00").toISOString(),
};
console.log("enviado:", JSON.stringify(payload, null, 2));
const r = CreateSalaSchema.safeParse(payload);
console.log("sucesso:", r.success);
if (!r.success) console.log(JSON.stringify(r.error.issues, null, 2));
