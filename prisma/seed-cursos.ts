/**
 * Cadastra os cursos fixos da igreja (CMN) com a ementa de cada um.
 *
 * Rode com:  npx ts-node prisma/seed-cursos.ts
 *
 * É idempotente: identifica o curso pelo nome e substitui a ementa inteira.
 * Rodar duas vezes não duplica nada, e rodar de novo depois de corrigir um
 * título aqui atualiza o banco.
 */
import { prisma } from "../src/lib/prisma";

type CursoSeed = {
  nome: string;
  categoria: "Homens" | "Mulheres" | "Geral" | "Batismo";
  /** Opcional: nem todo curso tem duração divulgada. */
  duracao?: string;
  publicoAlvo?: string;
  descricaoMaterial?: string;
  /**
   * Omitir a ementa significa "não mexer nos capítulos deste curso".
   *
   * Sem essa distinção, incluir aqui um curso só para ajustar a descrição
   * apagaria a ementa que alguém tivesse cadastrado pelo app.
   */
  capitulos?: { titulo: string; secao?: string }[];
};

const CURSOS: CursoSeed[] = [
  // ===================== HOMENS =====================
  {
    nome: "Homem ao Máximo",
    categoria: "Homens",
    duracao: "12 a 13 semanas",
    publicoAlvo: "Homens a partir de 18 anos ou casados",
    descricaoMaterial:
      "Curso principal de hombridade. Ensina o homem a assumir plenamente " +
      "sua identidade masculina segundo o padrão bíblico. Trata de pureza " +
      "sexual, liderança no lar, paternidade, responsabilidade e maturidade " +
      "espiritual. É o curso base para todos os homens.",
    capitulos: [
      { titulo: "Uma sentença forte / Impedidos de entrar em Canaã" },
      { titulo: "A síndrome da Playboy" },
      { titulo: "Dez ordens ou simplesmente sugestões?" },
      { titulo: "Que rombo foi aquele na porta? / Afetuoso, mas enérgico também" },
      { titulo: "Há um sacerdote na casa? / Gorjeta – um gesto de apreciação" },
      { titulo: "Trocando de cabeça" },
      { titulo: "“As transferências de culpa terminam aqui”" },
      { titulo: "Uma caricatura de pai" },
      { titulo: "Pais ausentes" },
      { titulo: "Um casamento experimenta uma renovação / Uma questão decisiva" },
      { titulo: "Meninos adultos (homens imaturos) / O que importa é o coração" },
      { titulo: "Vá até a Cruz / Este é meu pai! / Ame a Deus com todo o fervor" },
    ],
  },
  {
    nome: "Homem de Verdade",
    categoria: "Homens",
    duracao: "12 a 13 semanas",
    publicoAlvo: "Homens a partir de 18 anos ou casados",
    descricaoMaterial:
      "Aprofunda o que significa ser um homem real. Aborda a crise da " +
      "masculinidade na sociedade atual, formação de caráter, valores, " +
      "liderança, amizade verdadeira, papel de marido e pai, e como viver " +
      "com integridade em todas as áreas da vida.",
    capitulos: [
      { titulo: "A crise da hombridade e a sociedade substituta" },
      { titulo: "Rachaduras no espelho e eis o homem!" },
      { titulo: "O poder da vida e valores que transformam a vida" },
      { titulo: "Maximizando seus recursos e permanecendo no topo" },
      { titulo: "O alicerce do caráter e nada além da verdade" },
      { titulo: "Amor ou lascívia e buscas elevadas" },
      { titulo: "O preço da grandeza e a estratégia da vitória" },
      { titulo: "Emprego garantido para sempre e liberdade financeira" },
      { titulo: "Estresse positivo e paz em todos os períodos da vida" },
      { titulo: "Liderança que funciona" },
      { titulo: "O marido irresistível e o pai fabuloso" },
      { titulo: "O amigo genuíno e o maior prazer da vida" },
    ],
  },
  {
    nome: "Marido Irresistível",
    categoria: "Homens",
    duracao: "13 a 16 semanas",
    publicoAlvo: "Homens casados ou a partir de 18 anos",
    descricaoMaterial:
      "Focado no homem casado (ou que deseja se casar). Ensina como se " +
      "tornar um marido que conquista e mantém o coração da esposa. " +
      "Trabalha decisões, caráter, pureza, comunicação, aliança matrimonial " +
      "e como investir no casamento de forma prática.",
    capitulos: [
      { titulo: "A cultura é a culpada" },
      { titulo: "Tome uma decisão" },
      { titulo: "Evite as armadilhas óbvias" },
      { titulo: "Seja correto" },
      { titulo: "Acorde!" },
      { titulo: "Interrompa a maldição!" },
      { titulo: "Determine sua própria sentença" },
      { titulo: "Abolindo a área de “acesso não permitido”" },
      { titulo: "Junte-se ao clube dos verdadeiros cavalheiros" },
      { titulo: "Adote um guia para a vida" },
      { titulo: "Mereça uma vida abençoada" },
      { titulo: "Mantenha sua esposa apaixonada por você" },
      { titulo: "Seja um homem de aliança!" },
      { titulo: "Dez investimentos que você deve fazer" },
      { titulo: "Levante-se e lute!" },
      { titulo: "Viva sem remorso" },
    ],
  },
  {
    nome: "Homens Fortes em Tempos Difíceis",
    categoria: "Homens",
    duracao: "13 semanas",
    publicoAlvo: "Homens a partir de 15 anos",
    descricaoMaterial: "Estudo baseado na vida de Daniel.",
    capitulos: [
      { titulo: "O Desafio" },
      { titulo: "A Decisão Mais Importante de Todas" },
      { titulo: "O Tutor do Meu Irmão" },
      { titulo: "Uma Disciplina Ousada" },
      { titulo: "Maturidade Masculina" },
      { titulo: "O Grande Roubo" },
      { titulo: "O Maior dos Presentes" },
      { titulo: "Coragem, Raça e Glória" },
      { titulo: "O Analfabetismo Bíblico" },
      { titulo: "O Poder de Uma Palavrinha de Três Letras" },
      { titulo: "Acorda, Pai!" },
      { titulo: "A Década da Ousadia" },
      { titulo: "A Sociedade dos Que Não se Envergonham" },
    ],
  },
  {
    nome: "Coragem",
    categoria: "Homens",
    duracao: "10 a 13 semanas",
    publicoAlvo: "Homens, com ênfase em jovens",
    descricaoMaterial:
      "Curso voltado principalmente para homens jovens. Trabalha coragem, " +
      "pureza sexual, disciplina, perseverança, identidade e como vencer as " +
      "batalhas da juventude com firmeza e ousadia.",
    capitulos: [
      { titulo: "Não despreze a sua mocidade" },
      { titulo: "Coragem" },
      { titulo: "“Bananas”" },
      { titulo: "Sexo" },
      { titulo: "Como experimentar libertação" },
      { titulo: "O homem invisível" },
      { titulo: "Muito trabalho, pouco resultado" },
      { titulo: "Ceder, curvar-se ou morrer queimado" },
      { titulo: "“Escreva na sua bermuda!”" },
      { titulo: "Os vencedores são aqueles que nunca desistem" },
    ],
  },
  {
    nome: "Minha Mulher Única",
    categoria: "Homens",
    duracao: "12 a 13 semanas",
    publicoAlvo: "Homens a partir de 18 anos ou casados",
    descricaoMaterial:
      "Versão masculina do curso Mulher Única. Ajuda o homem a compreender " +
      "a singularidade da mulher, o valor da esposa, o plano de Deus para a " +
      "submissão e o casamento, e como se relacionar de forma madura e " +
      "bíblica com ela.",
    capitulos: [
      { titulo: "A singularidade da mulher" },
      { titulo: "Uma mulher de Deus" },
      { titulo: "Aproveite a oportunidade" },
      { titulo: "Submissão: Plano de Deus" },
      { titulo: "A verdade sobre o perdão" },
      { titulo: "O poder do sexo" },
      { titulo: "Mitos sobre o casamento" },
      { titulo: "A “crise da fusão”" },
      { titulo: "Auxiliadora ou obstáculo?" },
      { titulo: "Esposas sábias e maridos empedernidos" },
      { titulo: "Não morra em casa!" },
      { titulo: "Uma mulher madura" },
    ],
  },

  // ===================== MULHERES =====================
  {
    nome: "Mulher Única",
    categoria: "Mulheres",
    duracao: "13 semanas",
    publicoAlvo: "Mulheres",
    descricaoMaterial:
      "Curso principal para mulheres. Ensina a mulher a entender sua " +
      "singularidade, identidade em Deus, o valor da submissão bíblica, " +
      "pureza, maturidade emocional e espiritual, e como ser uma esposa e " +
      "mulher segundo o padrão de Deus.",
    capitulos: [
      { titulo: "A singularidade (ou originalidade) da mulher" },
      { titulo: "Uma mulher de Deus" },
      { titulo: "Aproveite a oportunidade" },
      { titulo: "Submissão: Plano de Deus" },
      { titulo: "A verdade sobre o perdão" },
      { titulo: "O poder do sexo" },
      { titulo: "Mitos sobre o casamento" },
      { titulo: "A “crise da fusão”" },
      { titulo: "Auxiliadora ou obstáculo? (Você ajuda ou atrapalha?)" },
      { titulo: "Esposas sábias e maridos empedernidos" },
      { titulo: "Não morra em casa!" },
      { titulo: "Uma mulher madura" },
    ],
  },
  {
    nome: "Ser Mulher (Módulos 1 e 2)",
    categoria: "Mulheres",
    duracao: "11 semanas por módulo",
    publicoAlvo: "Mulheres",
    descricaoMaterial:
      "Histórias de mulheres da Bíblia. A lista de personagens pode variar conforme o material oficial da turma.",
    capitulos: [
      { titulo: "Sara", secao: "Módulo 1" },
      { titulo: "Dorcas", secao: "Módulo 1" },
      { titulo: "Marta", secao: "Módulo 1" },
      { titulo: "A viúva com a jarra de azeite", secao: "Módulo 1" },
      { titulo: "A mulher do fluxo de sangue", secao: "Módulo 1" },
      { titulo: "Débora", secao: "Módulo 1" },
      { titulo: "A mulher de Ló", secao: "Módulo 1" },
      { titulo: "A sunamita", secao: "Módulo 1" },
      { titulo: "Lídia", secao: "Módulo 1" },
      { titulo: "Miriã", secao: "Módulo 1" },
      { titulo: "Lia", secao: "Módulo 2" },
      { titulo: "Maria de Betânia", secao: "Módulo 2" },
      { titulo: "Ana", secao: "Módulo 2" },
      { titulo: "Safira", secao: "Módulo 2" },
    ],
  },
  {
    nome: "A Mulher que Prospera",
    categoria: "Mulheres",
    duracao: "10 semanas",
    publicoAlvo: "Mulheres acima de 18 anos",
    descricaoMaterial:
      "Baseado em Provérbios 31, com foco em cinco áreas críticas.",
    capitulos: [
      { titulo: "Relacionamento familiar" },
      { titulo: "Desenvolvimento de habilidades pessoais" },
      { titulo: "Caráter generoso" },
      { titulo: "Legado que deixará aos filhos" },
      { titulo: "Relação íntima com Deus" },
    ],
  },

  // ===================== GERAL =====================
  {
    nome: "Comunicação, Sexo e Dinheiro",
    categoria: "Geral",
    duracao: "13 semanas",
    publicoAlvo: "Homens e mulheres a partir de 18 anos ou casados",
    descricaoMaterial:
      "Curso para casais e adultos em geral. Trabalha as três áreas que " +
      "mais geram conflito no casamento e na vida: comunicação, sexualidade " +
      "e finanças. Ensina princípios bíblicos práticos para cada uma dessas " +
      "áreas.",
    capitulos: [
      { titulo: "O homem: a glória de Deus", secao: "Parte 1 – Comunicação" },
      { titulo: "A singularidade da mulher", secao: "Parte 1 – Comunicação" },
      { titulo: "Comunicando-nos com Deus", secao: "Parte 1 – Comunicação" },
      { titulo: "Nossa palavra é um compromisso", secao: "Parte 1 – Comunicação" },
      { titulo: "Um compromisso no casamento", secao: "Parte 1 – Comunicação" },
      { titulo: "Palavra, atitude e espírito", secao: "Parte 1 – Comunicação" },
      { titulo: "Agindo", secao: "Parte 1 – Comunicação" },
      { titulo: "De espírito para espírito", secao: "Parte 1 – Comunicação" },
      { titulo: "A santidade do sexo", secao: "Parte 2 – Sexo" },
      { titulo: "A glória da virgindade", secao: "Parte 2 – Sexo" },
      { titulo: "O princípio da libertação", secao: "Parte 2 – Sexo" },
      { titulo: "Deus criou o sexo para ser bom", secao: "Parte 2 – Sexo" },
      { titulo: "A circuncisão do casamento", secao: "Parte 2 – Sexo" },
      { titulo: "Servo ou senhor", secao: "Parte 3 – Dinheiro" },
      { titulo: "Dar e receber", secao: "Parte 3 – Dinheiro" },
      { titulo: "Dívida de amor", secao: "Parte 3 – Dinheiro" },
      { titulo: "Os princípios de investimento", secao: "Parte 3 – Dinheiro" },
      { titulo: "“Porém o maior destes é o amor”", secao: "Parte 3 – Dinheiro" },
      { titulo: "Entre em ação!", secao: "Parte 3 – Dinheiro" },
    ],
  },
  {
    nome: "Vencedores Nunca Desistem",
    categoria: "Geral",
    duracao: "13 semanas",
    publicoAlvo: "Geral, a partir de 13 anos",
    descricaoMaterial:
      "Curso sobre perseverança e vitória. Ensina como enfrentar crises, " +
      "mudanças, fracassos e adversidades com fé, sem desistir. Mostra o " +
      "caminho para sair do fracasso e viver uma vida vitoriosa segundo os " +
      "princípios de Deus.",
    capitulos: [
      { titulo: "Deus trará uma solução", secao: "Parte 1 – A Crise da Adversidade" },
      { titulo: "Deus será fiel a você", secao: "Parte 1 – A Crise da Adversidade" },
      { titulo: "Deus irá falar com você", secao: "Parte 1 – A Crise da Adversidade" },
      { titulo: "Deus irá restaurar tudo", secao: "Parte 1 – A Crise da Adversidade" },
      { titulo: "Os padrões divinos para mudanças", secao: "Parte 2 – A Crise da Mudança" },
      { titulo: "Como entrar e sair", secao: "Parte 2 – A Crise da Mudança" },
      { titulo: "Crise da meia-idade", secao: "Parte 2 – A Crise da Mudança" },
      { titulo: "O caminho para a vitória", secao: "Parte 2 – A Crise da Mudança" },
      {
        titulo: "Como passar do fracasso para o sucesso",
        secao: "Parte 3 – Preservando uma Vida Vitoriosa",
      },
      {
        titulo: "O poder de sua confissão de fé",
        secao: "Parte 3 – Preservando uma Vida Vitoriosa",
      },
      {
        titulo: "Declarando a Palavra de Deus",
        secao: "Parte 3 – Preservando uma Vida Vitoriosa",
      },
    ],
  },
  {
    nome: "O Poder do Potencial",
    categoria: "Homens",
    descricaoMaterial:
      "Baseado no livro de Edwin Louis Cole. Princípios destacados pela UDF: " +
      "fortalecer qualidades e virtudes; viver acima das injustiças e críticas; " +
      "deixar a tensão e receber a paz; lidar com conflitos psicológicos e senso " +
      "de culpa; transformar preocupação em motivação; recuperar a visão e " +
      "renovar os sonhos.",
    capitulos: [
      { titulo: "Sonhar o sonho impossível" },
      { titulo: "Marchando em um ritmo diferente" },
      { titulo: "Sua vida tem potencial" },
      { titulo: "Transforme seus negativos em positivos" },
      { titulo: "Blocos de construção do caráter" },
      { titulo: "Imagem, imagem em minha mente" },
      { titulo: "O caminho para cima é para baixo" },
      { titulo: "A confissão faz bem" },
      { titulo: "Está na sua boca" },
      { titulo: "Domine sua paixão" },
      { titulo: "Deus está bravo com você?" },
      { titulo: "Quando o inocente sofre" },
      { titulo: "Estabeleça uma ou duas prioridades" },
      { titulo: "Você está pronto para prosperar?" },
      { titulo: "Culpa? Quem precisa dela!" },
      { titulo: "O preço da paz" },
    ],
  },
  {
    nome: "Integridade Sexual",
    categoria: "Geral",
    duracao: "7 semanas",
    descricaoMaterial:
      "Os temas abaixo são os assuntos tratados no curso. A divisão oficial " +
      "semana a semana está no material do líder capacitado pela UDF.",
    capitulos: [
      { titulo: "Propósito de Deus para a sexualidade" },
      { titulo: "Pureza sexual" },
      { titulo: "Valor da virgindade" },
      { titulo: "Superação da masturbação" },
      { titulo: "Pornografia" },
      { titulo: "Lascívia" },
      { titulo: "Abusos" },
    ],
  },
  {
    nome: "Tesouro",
    categoria: "Geral",
    descricaoMaterial:
      "Curso sobre princípios de sucesso e caráter. Ensina que o verdadeiro " +
      "tesouro está no caráter, nas escolhas certas, na integridade e na " +
      "forma como a pessoa lida com o dinheiro, oportunidades e destino. " +
      "Foca em construir uma vida sólida e próspera segundo padrões " +
      "divinos.",
    capitulos: [
      { titulo: "A base para uma grande vida" },
      { titulo: "Imagine seu futuro e faça" },
      { titulo: "Busque o verdadeiro tesouro" },
      { titulo: "O caráter conta" },
      { titulo: "A natureza do dinheiro" },
      { titulo: "Mantenha o que você obtém" },
    ],
  },

  // ===================== BATISMO =====================
  // Sem `capitulos` de propósito: você não mandou a ementa, e omitir preserva
  // a que já estiver cadastrada no app. Concluir uma turma desta categoria é
  // o que marca a pessoa como batizada no perfil.
  {
    nome: "Batismo",
    categoria: "Batismo",
    descricaoMaterial:
      "O batismo é o ato público de obediência e identificação com Jesus " +
      "Cristo. Representa a morte para a vida antiga, o sepultamento do velho " +
      "homem e a ressurreição para uma nova vida em Cristo. É a declaração " +
      "pública de fé, arrependimento e compromisso de seguir a Jesus como " +
      "Senhor e Salvador.",
  },
];

