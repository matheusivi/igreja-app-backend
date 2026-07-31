const { z } = await import('zod');
console.log('zod', z.string()._zod ? 'v4+' : 'v3');
const iso = new Date("2026-03-10T00:00:00").toISOString();
console.log('valor enviado:', iso);
console.log('datetime()  ->', z.iso.datetime().safeParse(iso).success);
const cap = z.union([z.number().int().positive(), z.null()]).optional();
console.log('capacidade 20   ->', cap.safeParse(20).success);
console.log('capacidade null ->', cap.safeParse(null).success);
console.log('nomeSala        ->', z.string().min(3).max(100).trim().safeParse("Turma da manha").success);
