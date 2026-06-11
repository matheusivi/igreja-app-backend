// src/services/__tests__/curso.service.test.ts

import { CursoService } from "../curso.services";
import { UsuarioRepository } from "../../repository/usuario.repository";
import { CursoRepository } from "../../repository/curso.repository";
import type {
  CreateCursoDTO,
  UpdateCursoDTO,
  ListCursosQuery,
} from "../../dtos/curso.dto";

describe("CursoService", () => {
  let service: CursoService;
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;
  let mockCursoRepository: jest.Mocked<CursoRepository>;

  const mockUsuario = {
    id: 1,
    nomeCompleto: "João Silva",
    perfil: "Usuario",
    email: "joao@test.com",
    senha: "hash123",
    dataNascimento: null,
    sexo: "Masculino",
    batizado: false,
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
    criador: mockUsuario,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsuarioRepository = {
      buscarPorId: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    mockCursoRepository = {
      criar: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      atualizar: jest.fn(),
      deletar: jest.fn(),
      buscarParaPermissao: jest.fn(),
      contarAlunosAtivos: jest.fn().mockResolvedValue(0),
      contar: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<CursoRepository>;

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
    it("deve deletar quando o usuário é o criador", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);
      mockCursoRepository.contarAlunosAtivos.mockResolvedValue(0); // sem alunos ativos

      await service.delete(5, 1, "Usuario");

      expect(mockCursoRepository.deletar).toHaveBeenCalledWith(5);
    });

    it("deve deletar quando usuário é Administrador", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);
      mockCursoRepository.contarAlunosAtivos.mockResolvedValue(0);

      await service.delete(5, 999, "Administrador");
      expect(mockCursoRepository.deletar).toHaveBeenCalledWith(5);
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

    // novo cenário
    it("deve lançar erro ao tentar deletar curso com alunos ativos", async () => {
      mockCursoRepository.buscarParaPermissao.mockResolvedValue(mockCurso);
      mockCursoRepository.contarAlunosAtivos.mockResolvedValue(3); // com alunos

      await expect(service.delete(5, 1, "Usuario")).rejects.toThrow(
        "Este curso não pode ser excluído pois há alunos com matrículas ativas.",
      );

      expect(mockCursoRepository.deletar).not.toHaveBeenCalled();
    });
  });
});
