// src/services/__tests__/sala.service.test.ts

import { SalaService } from "../sala.services";
import { UsuarioRepository } from "../../repository/usuario.repository";
import { SalaCursoRepository } from "../../repository/salaCurso.repository";
import type {
  CreateSalaDTO,
  UpdateSalaDTO,
  ListSalasQuery,
} from "../../dtos/sala.dto";

jest.mock("../../repository/usuario.repository");
jest.mock("../../repository/salaCurso.repository");

describe("SalaService", () => {
  /**
   * Automock da classe, não objeto escrito à mão.
   *
   * O que havia aqui era um literal com alguns métodos, empurrado ao tipo do
   * repositório por `as unknown as jest.Mocked<...>` — cast que desliga a
   * checagem e aceita um mock sem metade dos métodos. Quando o serviço ganhava
   * um método novo, o teste quebrava em EXECUÇÃO, apontando para o mock em vez
   * da mudança que causou.
   *
   * `jest.mock()` faz todos os métodos nascerem `jest.fn()`, e `jest.mocked`
   * tipa sem cast: chamada para método inexistente volta a ser erro de
   * compilação. Instância única — o `clearAllMocks` zera entre os testes.
   */
  const mockUsuarioRepository = jest.mocked(new UsuarioRepository());
  const mockSalaCursoRepository = jest.mocked(new SalaCursoRepository());
  let service: SalaService;

  const mockCursoComCriador = {
    id: 10,
    nome: "Curso de Teologia",
    criador: {
      id: 5,
      nomeCompleto: "Pastor João",
      perfil: "Pastor",
    },
  };

  const mockSala = {
    id: 100,
    nomeSala: "Sala A - Turma 2026",
    dataInicio: new Date("2026-02-01"),
    dataFim: new Date("2026-06-30"),
    status: "ativa",
    curso: mockCursoComCriador,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SalaService(mockUsuarioRepository, mockSalaCursoRepository);
  });

  // ========================
  // CREATE
  // ========================
  describe("create", () => {
    it("deve criar sala com sucesso", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue({ id: 1 } as any);
      mockSalaCursoRepository.cursoExiste.mockResolvedValue({ id: 10 } as any);
      mockSalaCursoRepository.criar.mockResolvedValue(mockSala as any);

      const dto: CreateSalaDTO = {
        cursoId: 10,
        nomeSala: "Sala A - Turma 2026",
      };

      const resultado = await service.create(dto, 1);

      expect(resultado).toBeDefined();
      expect(resultado.nomeSala).toBe("Sala A - Turma 2026");
    });
  });

  // ========================
  // LIST
  // ========================
  describe("list", () => {
    it("deve listar salas com filtros padrão", async () => {
      mockSalaCursoRepository.listar.mockResolvedValue([mockSala] as any);
      mockSalaCursoRepository.contar.mockResolvedValue(1); // adicionar
      const resultado = await service.list({}, "Masculino");

      /**
       * O `where` mudou duas vezes desde que este teste foi escrito, e ele
       * ficou para trás nas duas:
       *
       * 1. `status: "ativa"` deixou de ser fixo. Turma encerrada sumia do app
       *    até para quem participou dela; agora quem decide é a tela, e
       *    `service.list({})` — sem filtro — não gera cláusula de status.
       *
       * 2. Entrou o filtro de PÚBLICO da turma. Ele complementa o de
       *    categoria: um curso "Geral" pode ter uma turma só de homens e
       *    outra só de mulheres, e a categoria sozinha não separa as duas.
       */
      expect(mockSalaCursoRepository.listar).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              curso: {
                is: {
                  categoria: {
                    in: ["Casais", "Jovens", "Geral", "Batismo", "Homens"],
                  },
                },
              },
            },
            { OR: [{ publico: "Todos" }, { publico: "Homens" }] },
          ],
        },
        orderBy: { id: "desc" },
        take: 20,
        skip: 0,
      });

      expect(resultado.data).toHaveLength(1);
      expect(resultado.total).toBe(1);
    });

    it("deve retornar array vazio quando não encontrar salas", async () => {
      mockSalaCursoRepository.listar.mockResolvedValue([]);
      mockSalaCursoRepository.contar.mockResolvedValue(0);

      const resultado = await service.list({}, "Feminino");
      expect(resultado.data).toEqual([]);
    });
  });

  // ========================
  // UPDATE
  // ========================
  describe("update", () => {
    it("deve atualizar quando tem permissão", async () => {
      mockSalaCursoRepository.buscarParaPermissao.mockResolvedValue({
        curso: { criadorUsuarioId: 5 },
      } as any);
      mockSalaCursoRepository.atualizar.mockResolvedValue(mockSala as any);

      const resultado = await service.update(
        100,
        { nomeSala: "Nova Sala" },
        5,
        "Usuario",
      );

      expect(resultado).toBeDefined();
    });
  });

  // ========================
  // DELETE
  // ========================
  describe("delete", () => {
    it("deve deletar quando tem permissão", async () => {
      mockSalaCursoRepository.buscarParaPermissao.mockResolvedValue({
        curso: { criadorUsuarioId: 5 },
      } as any);

      await service.delete(100, 5, "Usuario");
      expect(mockSalaCursoRepository.deletar).toHaveBeenCalledWith(100);
    });
  });
});
