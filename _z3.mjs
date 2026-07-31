const { z } = await import('zod');
for (const v of ['2026-07-31T00:00:00.000Z','2026-08-12T00:00:00.000Z']) {
  const r = z.iso.datetime({ message: 'Data inválida' }).safeParse(v);
  console.log(v, '->', r.success ? 'OK' : JSON.stringify(r.error.issues));
}
