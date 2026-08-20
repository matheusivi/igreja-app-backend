/**
 * As profissões que o diretório da comunidade reconhece.
 *
 * ═══ POR QUE SAIU DO TEXTO LIVRE ═══
 * `profissao` aceitava qualquer string de 100 caracteres. Na prática isso
 * gera "Pedreiro", "pedreiro", "Pedreiro autônomo", "pedreiro/pintor" e
 * "Trabalho com obras" como cinco coisas diferentes. Quem procura um pedreiro
 * digita "pedreiro" e encontra um deles.
 *
 * Lista fechada torna o diretório NAVEGÁVEL: dá para agrupar por categoria,
 * contar quantos há de cada ofício e, um dia, filtrar por seção — nada disso
 * é possível sobre texto que cada um escreve do seu jeito.
 *
 * ═══ O QUE A LISTA NÃO PRECISA FAZER ═══
 * Ela não precisa descrever o trabalho de ninguém com precisão. Para isso
 * existe `especializacao`, que continua livre: a chave diz "pedreiro", e a
 * pessoa escreve "reformas, acabamento e pequenos reparos" com as palavras
 * dela. Tentar cobrir cada variação na lista fechada é o caminho para uma
 * lista de 400 itens que ninguém consegue percorrer.
 *
 * ═══ POR QUE CONSTANTE, E NÃO TABELA ═══
 * Acrescentar uma profissão vira um deploy. Foi escolha consciente: a lista
 * muda uma ou duas vezes por ano, e uma tabela exigiria tela de administração,
 * permissão e o cuidado de não apagar uma profissão que alguém já usa. Muito
 * maquinário para um problema que ainda não existe.
 *
 * ═══ CHAVE E RÓTULO SEPARADOS ═══
 * O banco guarda `pedreiro`; a tela escreve "Pedreiro". Guardar o rótulo
 * significaria que corrigir um acento no futuro exigiria um UPDATE em todas
 * as linhas — e quem esquecesse de rodar ficaria com dois valores para a
 * mesma profissão, que é exatamente o problema que a lista veio resolver.
 */

export type CategoriaProfissao = {
  chave: string;
  nome: string;
  profissoes: { chave: string; nome: string }[];
};

