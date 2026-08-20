// src/services/__tests__/curso.service.test.ts

import { CursoService } from "../curso.services";
import { UsuarioRepository } from "../../repository/usuario.repository";
import { CursoRepository } from "../../repository/curso.repository";
import type {
  CreateCursoDTO,
  UpdateCursoDTO,
  ListCursosQuery,
} from "../../dtos/curso.dto";

jest.mock("../../repository/usuario.repository");
jest.mock("../../repository/curso.repository");

describe("CursoService", () => {
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
  const mockCursoRepository = jest.mocked(new CursoRepository());
  let service: CursoService;

  const mockUsuario = {
    id: 1,
    nomeCompleto: "João Silva",
    perfil: "Usuario",
    email: "joao@test.com",
    senha: "hash123",
    dataNascimento: null,
    sexo: "Masculino",
    batizado: false,
    telefone: null,
    especializacao: null,
    divulgarTrabalho: false,
    exibirAniversario: true,
    estadoCivil: null,
    fotoUrl: null,
    profissao: null,
  };

  const mockCurso = {
    id: 5,
    criadorUsuarioId: 1,
    nome: "Curso de TypeScript Avançado",
    descricaoMaterial: "Material completo...",
    categoria: "Programação",
    duracao: null,
    publicoAlvo: null,
    capitulos: [],
    criador: mockUsuario,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new CursoService(mockUsuarioRepository, mockCursoRepository);
  });

  // ========================
  // CREATE
  // ========================
  describe("create", () => {
    it("deve criar um curso com sucesso quando usuário existe", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario);
      mockCursoRepository.criar.mockResolvedValue(mockCurso);

      const dto: CreateCursoDTO = {
        nome: "Curso de TypeScript Avançado",
        descricaoMaterial: "Material completo...",
        categoria: "Programação",
      };

      const resultado = await service.create(dto, 1);

      expect(mockUsuarioRepository.buscarPorId).toHaveBeenCalledWith(1);
      expect(mockCursoRepository.criar).toHaveBeenCalledWith({
        criador: { connect: { id: 1 } },
        nome: "Curso de TypeScript Avançado",
        descricaoMaterial: "Material completo...",
        categoria: "Programação",
        duracao: null,
        publicoAlvo: null,
      });

      expect(resultado.nome).toBe("Curso de TypeScript Avançado");
      expect(resultado.criador.id).toBe(1);
    });

    it("deve criar curso com descricaoMaterial ausente (deve virar null)", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario);
      mockCursoRepository.criar.mockResolvedValue({
        ...mockCurso,
        descricaoMaterial: null,
      });

      const dto: CreateCursoDTO = {
        nome: "Curso sem descrição",
        categoria: "Programação",
      };

      const resultado = await service.create(dto, 1);

      expect(mockCursoRepository.criar).toHaveBeenCalledWith({
        criador: { connect: { id: 1 } },
        nome: "Curso sem descrição",
        descricaoMaterial: null,
        categoria: "Programação",
        duracao: null,
        publicoAlvo: null,
      });

      expect(resultado.descricaoMaterial).toBeUndefined();
    });

    it("deve lançar erro se o usuário não for encontrado", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

      const dto: CreateCursoDTO = {
        nome: "Curso Teste",
        categoria: "Geral",
      };

      await expect(service.create(dto, 999)).rejects.toThrow(
        "Usuário não encontrado.",
      );
      expect(mockCursoRepository.criar).not.toHaveBeenCalled();
    });
  });

  // ========================
  // GET BY ID
  // ========================
  describe("getById", () => {
    it("deve retornar um curso quando encontrado", async () => {
      mockCursoRepository.buscarPorId.mockResolvedValue(mockCurso);

      const resultado = await service.getById(5);

      expect(mockCursoRepository.buscarPorId).toHaveBeenCalledWith(5);
      expect(resultado.id).toBe(5);
      expect(resultado.criador).toBeDefined();
    });

    it("deve lançar erro quando curso não for encontrado", async () => {
      mockCursoRepository.buscarPorId.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow(
        "Curso não encontrado.",
      );
    });
  });

  // ========================
  // LIST
  // ========================
  describe("list", () => {
    it("deve listar cursos com filtros padrão", async () => {
      mockCursoRepository.listar.mockResolvedValue([mockCurso]);
      mockCursoRepository.contar.mockResolvedValue(1); // adicionar

      const resultado = await service.list();

      expect(mockCursoRepository.listar).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: "desc" },
        take: 20,
        skip: 0,
      });

      expect(resultado.data).toHaveLength(1); 
      expect(resultado.total).toBe(1);
      expect(resultado.page).toBe(1);
      expect(resultado.totalPages).toBe(1);
    });

    it("deve aplicar filtros de categoria e busca corretamente", async () => {
      const filters: ListCursosQuery = {
        categoria: "Programação",
        busca: "typescript",
        orderBy: "oldest",
        page: 2,
        limit: 10,
      };

      mockCursoRepository.listar.mockResolvedValue([mockCurso]);
      mockCursoRepository.contar.mockResolvedValue(1); 

      await service.list(filters);

      expect(mockCursoRepository.listar).toHaveBeenCalledWith({
        where: {
          categoria: "Programação",
          nome: { contains: "typescript", mode: "insensitive" },
        },
        orderBy: { id: "asc" },
        take: 10,
        skip: 10,
      });
    });
  });

  // ========================
  // UPDATE
  // ========================
  describe("update", () => {
    it("deve atualizar quando o usuário é o criador", async () => {
      mockCursoRepository.buscarPorId.mockResolvedValue(mockCurso);
      mockCursoRepository.atualizar.mockResolvedValue({
        ...mockCurso,
        nome: "Novo Nome Atualizado",
      });

      const dto: UpdateCursoDTO = { nome: "Novo Nome Atualizado" };

      const resultado = await service.update(5, dto, 1, "Usuario");

      expect(resultado.nome).toBe("Novo Nome Atualizado");
    });

    it("deve atualizar quando usuário é Administrador", async () => {
      mockCursoRepository.buscarPorId.mockResolvedValue(mockCurso);
      mockCursoRepository.atualizar.mockResolvedValue(mockCurso);

      await service.update(5, { nome: "Teste Admin" }, 999, "Administrador");
      expect(mockCursoRepository.atualizar).toHaveBeenCalled();
    });

    it("deve lançar erro de permissão quando usuário comum tenta atualizar curso de outro", async () => {
      mockCursoRepository.buscarPorId.mockResolvedValue(mockCurso);

      await expect(
        service.update(5, { nome: "Teste" }, 999, "Usuario"),
      ).rejects.toThrow("Você não tem permissão para atualizar este curso.");
    });

    it("deve permitir atualização parcial (apenas alguns campos)", async () => {
      mockCursoRepository.buscarPorId.mockResolvedValue(mockCurso);
      mockCursoRepository.atualizar.mockResolvedValue(mockCurso);

      const dto: UpdateCursoDTO = { nome: "Nome Parcial" };

      await service.update(5, dto, 1, "Usuario");

      expect(mockCursoRepository.atualizar).toHaveBeenCalledWith(5, {
        nome: "Nome Parcial",
      });
    });
  });

  // ========================
  // DELETE
  // ========================
  describe("delete", () => {
    it("deve deletar quando o criador exclui um curso sem matrículas", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);
      mockCursoRepository.contarMatriculas.mockResolvedValue(0);

      await service.delete(5, 1, "Usuario");

      expect(mockCursoRepository.deletar).toHaveBeenCalledWith(5);
    });

    it("deve permitir que o Administrador exclua mesmo com histórico", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);
      mockCursoRepository.contarMatriculas.mockResolvedValue(42);

      await service.delete(5, 999, "Administrador");

      expect(mockCursoRepository.deletar).toHaveBeenCalledWith(5);
      // Administrador nem chega a ser checado contra o histórico.
      expect(mockCursoRepository.contarMatriculas).not.toHaveBeenCalled();
    });

    it("deve lançar erro de permissão", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);

      await expect(service.delete(5, 999, "Usuario")).rejects.toThrow(
        "Você não tem permissão para excluir este curso.",
      );

      expect(mockCursoRepository.deletar).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando curso não existe", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(null);

      await expect(service.delete(999, 1, "Usuario")).rejects.toThrow(
        "Curso não encontrado.",
      );

      expect(mockCursoRepository.deletar).not.toHaveBeenCalled();
    });

    it("deve barrar quem não é Administrador quando o curso já tem histórico", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);
      mockCursoRepository.contarMatriculas.mockResolvedValue(3);

      await expect(service.delete(5, 1, "Usuario")).rejects.toThrow(
        "Este curso já tem 3 matrícula(s) registradas.",
      );

      expect(mockCursoRepository.deletar).not.toHaveBeenCalled();
    });
  });
});
