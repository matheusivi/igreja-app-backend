// src/services/__tests__/grupoFamiliar.service.test.ts
import { GrupoFamiliarService } from "../grupoFamiliar.services";
import { GrupoFamiliarRepository } from "../../repository/grupoFamiliar.repository";
import { UsuarioRepository } from "../../repository/usuario.repository";
import { AppError } from "../../utils/AppError";
import { Perfis } from "../../constants/perfis";

jest.mock("../../repository/grupoFamiliar.repository");
jest.mock("../../repository/usuario.repository");

const MockGrupoFamiliarRepository = GrupoFamiliarRepository as jest.MockedClass<
  typeof GrupoFamiliarRepository
>;
const MockUsuarioRepository = UsuarioRepository as jest.MockedClass<
  typeof UsuarioRepository
>;

// Factories
const makeUsuario = (overrides = {}) => ({
  id: 1,
  nomeCompleto: "João Silva",
  email: "joao@email.com",
  perfil: "Membro",
  sexo: "Masculino",
  dataNascimento: null,
  exibirAniversario: true,
  estadoCivil: null,
  fotoUrl: null,
  profissao: null,
  ...overrides,
});

const makeMembro = (overrides = {}) => ({
  id: 1,
  usuarioId: 1, // adicionar
  grupoFamiliarId: 1, // adicionar
  convidadoPorId: 1, // adicionar
  parentesco: "Criador",
  status: "aceito",
  usuario: {
    id: 1,
    nomeCompleto: "João Silva",
    perfil: "Membro",
    fotoUrl: null,
  },
  convidadoPor: {
    id: 1,
    nomeCompleto: "João Silva",
  },
  ...overrides,
});

const makeGrupo = (overrides = {}) => ({
  id: 1,
  nome: "Família Silva",
  criadorUsuarioId: 1,
  membros: [makeMembro()],
  ...overrides,
});