async function main() {
  // O curso precisa de um criador. Usamos a liderança porque é quem de fato
  // responde pelo material — e o nome nem aparece no app.
  const responsavel = await prisma.usuario.findFirst({
    where: { perfil: { in: ["Administrador", "Pastor"] } },
    orderBy: { id: "asc" },
    select: { id: true, nomeCompleto: true, perfil: true },
  });

  if (!responsavel) {
    throw new Error(
      "Nenhum usuário Administrador ou Pastor encontrado. Promova alguém antes de rodar o seed.",
    );
  }

  console.log(
    `Cadastrando como ${responsavel.nomeCompleto} (${responsavel.perfil})\n`,
  );

  for (const curso of CURSOS) {
    const existente = await prisma.curso.findFirst({
      where: { nome: curso.nome },
      select: { id: true },
    });

    const dados = {
      nome: curso.nome,
      categoria: curso.categoria,
      duracao: curso.duracao ?? null,
      publicoAlvo: curso.publicoAlvo ?? null,
      descricaoMaterial: curso.descricaoMaterial ?? null,
    };

    const id = existente
      ? (
          await prisma.curso.update({
            where: { id: existente.id },
            data: dados,
            select: { id: true },
          })
        ).id
      : (
          await prisma.curso.create({
            data: { ...dados, criadorUsuarioId: responsavel.id },
            select: { id: true },
          })
        ).id;

    if (curso.capitulos) {
      await prisma.$transaction([
        prisma.capituloCurso.deleteMany({ where: { cursoId: id } }),
        prisma.capituloCurso.createMany({
          data: curso.capitulos.map((c, i) => ({
            cursoId: id,
            ordem: i + 1,
            titulo: c.titulo,
            secao: c.secao ?? null,
          })),
        }),
      ]);
    }

    const sufixo = curso.capitulos
      ? `${curso.capitulos.length} capítulos`
      : "ementa preservada";

    console.log(
      `${existente ? "atualizado" : "criado    "}  ${curso.nome} — ${sufixo}`,
    );
  }

  console.log(`\n${CURSOS.length} cursos prontos.`);

  await tratarCursosForaDaLista();
}

