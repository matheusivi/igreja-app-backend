// src/services/__tests__/evento.fuso.test.ts

import { diaLocalDoEvento } from "../evento.services";
import { FUSO_IGREJA } from "../../constants/igreja";

/**
 * ═══ O BUG QUE ESTE ARQUIVO EXISTE PARA IMPEDIR ═══
 * O calendário agrupava os eventos por `data.getDate()`, que responde no fuso
 * do PROCESSO. Na máquina de desenvolvimento, que roda no horário de Mato
 * Grosso do Sul, dava certo. Num VPS em UTC — o padrão de praticamente todo
 * provedor — o culto de sábado às 21:00 vira 01:00 de DOMINGO, e o app
 * mostrava o evento no dia errado.
 *
 * Já foi defeito real: um evento salvo no dia 10 aparecia no dia 8.
 *
 * O que torna esse defeito perigoso é o padrão dele: só aparece DEPOIS do
 * deploy, só nos eventos da NOITE, e some quando alguém testa de manhã. É o
 * pior tipo de bug para rastrear, e o mais fácil de reintroduzir — basta
 * alguém "simplificar" a função para `data.getDate()`.
 *
 * ═══ ESTES TESTES NÃO DEPENDEM DO FUSO DA MÁQUINA ═══
 * Havia aqui um `beforeAll` fazendo `process.env.TZ = "UTC"`, para simular o
 * servidor de produção. **Não funciona**: mudar `TZ` com o Node já rodando é
 * ignorado na prática — o fuso é resolvido na inicialização do processo, e no
 * Windows isso nunca pega. O teste que dependia disso falhava na máquina de
 * quem roda em Campo Grande.
 *
 * A correção não foi forçar o fuso de outro jeito, e sim parar de precisar
 * dele: `diaLocalDoEvento` usa `Intl` com o fuso ESCRITO na chamada, então já
 * responde igual em qualquer máquina. E a comparação com o jeito ingênuo
 * virou uma comparação entre dois fusos EXPLÍCITOS, em vez de "o certo contra
 * o que a máquina achar".
 *
 * Teste que só vale num ambiente específico é teste que um dia falha por
 * motivo errado — foi o que aconteceu.
 */

/** O dia lido em UTC, que é como o servidor de produção enxergaria sem cuidado. */
function diaEmUTC(data: Date): number {
  return Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric" }).format(
      data,
    ),
  );
}

describe("diaLocalDoEvento", () => {
  it("o fuso da igreja está definido", () => {
    expect(FUSO_IGREJA).toBe("America/Campo_Grande");
  });

  /**
   * Campo Grande é UTC-4. Um culto às 21:00 de sábado é 01:00 de domingo em
   * UTC — o caso exato que quebrava.
   */
  it("culto de sábado às 21h continua no sábado", () => {
    // 2026-08-15 é um sábado. 21:00 local = 2026-08-16T01:00Z.
    const instante = new Date("2026-08-16T01:00:00.000Z");

    expect(diaLocalDoEvento(instante)).toBe(15);
  });

  it("culto de segunda às 20h continua na segunda", () => {
    // 20:00 local = 2026-08-18T00:00Z — vira o dia em UTC, não no local.
    const instante = new Date("2026-08-18T00:00:00.000Z");

    expect(diaLocalDoEvento(instante)).toBe(17);
  });

  it("evento da manhã não é afetado", () => {
    // 09:00 local = 13:00Z, mesmo dia nos dois fusos.
    const instante = new Date("2026-08-15T13:00:00.000Z");

    expect(diaLocalDoEvento(instante)).toBe(15);
  });

  /**
   * A virada do MÊS é o caso que mais assusta: dia 1º às 00:30 local é 04:30Z
   * do mesmo dia, mas dia 31 às 22:00 local é 02:00Z do dia 1º do mês
   * seguinte — e aí o evento não só muda de dia, muda de MÊS, sumindo do
   * calendário que a pessoa está olhando.
   */
  it("último dia do mês às 22h não escorrega para o mês seguinte", () => {
    // 2026-08-31 22:00 local = 2026-09-01T02:00Z.
    const instante = new Date("2026-09-01T02:00:00.000Z");

    expect(diaLocalDoEvento(instante)).toBe(31);
  });

  it("primeiro dia do mês de madrugada continua no dia 1º", () => {
    // 2026-09-01 00:30 local = 2026-09-01T04:30Z.
    const instante = new Date("2026-09-01T04:30:00.000Z");

    expect(diaLocalDoEvento(instante)).toBe(1);
  });

  /**
   * A prova de que os casos acima não são decoração: ler o mesmo instante em
   * UTC dá um dia DIFERENTE de lê-lo no fuso da igreja.
   *
   * É o cenário exato de produção — servidor em UTC, igreja em Campo Grande —
   * e a comparação não depende de onde o teste roda, porque os dois fusos
   * estão escritos na chamada.
   */
  it("em UTC o mesmo instante cai em outro dia", () => {
    const cultoDeSabadoANoite = new Date("2026-08-16T01:00:00.000Z");

    expect(diaEmUTC(cultoDeSabadoANoite)).toBe(16); // como o servidor veria
    expect(diaLocalDoEvento(cultoDeSabadoANoite)).toBe(15); // como a igreja vê
  });

  it("na virada do mês a diferença muda o MÊS, não só o dia", () => {
    // 31/08 às 22:00 em Campo Grande = 01/09 às 02:00 em UTC.
    const ultimoDiaDoMes = new Date("2026-09-01T02:00:00.000Z");

    expect(diaEmUTC(ultimoDiaDoMes)).toBe(1); // sumiria do calendário de agosto
    expect(diaLocalDoEvento(ultimoDiaDoMes)).toBe(31);
  });
});
