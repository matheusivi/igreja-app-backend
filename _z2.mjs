const { z } = await import('zod');
function displayDateToISO(display) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(`${y}-${mo}-${d}T00:00:00`).toISOString();
}
const ini = displayDateToISO('31/07/2026');
const fim = displayDateToISO('12/08/2026');
console.log('dataInicio ->', ini);
console.log('dataFim    ->', fim);
console.log('z.iso.datetime() inicio:', JSON.stringify(z.iso.datetime().safeParse(ini).error?.issues ?? 'OK'));
console.log('z.iso.datetime() fim   :', JSON.stringify(z.iso.datetime().safeParse(fim).error?.issues ?? 'OK'));