export const CATEGORIAS_PROFISSAO: CategoriaProfissao[] = [
  {
    chave: "construcao",
    nome: "Construção e reformas",
    profissoes: [
      { chave: "pedreiro", nome: "Pedreiro" },
      { chave: "pintor", nome: "Pintor" },
      { chave: "eletricista", nome: "Eletricista" },
      { chave: "encanador", nome: "Encanador" },
      { chave: "marceneiro", nome: "Marceneiro" },
      { chave: "serralheiro", nome: "Serralheiro" },
      { chave: "gesseiro", nome: "Gesseiro" },
      { chave: "vidraceiro", nome: "Vidraceiro" },
      { chave: "arquiteto", nome: "Arquiteto" },
      { chave: "engenheiro", nome: "Engenheiro" },
    ],
  },
  {
    chave: "casa",
    nome: "Casa e cuidados",
    profissoes: [
      { chave: "diarista", nome: "Diarista" },
      { chave: "jardineiro", nome: "Jardineiro" },
      { chave: "costureira", nome: "Costureira" },
      { chave: "cuidador", nome: "Cuidador de idosos" },
      { chave: "baba", nome: "Babá" },
      { chave: "piscineiro", nome: "Piscineiro" },
    ],
  },
  {
    chave: "alimentacao",
    nome: "Alimentação",
    profissoes: [
      { chave: "cozinheiro", nome: "Cozinheiro" },
      { chave: "confeiteiro", nome: "Confeiteiro" },
      { chave: "salgadeiro", nome: "Salgadeiro" },
      { chave: "padeiro", nome: "Padeiro" },
      { chave: "acougueiro", nome: "Açougueiro" },
    ],
  },
  {
    chave: "beleza",
    nome: "Beleza e bem-estar",
    profissoes: [
      { chave: "cabeleireiro", nome: "Cabeleireiro" },
      { chave: "barbeiro", nome: "Barbeiro" },
      { chave: "manicure", nome: "Manicure" },
      { chave: "esteticista", nome: "Esteticista" },
      { chave: "maquiador", nome: "Maquiador" },
      { chave: "massagista", nome: "Massagista" },
      { chave: "personal", nome: "Personal trainer" },
    ],
  },
  {
    chave: "saude",
    nome: "Saúde",
    profissoes: [
      { chave: "medico", nome: "Médico" },
      { chave: "enfermeiro", nome: "Enfermeiro" },
      { chave: "dentista", nome: "Dentista" },
      { chave: "fisioterapeuta", nome: "Fisioterapeuta" },
      { chave: "psicologo", nome: "Psicólogo" },
      { chave: "nutricionista", nome: "Nutricionista" },
      { chave: "farmaceutico", nome: "Farmacêutico" },
      { chave: "veterinario", nome: "Veterinário" },
    ],
  },
  {
    chave: "educacao",
    nome: "Educação",
    profissoes: [
      { chave: "professor", nome: "Professor" },
      { chave: "pedagogo", nome: "Pedagogo" },
      { chave: "professor_particular", nome: "Professor particular" },
      { chave: "professor_musica", nome: "Professor de música" },
      { chave: "tradutor", nome: "Tradutor" },
    ],
  },
  {
    chave: "transporte",
    nome: "Transporte e veículos",
    profissoes: [
      { chave: "motorista", nome: "Motorista" },
      { chave: "mototaxista", nome: "Mototaxista" },
      { chave: "fretes", nome: "Fretes e mudanças" },
      { chave: "mecanico", nome: "Mecânico" },
      { chave: "funileiro", nome: "Funileiro" },
      { chave: "borracheiro", nome: "Borracheiro" },
      { chave: "lavagem_veiculos", nome: "Lavagem de veículos" },
    ],
  },
  {
    chave: "tecnologia",
    nome: "Tecnologia e comunicação",
    profissoes: [
      { chave: "desenvolvedor", nome: "Desenvolvedor" },
      { chave: "tecnico_informatica", nome: "Técnico de informática" },
      { chave: "designer", nome: "Designer" },
      { chave: "social_media", nome: "Social media" },
      { chave: "fotografo", nome: "Fotógrafo" },
      { chave: "videomaker", nome: "Videomaker" },
      { chave: "tecnico_som", nome: "Técnico de som" },
    ],
  },
  {
    chave: "negocios",
    nome: "Negócios e serviços",
    profissoes: [
      { chave: "contador", nome: "Contador" },
      { chave: "advogado", nome: "Advogado" },
      { chave: "corretor_imoveis", nome: "Corretor de imóveis" },
      { chave: "corretor_seguros", nome: "Corretor de seguros" },
      { chave: "vendedor", nome: "Vendedor" },
      { chave: "administrador", nome: "Administrador" },
      { chave: "seguranca", nome: "Segurança" },
      { chave: "artesao", nome: "Artesão" },
      { chave: "musico", nome: "Músico" },
      { chave: "eletronica", nome: "Consertos em geral" },
    ],
  },
  {
    chave: "outros",
    nome: "Outros",
    profissoes: [
      /**
       * "Outro" existe de propósito, e não como desistência.
       *
       * Sem ele, quem não se encontra na lista não preenche nada e some do
       * diretório — que é o pior resultado possível. Com ele, a pessoa entra
       * e descreve o trabalho na `especializacao`, que é livre.
       *
       * Se "Outro" virar a opção mais escolhida, é sinal de que a lista está
       * curta demais: vale olhar as especializações escritas e promover as
       * que se repetem.
       */
      { chave: "outro", nome: "Outro" },
    ],
  },
];

export const PROFISSOES = CATEGORIAS_PROFISSAO.flatMap((c) =>
  c.profissoes.map((p) => p.chave),
);

export function ehProfissaoValida(valor: unknown): boolean {
  return typeof valor === "string" && PROFISSOES.includes(valor);
}

function semAcento(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * As chaves cujo RÓTULO casa com o termo digitado.
 *
 * ═══ POR QUE ISTO PRECISA EXISTIR ═══
 * O banco guarda a chave (`eletronica`), a pessoa lê o rótulo ("Consertos em
 * geral"). Procurar direto na coluna funcionaria por acidente enquanto chave e
 * rótulo se parecessem — "pedreiro" acha `pedreiro` — e falharia calada
 * justamente onde eles divergem: quem digita "consertos" não encontraria
 * ninguém, e concluiria que a igreja não tem quem conserte nada.
 *
 * Traduzir o termo para chaves ANTES da consulta resolve isso sem guardar o
 * rótulo no banco, que é o que criaria dois lugares para a mesma verdade.
 *
 * O nome da CATEGORIA também casa: quem digita "saúde" recebe médico,
 * enfermeiro e dentista de uma vez. É a única forma de navegar por seção
 * numa tela que só tem uma caixa de busca.
 */
export function chavesPorTermo(busca?: string): string[] {
  const termo = semAcento((busca ?? "").trim());
  if (!termo) return [];

  const chaves = new Set<string>();
  for (const categoria of CATEGORIAS_PROFISSAO) {
    const categoriaCasa = semAcento(categoria.nome).includes(termo);
    for (const profissao of categoria.profissoes) {
      if (categoriaCasa || semAcento(profissao.nome).includes(termo)) {
        chaves.add(profissao.chave);
      }
    }
  }
  return [...chaves];
}