/**
 * Lida com cursos que existem no banco mas não estão nesta lista — tipicamente
 * os de teste criados à mão durante o desenvolvimento.
 *
 * Sem `--limpar` apenas lista. Com `--limpar` remove, mas só os que não têm
 * nenhuma turma: apagar um curso derruba turmas e matrículas em cascata, e
 * isso não pode acontecer por acidente ao rodar um seed.
 */
async function tratarCursosForaDaLista() {
  const nomesOficiais = CURSOS.map((c) => c.nome);

  const outros = await prisma.curso.findMany({
    where: { nome: { notIn: nomesOficiais } },
    select: {
      id: true,
      nome: true,
      _count: { select: { salas: true } },
    },
    orderBy: { id: "asc" },
  });

  if (outros.length === 0) return;

  const limpar = process.argv.includes("--limpar");
  console.log(`\n${outros.length} curso(s) fora da lista oficial:`);

  for (const curso of outros) {
    const temTurmas = curso._count.salas > 0;

    if (!limpar) {
      console.log(
        `  ${curso.nome}${temTurmas ? ` (${curso._count.salas} turma(s))` : ""}`,
      );
      continue;
    }

    if (temTurmas) {
      console.log(
        `  mantido    ${curso.nome} — tem ${curso._count.salas} turma(s), remova-as primeiro`,
      );
      continue;
    }

    await prisma.curso.delete({ where: { id: curso.id } });
    console.log(`  removido   ${curso.nome}`);
  }

  if (!limpar) {
    console.log("\n  Para removê-los: npx ts-node prisma/seed-cursos.ts --limpar");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
