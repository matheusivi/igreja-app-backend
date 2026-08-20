// src/services/__tests__/usuario.service.test.ts
import { UsuarioService } from "../usuario.services";
import { UsuarioRepository } from "../../repository/usuario.repository";
import { AppError } from "../../utils/AppError";

jest.mock("../../repository/usuario.repository");

const MockUsuarioRepository = UsuarioRepository as jest.MockedClass<
  typeof UsuarioRepository
>;

const makeUsuario = (overrides = {}) => ({
  id: 1,
  nomeCompleto: "João Silva",
  email: "joao@email.com",
  perfil: "Membro",
  sexo: "Masculino",
  fotoUrl: null,
  dataNascimento: new Date("1990-06-15"),
  exibirAniversario: true,
  estadoCivil: "Solteiro",
  profissao: "Professor",
  batizado: false,
  telefone: null,
  especializacao: null,
  divulgarTrabalho: false,
  ...overrides,
});

describe("UsuarioService", () => {
  let service: UsuarioService;
  let usuarioRepo: jest.Mocked<UsuarioRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    usuarioRepo = new MockUsuarioRepository() as jest.Mocked<UsuarioRepository>;
    service = new UsuarioService(usuarioRepo);
  });

  // ========================
  // LISTAR
  // ========================
  /**
   * A busca deixou de passar pelo `findMany` do Prisma e passou a usar
   * consulta crua (`buscarComFamilia`), para ignorar acento e trazer a
   * família junto. Os testes seguem o serviço: o que se verifica agora é que
   * os filtros e a paginação chegam ao repositório, não a forma do `where`
   * do Prisma — que deixou de existir.
   */
  describe("listar", () => {
    it("deve listar usuários com filtros padrão", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([
        {
          id: 1,
          nomeCompleto: "João Silva",
          fotoUrl: null,
          perfil: "Membro",
          sexo: "Masculino",
          familiaId: 3,
          familia: "Família Silva",
        },
      ]);
      usuarioRepo.contarComFamilia.mockResolvedValue(1);

      const resultado = await service.listar();

      expect(usuarioRepo.buscarComFamilia).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, skip: 0 }),
      );
      expect(resultado.data).toHaveLength(1);
      expect(resultado.total).toBe(1);
      expect(resultado.page).toBe(1);
      expect(resultado.totalPages).toBe(1);
    });

    it("deve devolver a família junto de cada pessoa", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([
        {
          id: 1,
          nomeCompleto: "Maria Souza",
          fotoUrl: null,
          perfil: "Membro",
          sexo: "Masculino",
          familiaId: 7,
          familia: "Família Souza",
        },
        {
          id: 2,
          nomeCompleto: "Pedro Lima",
          fotoUrl: null,
          perfil: "Membro",
          sexo: "Masculino",
          // Quem ainda não tem família é informação útil por si: é quem a
          // liderança precisa acolher.
          familiaId: null,
          familia: null,
        },
      ]);
      usuarioRepo.contarComFamilia.mockResolvedValue(2);

      const resultado = await service.listar({ busca: "a" });

      expect(resultado.data[0]).toMatchObject({
        familiaId: 7,
        familia: "Família Souza",
      });
      expect(resultado.data[1]).toMatchObject({
        familiaId: null,
        familia: null,
      });
    });

    it("deve repassar o termo de busca e a paginação", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([]);
      usuarioRepo.contarComFamilia.mockResolvedValue(0);

      await service.listar({ busca: "João", page: 2, limit: 10 });

      expect(usuarioRepo.buscarComFamilia).toHaveBeenCalledWith(
        expect.objectContaining({ busca: "João", take: 10, skip: 10 }),
      );
      // A contagem tem que ver o MESMO filtro da lista, senão o total mente
      // e a paginação cria páginas vazias.
      expect(usuarioRepo.contarComFamilia).toHaveBeenCalledWith(
        expect.objectContaining({ busca: "João" }),
      );
    });

    it("deve aplicar filtro de perfil", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([]);
      usuarioRepo.contarComFamilia.mockResolvedValue(0);

      await service.listar({ perfil: "Pastor" });

      expect(usuarioRepo.buscarComFamilia).toHaveBeenCalledWith(
        expect.objectContaining({ perfil: "Pastor" }),
      );
    });

    it("deve aplicar filtro de sexo", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([]);
      usuarioRepo.contarComFamilia.mockResolvedValue(0);

      await service.listar({ sexo: "Feminino" });

      expect(usuarioRepo.buscarComFamilia).toHaveBeenCalledWith(
        expect.objectContaining({ sexo: "Feminino" }),
      );
    });

    it("deve calcular totalPages corretamente", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([]);
      usuarioRepo.contarComFamilia.mockResolvedValue(45);

      const resultado = await service.listar({ limit: 20, page: 1 });

      expect(resultado.total).toBe(45);
      expect(resultado.totalPages).toBe(3);
    });

    it("deve retornar lista vazia quando não há usuários", async () => {
      usuarioRepo.buscarComFamilia.mockResolvedValue([]);
      usuarioRepo.contarComFamilia.mockResolvedValue(0);

      const resultado = await service.listar();

      expect(resultado.data).toHaveLength(0);
      expect(resultado.total).toBe(0);
      expect(resultado.totalPages).toBe(0);
    });
  });

  // ========================
  // BUSCAR PERFIL
  // ========================
  describe("buscarPerfil", () => {
    it("deve retornar perfil completo do usuário", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(makeUsuario());

      const resultado = await service.buscarPerfil(1);

      expect(usuarioRepo.buscarPorId).toHaveBeenCalledWith(1);
      expect(resultado.id).toBe(1);
      expect(resultado.nomeCompleto).toBe("João Silva");
      expect(resultado.batizado).toBe(false);
      expect(resultado.sexo).toBe("Masculino");
    });

    it("deve retornar batizado true quando usuário for batizado", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(
        makeUsuario({ batizado: true }),
      );

      const resultado = await service.buscarPerfil(1);

      expect(resultado.batizado).toBe(true);
    });

    it("deve lançar erro 404 se usuário não for encontrado", async () => {
      usuarioRepo.buscarPorId.mockResolvedValue(null);

      await expect(service.buscarPerfil(999)).rejects.toThrow(
        new AppError("Usuário não encontrado.", 404),
      );
    });
  });

  // ========================
  // ANIVERSARIANTES
  // ========================
  describe("aniversariantes", () => {
    it("deve retornar aniversariantes do mês atual quando mês não informado", async () => {
      const mesAtual = new Date().getMonth() + 1;

      usuarioRepo.buscarAniversariantes.mockResolvedValue([
        { id: 1, nomeCompleto: "João Silva", fotoUrl: null, dia: 15 },
      ] as any);

      const resultado = await service.aniversariantes();

      expect(usuarioRepo.buscarAniversariantes).toHaveBeenCalledWith(mesAtual);
      expect(resultado.mes).toBe(mesAtual);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0]!.dia).toBe(15);
      expect(resultado.data[0]!.aniversariantes).toHaveLength(1);
    });

    it("deve retornar aniversariantes do mês informado", async () => {
      usuarioRepo.buscarAniversariantes.mockResolvedValue([
        { id: 1, nomeCompleto: "Maria Lima", fotoUrl: null, dia: 3 },
        { id: 2, nomeCompleto: "Pedro Costa", fotoUrl: null, dia: 3 },
        { id: 3, nomeCompleto: "Ana Silva", fotoUrl: null, dia: 20 },
      ] as any);

      const resultado = await service.aniversariantes(12);

      expect(usuarioRepo.buscarAniversariantes).toHaveBeenCalledWith(12);
      expect(resultado.mes).toBe(12);
      expect(resultado.data).toHaveLength(2); // dia 3 e dia 20
      expect(resultado.data[0]!.dia).toBe(3);
      expect(resultado.data[0]!.aniversariantes).toHaveLength(2); // Maria e Pedro no mesmo dia
      expect(resultado.data[1]!.dia).toBe(20);
      expect(resultado.data[1]!.aniversariantes).toHaveLength(1);
    });

    it("deve retornar lista vazia quando não há aniversariantes no mês", async () => {
      usuarioRepo.buscarAniversariantes.mockResolvedValue([]);

      const resultado = await service.aniversariantes(2);

      expect(resultado.mes).toBe(2);
      expect(resultado.data).toHaveLength(0);
    });
  });
});
