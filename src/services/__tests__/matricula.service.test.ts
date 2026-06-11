// src/services/__tests__/matricula.service.test.ts

import { MatriculaService } from "../matricula.services";
import { MatriculaRepository } from "../../repository/matricula.repository";
import { UsuarioRepository } from "../../repository/usuario.repository";

describe("MatriculaService", () => {
  let service: MatriculaService;
  let mockMatriculaRepository: jest.Mocked<MatriculaRepository>;
  let mockUsuarioRepository: jest.Mocked<UsuarioRepository>;

  const mockUsuario = {
    id: 10,
    nomeCompleto: "João Silva",
    perfil: "Membro",
    batizado: false,
  };

  const mockSala = {
    id: 5,
    status: "ativa",
    curso: { criadorUsuarioId: 3, categoria: "Geral" },
  };

  const mockSalaDeOutroLider = {
    id: 7,
    status: "ativa",
    curso: { criadorUsuarioId: 99, categoria: "Geral" },
  };

  const mockSalaBatismo = {
    id: 8,
    status: "ativa",
    curso: { criadorUsuarioId: 3, categoria: "Batismo" },
  };

  const mockParticipantes = [
    {
      usuario: {
        id: 10,
        nomeCompleto: "João",
        perfil: "Membro",
      },
      dataMatricula: new Date(),
      status: "ativo" as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsuarioRepository = {
      buscarPorId: jest.fn(),
      marcarBatizado: jest.fn(),
    } as unknown as jest.Mocked<UsuarioRepository>;

    mockMatriculaRepository = {
      matricular: jest.fn(),
      buscarMatricula: jest.fn(),
      salaExiste: jest.fn(),
      atualizarStatus: jest.fn(),
      removerParticipante: jest.fn(),
      listarParticipantes: jest.fn(),
      contarParticipantes: jest.fn().mockResolvedValue(1),
      buscarHistoricoPorUsuario: jest.fn(),
      buscarMatriculaBatismoAtiva: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<MatriculaRepository>;

    service = new MatriculaService(
      mockMatriculaRepository,
      mockUsuarioRepository,
    );
  });

  // ========================
  // MATRICULAR
  // ========================
  describe("matricular", () => {
    it("deve matricular com sucesso em sala normal", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
      mockMatriculaRepository.buscarMatricula.mockResolvedValue(null);
      mockMatriculaRepository.matricular.mockResolvedValue({
        salaId: 5,
        usuarioId: 10,
        dataMatricula: new Date(),
        status: "ativo",
        sala: { nomeSala: "Sala A", curso: { nome: "Curso Geral" } },
      } as any);

      const resultado = await service.matricular(5, 10);

      expect(resultado.status).toBe("ativo");
      expect(mockMatriculaRepository.matricular).toHaveBeenCalledWith(5, 10);
    });

    it("deve lançar erro 409 se já estiver matriculado", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
      mockMatriculaRepository.buscarMatricula.mockResolvedValue({
        status: "ativo",
      } as any);

      await expect(service.matricular(5, 10)).rejects.toThrow(
        "Você já está matriculado nesta sala",
      );
    });

    it("deve reativar matrícula cancelada", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
      mockMatriculaRepository.buscarMatricula
        .mockResolvedValueOnce({ status: "cancelado_pelo_usuario" } as any)
        .mockResolvedValueOnce({
          salaId: 5,
          usuarioId: 10,
          dataMatricula: new Date(),
          status: "ativo",
          sala: { nomeSala: "Sala A", curso: { nome: "Curso Geral" } },
        } as any);

      await service.matricular(5, 10);

      expect(mockMatriculaRepository.atualizarStatus).toHaveBeenCalledWith(
        5,
        10,
        "ativo",
      );
    });

    it("deve lançar erro ao tentar rematricular em sala concluída", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
      mockMatriculaRepository.buscarMatricula.mockResolvedValue({
        status: "concluido",
      } as any);

      await expect(service.matricular(5, 10)).rejects.toThrow(
        "Você já concluiu esta sala e não pode se rematricular",
      );
    });

    it("deve lançar erro se já tiver batismo ativo ao tentar entrar em sala de batismo", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
      mockMatriculaRepository.salaExiste.mockResolvedValue(
        mockSalaBatismo as any,
      );
      mockMatriculaRepository.buscarMatricula.mockResolvedValue(null);
      mockMatriculaRepository.buscarMatriculaBatismoAtiva.mockResolvedValue(
        true,
      ); // já tem batismo ativo

      await expect(service.matricular(8, 10)).rejects.toThrow(
        "Você já está inscrito em uma turma de batismo ativa.",
      );

      expect(mockMatriculaRepository.matricular).not.toHaveBeenCalled();
    });

    it("deve matricular normalmente em sala de batismo quando não tem batismo ativo", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);
      mockMatriculaRepository.salaExiste.mockResolvedValue(
        mockSalaBatismo as any,
      );
      mockMatriculaRepository.buscarMatricula.mockResolvedValue(null);
      mockMatriculaRepository.buscarMatriculaBatismoAtiva.mockResolvedValue(
        false,
      );
      mockMatriculaRepository.matricular.mockResolvedValue({
        salaId: 8,
        usuarioId: 10,
        dataMatricula: new Date(),
        status: "ativo",
        sala: { nomeSala: "Turma Batismo", curso: { nome: "Batismo 2026" } },
      } as any);

      const resultado = await service.matricular(8, 10);

      expect(resultado.status).toBe("ativo");
      expect(mockMatriculaRepository.matricular).toHaveBeenCalledWith(8, 10);
    });
  });

  // ========================
  // ATUALIZAR STATUS DO PARTICIPANTE
  // ========================
  describe("atualizarStatusParticipante", () => {
    it("deve marcar usuário como batizado ao concluir sala de batismo", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(
        mockSalaBatismo as any,
      );
      mockMatriculaRepository.atualizarStatus.mockResolvedValue({} as any);
      mockUsuarioRepository.marcarBatizado = jest
        .fn()
        .mockResolvedValue(undefined);

      await service.atualizarStatusParticipante(
        8,
        10,
        "concluido",
        3,
        "Pastor",
      );

      expect(mockMatriculaRepository.atualizarStatus).toHaveBeenCalledWith(
        8,
        10,
        "concluido",
      );
      expect(mockUsuarioRepository.marcarBatizado).toHaveBeenCalledWith(10);
    });

    it("não deve marcar como batizado ao concluir sala normal", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
      mockMatriculaRepository.atualizarStatus.mockResolvedValue({} as any);
      mockUsuarioRepository.marcarBatizado = jest.fn();

      await service.atualizarStatusParticipante(
        5,
        10,
        "concluido",
        3,
        "Pastor",
      );

      expect(mockUsuarioRepository.marcarBatizado).not.toHaveBeenCalled();
    });

    it("não deve marcar como batizado quando status for desistente", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(
        mockSalaBatismo as any,
      );
      mockMatriculaRepository.atualizarStatus.mockResolvedValue({} as any);
      mockUsuarioRepository.marcarBatizado = jest.fn();

      await service.atualizarStatusParticipante(
        8,
        10,
        "desistente",
        3,
        "Pastor",
      );

      expect(mockUsuarioRepository.marcarBatizado).not.toHaveBeenCalled();
    });
  });

  // ========================
  // LISTAR PARTICIPANTES
  // ========================
  describe("listarParticipantes", () => {
    it("deve listar participantes para qualquer usuário logado", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);
      mockMatriculaRepository.listarParticipantes.mockResolvedValue(
        mockParticipantes as any,
      );
      mockMatriculaRepository.contarParticipantes.mockResolvedValue(1);

      const resultado = await service.listarParticipantes(5);

      expect(resultado).toBeDefined();
      expect(resultado.data).toHaveLength(1);
      expect((resultado.data[0] as any).nomeCompleto).toBe("João");
      expect(mockMatriculaRepository.listarParticipantes).toHaveBeenCalledWith(
        5,
        0,
        20,
      );
    });

    it("deve lançar erro se a sala não existir", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(null);

      await expect(service.listarParticipantes(999)).rejects.toThrow(
        "Sala não encontrada",
      );
    });
  });

  // ========================
  // REMOVER PARTICIPANTE
  // ========================
  describe("removerParticipante", () => {
    it("deve permitir Administrador remover participante", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);

      await service.removerParticipante(5, 20, 999, "Administrador");
      expect(mockMatriculaRepository.removerParticipante).toHaveBeenCalledWith(
        5,
        20,
      );
    });

    it("deve permitir Líder remover da sua própria sala", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(mockSala as any);

      await service.removerParticipante(5, 20, 3, "Líder");
      expect(mockMatriculaRepository.removerParticipante).toHaveBeenCalledWith(
        5,
        20,
      );
    });

    it("deve bloquear Líder de remover em sala de outro líder", async () => {
      mockMatriculaRepository.salaExiste.mockResolvedValue(
        mockSalaDeOutroLider as any,
      );

      await expect(
        service.removerParticipante(7, 20, 3, "Líder"),
      ).rejects.toThrow("Você não tem permissão para remover participantes");
    });
  });

  // ========================
  // CANCELAR MATRÍCULA
  // ========================
  describe("cancelarMatricula", () => {
    it("deve cancelar matrícula com sucesso", async () => {
      mockMatriculaRepository.buscarMatricula.mockResolvedValue({
        status: "ativo",
      } as any);

      await service.cancelarMatricula(5, 10);

      expect(mockMatriculaRepository.atualizarStatus).toHaveBeenCalledWith(
        5,
        10,
        "cancelado_pelo_usuario",
      );
    });
  });
});