describe("GrupoFamiliarService", () => {
  let service: GrupoFamiliarService;
  let grupoRepo: jest.Mocked<GrupoFamiliarRepository>;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    grupoRepo =
      new MockGrupoFamiliarRepository() as jest.Mocked<GrupoFamiliarRepository>;
    usuarioRepo = new MockUsuarioRepository() as jest.Mocked<UsuarioRepository>;
    service = new GrupoFamiliarService(usuarioRepo, grupoRepo);
  });

  // ========================
  // CREATE
  // ========================
  describe("create", () => {
    it("deve criar um grupo familiar com sucesso", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario());
      grupoRepo.criar.mockResolvedValue(makeGrupo());

      const resultado = await service.create({ nome: "Família Silva" }, 1);

      expect(usuarioRepo.buscarPorId).toHaveBeenCalledWith(1);
      expect(grupoRepo.criar).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Família Silva",
          criador: { connect: { id: 1 } },
        }),
      );
      expect(resultado.id).toBe(1);
      expect(resultado.nome).toBe("Família Silva");
    });

    it("deve criar grupo sem nome (nome opcional)", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario());
      grupoRepo.criar.mockResolvedValue(makeGrupo({ nome: null }));

      const resultado = await service.create({}, 1);

      expect(grupoRepo.criar).toHaveBeenCalledWith(
        expect.objectContaining({ nome: null }),
      );
      expect(resultado.nome).toBeNull();
    });

    it("deve lançar erro 404 se usuário não for encontrado", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(null);

      await expect(
        service.create({ nome: "Família Silva" }, 999),
      ).rejects.toThrow(new AppError("Usuário não encontrado.", 404));

      expect(grupoRepo.criar).not.toHaveBeenCalled();
    });
  });

  // ========================
  // CONVIDAR
  // ========================
  describe("convidar", () => {
    it("deve enviar convite com sucesso", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo
        .mockResolvedValueOnce({
          id: 1,
          usuarioId: 1,
          grupoFamiliarId: 1,
          status: "aceito",
          parentesco: "Criador",
          convidadoPorId: 1,
        }) // convidador
        .mockResolvedValueOnce(null); // convidado ainda não está no grupo
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario({ id: 2 }));
      grupoRepo.criarConvite.mockResolvedValue({} as any);

      await service.convidar(1, { usuarioId: 2 }, 1);

      expect(grupoRepo.criarConvite).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pendente",
        }),
      );
    });

    it("deve lançar erro 400 se usuário tentar convidar a si mesmo", async () => {
      await expect(service.convidar(1, { usuarioId: 1 }, 1)).rejects.toThrow(
        new AppError("Você não pode convidar a si mesmo para o grupo.", 400),
      );

      expect(grupoRepo.criarConvite).not.toHaveBeenCalled();
    });

    it("deve lançar erro 404 se grupo não for encontrado", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(null);

      await expect(service.convidar(999, { usuarioId: 2 }, 1)).rejects.toThrow(
        new AppError("Grupo familiar não encontrado.", 404),
      );
    });

    it("deve lançar erro 403 se convidador não for membro ativo do grupo", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValueOnce(null);

      await expect(service.convidar(1, { usuarioId: 2 }, 99)).rejects.toThrow(
        new AppError(
          "Você precisa fazer parte do grupo para convidar membros.",
          403,
        ),
      );
    });

    it("deve lançar erro 404 se usuário convidado não existir", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValueOnce({
        id: 1,
        usuarioId: 1,
        grupoFamiliarId: 1,
        status: "aceito",
        parentesco: "Criador",
        convidadoPorId: 1,
      });
      usuarioRepo.buscarPorId.mockResolvedValue(null);

      await expect(service.convidar(1, { usuarioId: 2 }, 1)).rejects.toThrow(
        new AppError("Usuário convidado não encontrado.", 404),
      );
    });

    it("deve lançar erro 409 se usuário já estiver no grupo", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo
        .mockResolvedValueOnce({
          id: 1,
          usuarioId: 1,
          grupoFamiliarId: 1,
          status: "aceito",
          parentesco: "Criador",
          convidadoPorId: 1,
        })
        .mockResolvedValueOnce({
          id: 1,
          usuarioId: 1,
          grupoFamiliarId: 1,
          status: "aceito",
          parentesco: "Criador",
          convidadoPorId: 1,
        }); // já existe
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario({ id: 2 }));

      await expect(service.convidar(1, { usuarioId: 2 }, 1)).rejects.toThrow(
        new AppError(
          "Este usuário já foi convidado ou já faz parte do grupo.",
          409,
        ),
      );
    });
  });

  // ========================
  // RESPONDER CONVITE
  // ========================
  describe("responderConvite", () => {
    it("deve aceitar convite com sucesso", async () => {
      grupoRepo.buscarMembroPorId.mockResolvedValue({
        id: 1,
        usuarioId: 2,
        grupoFamiliarId: 1,
        status: "pendente",
      });
      grupoRepo.atualizarStatusConvite.mockResolvedValue({} as any);

      await service.responderConvite(1, { status: "aceito" }, 2);

      expect(grupoRepo.atualizarStatusConvite).toHaveBeenCalledWith(
        1,
        "aceito",
      );
    });

    it("deve recusar convite com sucesso", async () => {
      grupoRepo.buscarMembroPorId.mockResolvedValue({
        id: 1,
        usuarioId: 2,
        grupoFamiliarId: 1,
        status: "pendente",
      });
      grupoRepo.atualizarStatusConvite.mockResolvedValue({} as any);

      await service.responderConvite(1, { status: "recusado" }, 2);

      expect(grupoRepo.atualizarStatusConvite).toHaveBeenCalledWith(
        1,
        "recusado",
      );
    });

    it("deve lançar erro 404 se convite não for encontrado", async () => {
      grupoRepo.buscarMembroPorId.mockResolvedValue(null);

      await expect(
        service.responderConvite(999, { status: "aceito" }, 2),
      ).rejects.toThrow(new AppError("Convite não encontrado.", 404));
    });

    it("deve lançar erro 403 se outro usuário tentar responder o convite", async () => {
      grupoRepo.buscarMembroPorId.mockResolvedValue({
        id: 1,
        usuarioId: 2,
        grupoFamiliarId: 1,
        status: "pendente",
      });

      await expect(
        service.responderConvite(1, { status: "aceito" }, 99),
      ).rejects.toThrow(
        new AppError(
          "Você não tem permissão para responder este convite.",
          403,
        ),
      );
    });

    it("deve lançar erro 409 se convite já foi respondido", async () => {
      grupoRepo.buscarMembroPorId.mockResolvedValue({
        id: 1,
        usuarioId: 2,
        grupoFamiliarId: 1,
        status: "aceito",
      });

      await expect(
        service.responderConvite(1, { status: "aceito" }, 2),
      ).rejects.toThrow(new AppError("Este convite já foi respondido.", 409));
    });
  });

  // ========================
  // GET BY ID
  // ========================
  describe("getById", () => {
    it("deve retornar grupo por ID com sucesso", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());

      const resultado = await service.getById(1);

      expect(grupoRepo.buscarPorId).toHaveBeenCalledWith(1);
      expect(resultado.id).toBe(1);
      expect(resultado.membros).toHaveLength(1);
    });

    it("deve lançar erro 404 se grupo não for encontrado", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow(
        new AppError("Grupo familiar não encontrado.", 404),
      );
    });
  });

  // ========================
  // GET BY USUARIO
  // ========================
  describe("getByUsuario", () => {
    it("deve retornar grupos paginados do usuário", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario());
      grupoRepo.buscarPorUsuario.mockResolvedValue([makeGrupo()]);
      grupoRepo.contarPorUsuario.mockResolvedValue(1);

      const resultado = await service.getByUsuario(1, 1, 20);

      expect(resultado.data).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(resultado.page).toBe(1);
      expect(resultado.totalPages).toBe(1);
    });

    it("deve lançar erro 404 se usuário não for encontrado", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(null);

      await expect(service.getByUsuario(999)).rejects.toThrow(
        new AppError("Usuário não encontrado.", 404),
      );
    });

    it("deve calcular totalPages corretamente", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario());
      grupoRepo.buscarPorUsuario.mockResolvedValue([makeGrupo()]);
      grupoRepo.contarPorUsuario.mockResolvedValue(45);

      const resultado = await service.getByUsuario(1, 1, 20);

      expect(resultado.total).toBe(45);
      expect(resultado.totalPages).toBe(3);
    });
  });

  // ========================
  // REMOVER MEMBRO
  // ========================
  describe("removerMembro", () => {
    it("deve permitir que o próprio membro se remova", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValue({
        id: 1,
        usuarioId: 1,
        grupoFamiliarId: 1,
        status: "aceito",
        parentesco: "Criador",
        convidadoPorId: 1,
      });
      grupoRepo.removerMembro.mockResolvedValue({} as any);
      grupoRepo.contarMembrosAtivos.mockResolvedValue(1);

      await service.removerMembro(1, 2, 2, Perfis.MEMBRO);

      expect(grupoRepo.removerMembro).toHaveBeenCalledWith(2, 1);
    });

    it("deve permitir que o criador remova qualquer membro", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(
        makeGrupo({ criadorUsuarioId: 1 }),
      );
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValue({
        id: 1,
        usuarioId: 1,
        grupoFamiliarId: 1,
        status: "aceito",
        parentesco: "Criador",
        convidadoPorId: 1,
      });
      grupoRepo.removerMembro.mockResolvedValue({} as any);
      grupoRepo.contarMembrosAtivos.mockResolvedValue(1);

      await service.removerMembro(1, 2, 1, Perfis.MEMBRO);

      expect(grupoRepo.removerMembro).toHaveBeenCalledWith(2, 1);
    });

    it("deve permitir que Administrador remova qualquer membro", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValue({
        id: 1,
        usuarioId: 1,
        grupoFamiliarId: 1,
        status: "aceito",
        parentesco: "Criador",
        convidadoPorId: 1,
      });
      grupoRepo.removerMembro.mockResolvedValue({} as any);
      grupoRepo.contarMembrosAtivos.mockResolvedValue(1);

      await service.removerMembro(1, 2, 99, Perfis.ADMINISTRADOR);

      expect(grupoRepo.removerMembro).toHaveBeenCalledWith(2, 1);
    });

    it("deve lançar erro 403 se membro comum tentar remover outro membro", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(
        makeGrupo({ criadorUsuarioId: 1 }),
      );
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValue({
        id: 1,
        usuarioId: 1,
        grupoFamiliarId: 1,
        status: "aceito",
        parentesco: "Criador",
        convidadoPorId: 1,
      });

      await expect(
        service.removerMembro(1, 2, 99, Perfis.MEMBRO),
      ).rejects.toThrow(
        new AppError("Você não tem permissão para remover este membro.", 403),
      );

      expect(grupoRepo.removerMembro).not.toHaveBeenCalled();
    });

    it("deve deletar o grupo automaticamente quando ficar vazio", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValue({
        id: 1,
        usuarioId: 1,
        grupoFamiliarId: 1,
        status: "aceito",
        parentesco: "Criador",
        convidadoPorId: 1,
      });
      grupoRepo.removerMembro.mockResolvedValue({} as any);
      grupoRepo.contarMembrosAtivos.mockResolvedValue(0); // grupo vazio
      grupoRepo.deletarGrupo.mockResolvedValue({} as any);

      await service.removerMembro(1, 1, 1, Perfis.MEMBRO);

      expect(grupoRepo.deletarGrupo).toHaveBeenCalledWith(1);
    });

    it("deve lançar erro 404 se grupo não for encontrado", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(null);

      await expect(
        service.removerMembro(999, 1, 1, Perfis.MEMBRO),
      ).rejects.toThrow(new AppError("Grupo familiar não encontrado.", 404));
    });

    it("deve lançar erro 404 se membro não for encontrado no grupo", async () => {
      grupoRepo.buscarPorId.mockResolvedValue(makeGrupo());
      grupoRepo.buscarMembroPorUsuarioEGrupo.mockResolvedValue(null);

      await expect(
        service.removerMembro(1, 999, 1, Perfis.MEMBRO),
      ).rejects.toThrow(new AppError("Membro não encontrado no grupo.", 404));
    });
  });
});
