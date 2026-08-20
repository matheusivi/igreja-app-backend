// src/services/__tests__/leituraPlano.service.test.ts

import { LeituraPlanoService } from "../leituraPlano.services";
import { LeituraPlanoRepository } from "../../repository/leituraPlano.repository";
import {
  AnoQuerySchema,
  DiaDoPlanoSchema,
} from "../../validation/leituraPlano.validation";

jest.mock("../../repository/leituraPlano.repository");

describe("LeituraPlanoService", () => {
  const mockRepo = jest.mocked(new LeituraPlanoRepository());
  let service: LeituraPlanoService;

  beforeEach(() => {
    jest.clearAllMocks();

    /**
     * ═══ O AUTOMOCK NÃO DEVOLVE PROMESSA SOZINHO ═══
     * `jest.mock()` faz todo método virar `jest.fn()`, e `jest.fn()` sem
     * implementação devolve `undefined` — não uma promessa resolvida. Como o
     * serviço apenas repassa o retorno do repositório, `service.marcar(...)`
     * devolvia `undefined`, e `.resolves` reclamava de não receber promessa.
     *
     * Foi o preço previsto da troca de mock: com o objeto escrito à mão, o
     * método simplesmente não existia e o erro era outro. Aqui o padrão é
     * declarar o retorno de sucesso uma vez, e cada teste sobrescreve o que
     * precisar. `clearAllMocks` zera as CHAMADAS, não as implementações, então
     * definir aqui vale para todos.
     */
    mockRepo.listarDoAno.mockResolvedValue([]);
    mockRepo.marcar.mockResolvedValue(undefined);
    mockRepo.desmarcar.mockResolvedValue(undefined);

    service = new LeituraPlanoService(mockRepo);
  });

  /**
   * ═══ O SERVIÇO NÃO VALIDA O PLANO, E ISSO É DELIBERADO ═══
   * Ele não confere se o dia existe no calendário nem se já chegou. Marcar um
   * dia futuro é livre — quem lê adiantado no domingo marca a semana — e
   * travar isso serviria a uma ideia de disciplina que não é a do projeto.
   *
   * O que os testes protegem aqui é outra coisa: que o `usuarioId` nunca vem
   * do pedido, e que marcar/desmarcar continuem idempotentes. A tela pinta o
   * dia ANTES da resposta chegar, e isso só é seguro enquanto repetir a
   * chamada não virar erro nem registro duplicado.
   */
  describe("listarDoAno", () => {
    it("devolve os dias marcados do ano", async () => {
      mockRepo.listarDoAno.mockResolvedValue(["2026-08-13", "2026-08-14"]);

      const dias = await service.listarDoAno(42, 2026);

      expect(dias).toEqual(["2026-08-13", "2026-08-14"]);
      expect(mockRepo.listarDoAno).toHaveBeenCalledWith(42, 2026);
    });

    it("devolve lista vazia para quem nunca marcou nada", async () => {
      mockRepo.listarDoAno.mockResolvedValue([]);

      await expect(service.listarDoAno(42, 2026)).resolves.toEqual([]);
    });

    /**
     * Cada pessoa só alcança o próprio progresso. Não existe rota para o
     * progresso alheio — nem para a liderança — porque quanto se lê a Bíblia
     * não é indicador de desempenho, e virar ranking pastoral estragaria a
     * prática que a ferramenta existe para apoiar.
     */
    it("passa adiante o usuário que recebeu, sem inventar outro", async () => {
      mockRepo.listarDoAno.mockResolvedValue([]);

      await service.listarDoAno(7, 2026);

      expect(mockRepo.listarDoAno).toHaveBeenCalledWith(7, 2026);
      expect(mockRepo.listarDoAno).toHaveBeenCalledTimes(1);
    });
  });

  describe("marcar e desmarcar", () => {
    it("marca o dia", async () => {
      await service.marcar(42, "2026-08-13");

      expect(mockRepo.marcar).toHaveBeenCalledWith(42, "2026-08-13");
    });

    it("desmarca o dia", async () => {
      await service.desmarcar(42, "2026-08-13");

      expect(mockRepo.desmarcar).toHaveBeenCalledWith(42, "2026-08-13");
    });

    /**
     * Marcar duas vezes não pode falhar. No 4G da igreja a requisição se
     * repete, e uma segunda chamada que estourasse erro faria a tela desfazer
     * a marcação otimista de algo que na verdade deu certo.
     *
     * A idempotência de verdade está no `upsert` do repositório; aqui o que
     * se garante é que o serviço não acrescenta nenhuma checagem de "já
     * marcou?" que quebraria essa propriedade.
     */
    it("marcar duas vezes o mesmo dia não lança erro", async () => {
      await expect(service.marcar(42, "2026-08-13")).resolves.toBeUndefined();
      await expect(service.marcar(42, "2026-08-13")).resolves.toBeUndefined();

      expect(mockRepo.marcar).toHaveBeenCalledTimes(2);
    });

    it("desmarcar o que não está marcado não lança erro", async () => {
      await expect(
        service.desmarcar(42, "2026-01-01"),
      ).resolves.toBeUndefined();
    });
  });
});

/**
 * A validação do dia é a única guarda contra lixo permanente no banco.
 *
 * Um `2026-02-31` gravado nunca apareceria em tela nenhuma — o plano não tem
 * 31 de fevereiro —, então ninguém o encontraria para apagar. E ainda assim
 * ele contaria no total de dias lidos, inflando o progresso para sempre.
 */
describe("DiaDoPlanoSchema", () => {
  it.each(["2026-01-01", "2026-08-13", "2026-12-31", "2024-02-29"])(
    "aceita %s",
    (dia) => {
      expect(DiaDoPlanoSchema.parse(dia)).toBe(dia);
    },
  );

  it.each([
    ["2026-02-30", "30 de fevereiro não existe"],
    ["2026-02-31", "31 de fevereiro não existe"],
    ["2026-13-01", "mês 13 não existe"],
    ["2026-04-31", "abril tem 30 dias"],
    ["2026-00-10", "mês zero não existe"],
    ["2026-01-00", "dia zero não existe"],
    ["2026-1-1", "sem zero à esquerda"],
    ["13/08/2026", "formato brasileiro"],
    ["2026-08-13T00:00:00Z", "com hora"],
    ["", "vazio"],
  ])("recusa %s (%s)", (dia) => {
    expect(() => DiaDoPlanoSchema.parse(dia)).toThrow();
  });

  /**
   * 2026 não é bissexto; 2024 é. A checagem reconstrói a data e compara com o
   * texto — sem ela, a expressão regular sozinha aceitaria os dois.
   */
  it("recusa 29 de fevereiro em ano não bissexto", () => {
    expect(() => DiaDoPlanoSchema.parse("2026-02-29")).toThrow();
    expect(DiaDoPlanoSchema.parse("2024-02-29")).toBe("2024-02-29");
  });
});

describe("AnoQuerySchema", () => {
  it("converte o ano que vem como texto na query", () => {
    expect(AnoQuerySchema.parse({ ano: "2026" })).toEqual({ ano: 2026 });
  });

  it.each(["1999", "2101", "abc", ""])("recusa ano %s", (ano) => {
    expect(() => AnoQuerySchema.parse({ ano })).toThrow();
  });
});
