/**
 * Papéis dentro de um grupo familiar.
 *
 * ═══ POR QUE SAIU DO TEXTO LIVRE ═══
 * O campo `parentesco` aceitava qualquer string de até 50 caracteres. Na
 * prática isso produz "Filho", "filho", "FILHO", "Filho do João" e "fiho"
 * como cinco valores distintos — impossível contar, filtrar ou exibir com
 * consistência. E o uso que motiva este campo é justamente o que mais precisa
 * de dado confiável: saber quem responde por qual criança na comunidade.
 *
 * ═══ POR QUE CHAVE NEUTRA, E TEXTO DERIVADO DO SEXO ═══
 * Guardar "Filha" e "Filho" como valores separados dobraria a lista e ainda
 * deixaria o dado errado no dia em que alguém escolhesse o gênero errado no
 * seletor. A chave é uma só (`filho`); a palavra exibida vem do `sexo` que a
 * pessoa já cadastrou. Em português a concordância errada salta aos olhos —
 * "Filho: Maria" é o tipo de detalhe que faz o sistema parecer descuidado.
 *
 * `pai` e `mae` são a exceção: ficam explícitos em vez de derivados. É o
 * vínculo que sustenta a fiscalização — não pode depender de um campo de
 * cadastro que a pessoa preencheu pensando em outra coisa.
 *
 * ═══ "CRIADOR" NÃO É PAPEL ═══
 * Ele era gravado AQUI, e `getCriador` procurava a string "Criador" para
 * saber quem abriu o grupo. Duas fontes de verdade para o mesmo fato — e uma
 * delas o usuário digitava: bastava ser convidado como "Criador" para
 * aparecer como dono do grupo. Quem responde isso é
 * `GrupoFamiliar.criadorUsuarioId`, que sempre existiu.
 */

export const PAPEIS_FAMILIA = [
  "pai",
  "mae",
  "conjuge",
  "filho",
  "irmao",
  "avo",
  "neto",
  "tio",
  "sobrinho",
  "outro",
] as const;

export type PapelFamilia = (typeof PAPEIS_FAMILIA)[number];

export function ehPapelValido(valor: unknown): valor is PapelFamilia {
  return (
    typeof valor === "string" &&
    (PAPEIS_FAMILIA as readonly string[]).includes(valor)
  );
}
