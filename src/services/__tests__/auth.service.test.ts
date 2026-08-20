// src/services/__tests__/auth.service.test.ts

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthService } from "../auth.services";
import { UsuarioRepository } from "../../repository/usuario.repository";
import type { RegisterDTO, LoginDTO } from "../../dtos/auth.dto";

jest.mock("../../repository/usuario.repository");

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

describe("AuthService", () => {
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
  let service: AuthService;

  /**
   * A linha como o BANCO devolve — com o hash da senha junto.
   *
   * `criar` e `buscarPorEmail` não têm `select`, então trazem a coluna
   * `senha`. É proposital (o login precisa do hash para comparar), e é
   * exatamente por isso que `formatarUsuario` monta a resposta campo a campo
   * em vez de espalhar o objeto. O teste "nunca devolve o hash" mais abaixo
   * existe para essa proteção não se perder num refactor.
   */
  const mockUsuario = {
    id: 42,
    nomeCompleto: "Maria Oliveira",
    email: "maria@test.com",
    perfil: "Usuario",
    sexo: "Feminino",
    senha: "$2a$10$validHash1234567890",
    dataNascimento: new Date("1995-03-15"),
    exibirAniversario: true,
    estadoCivil: "Solteira",
    fotoUrl: null,
    profissao: "Professora",
    telefone: null,
    especializacao: null,
    divulgarTrabalho: false,
    batizado: false,
  };

  /** O mesmo usuário como o APP recebe: tudo menos a senha. */
  const usuarioPublico = {
    id: 42,
    nomeCompleto: "Maria Oliveira",
    email: "maria@test.com",
    perfil: "Usuario",
    sexo: "Feminino",
    dataNascimento: new Date("1995-03-15"),
    exibirAniversario: true,
    estadoCivil: "Solteira",
    fotoUrl: null,
    profissao: "Professora",
    telefone: null,
    especializacao: null,
    divulgarTrabalho: false,
    batizado: false,
  };

  const mockToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDIsInBlcmZpbCI6IlVzdWFyaW8ifQ.signature";

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(mockUsuarioRepository);

    // Configurações padrão dos mocks
    (bcrypt.hash as jest.Mock).mockResolvedValue("$2a$10$hashedPassword123456");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue(mockToken);
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 42,
      perfil: "Usuario",
      iat: 1710000000,
      exp: 1710600000,
    });
  });

  // ========================
  // REGISTER
  // ========================
  describe("register", () => {
    it("deve registrar um usuário com sucesso (todos os campos)", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
      mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

      const dto: RegisterDTO = {
        nomeCompleto: "Maria Oliveira",
        email: "maria@test.com",
        senha: "SenhaForte123!",
        sexo: "Feminino",
        dataNascimento: new Date("1995-03-15") as any,
        estadoCivil: "Solteira",
        profissao: "Professora",
      };

      const resultado = await service.register(dto);

      expect(mockUsuarioRepository.buscarPorEmail).toHaveBeenCalledWith(
        "maria@test.com",
      );
      expect(bcrypt.hash).toHaveBeenCalledWith("SenhaForte123!", 10);
      expect(mockUsuarioRepository.criar).toHaveBeenCalledWith({
        nomeCompleto: "Maria Oliveira",
        email: "maria@test.com",
        senhaHash: "$2a$10$hashedPassword123456",
        sexo: "Feminino",
        dataNascimento: dto.dataNascimento,
        estadoCivil: "Solteira",
        profissao: "Professora",
      });

      /**
       * ═══ O CADASTRO DEVOLVE O USUÁRIO INTEIRO ═══
       * Antes vinham quatro campos: id, nome, e-mail e perfil. O app guardava
       * isso como sendo "o usuário", e logo depois de entrar a pessoa não
       * tinha foto, sexo nem data de nascimento — o Perfil mostrava as
       * iniciais no lugar do retrato até o app ser reaberto.
       *
       * Entrar, cadastrar e recarregar passam pelo mesmo `formatarUsuario`,
       * e por isso respondem a mesma coisa.
       */
      expect(resultado).toEqual({ ...usuarioPublico, token: mockToken });
    });

    it("deve registrar usuário com campos opcionais ausentes", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
      mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

      const dto: RegisterDTO = {
        nomeCompleto: "João Silva",
        email: "joao@test.com",
        senha: "123456",
        // dataNascimento, estadoCivil e profissao não enviados
      } as RegisterDTO;

      await service.register(dto);

      expect(mockUsuarioRepository.criar).toHaveBeenCalledWith({
        nomeCompleto: "João Silva",
        email: "joao@test.com",
        senhaHash: expect.any(String),
        dataNascimento: undefined,
        estadoCivil: undefined,
        profissao: undefined,
      });
    });

    it("deve lançar erro quando e-mail já estiver cadastrado", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(
        mockUsuario as any,
      );

      const dto: RegisterDTO = {
        nomeCompleto: "Teste",
        email: "maria@test.com",
        senha: "123456",
      } as RegisterDTO;

      await expect(service.register(dto)).rejects.toThrow(
        "Este e-mail já está cadastrado no sistema.",
      );
      expect(mockUsuarioRepository.criar).not.toHaveBeenCalled();
    });
  });

  // ========================
  // LOGIN
  // ========================
  describe("login", () => {
    it("deve realizar login com sucesso", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(
        mockUsuario as any,
      );

      const dto: LoginDTO = {
        email: "maria@test.com",
        senha: "SenhaForte123!",
      };

      const resultado = await service.login(dto);

      expect(mockUsuarioRepository.buscarPorEmail).toHaveBeenCalledWith(
        "maria@test.com",
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "SenhaForte123!",
        mockUsuario.senha,
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 42, perfil: "Usuario", sexo: "Feminino" },
        expect.any(String),
        { expiresIn: "24h" },
      );

      expect(resultado.token).toBe(mockToken);
    });

    it("deve lançar erro quando usuário não for encontrado", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: "naoexiste@test.com", senha: "123456" }),
      ).rejects.toThrow("E-mail ou senha inválidos.");
    });

    it("deve lançar erro quando senha estiver incorreta", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(
        mockUsuario as any,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "maria@test.com", senha: "senhaerrada" }),
      ).rejects.toThrow("E-mail ou senha inválidos.");
    });
  });

  // ========================
  // GET USER BY ID
  // ========================
  describe("getUserById", () => {
    it("deve retornar os dados completos do usuário", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(mockUsuario as any);

      const usuario = await service.getUserById(42);

      expect(mockUsuarioRepository.buscarPorId).toHaveBeenCalledWith(42);
      expect(usuario).toEqual(mockUsuario);
    });

    it("deve lançar erro quando usuário não existir", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(
        "Usuário não encontrado.",
      );
    });
  });

  // ========================
  // VERIFY TOKEN
  // ========================
  describe("verifyToken", () => {
    it("deve validar token válido e retornar payload correto", () => {
      const payload = service.verifyToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String));
      expect(payload).toMatchObject({
        id: 42,
        perfil: "Usuario",
      });
    });

    it("deve lançar erro quando token for inválido", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("invalid signature");
      });

      expect(() => service.verifyToken("token.invalido")).toThrow(
        "Token inválido ou expirado.",
      );
    });

    it("deve lançar erro quando token estiver expirado", () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError("jwt expired", new Date());
      });

      expect(() => service.verifyToken("expired.token")).toThrow(
        "Token inválido ou expirado.",
      );
    });
  });

  // ========================
  // GENERATE TOKEN (indireto)
  // ========================
  describe("generateToken (indireto)", () => {
    it("deve gerar token com expiração de 7 dias", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
      mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

      await service.register({
        nomeCompleto: "Teste",
        email: "teste@test.com",
        senha: "123456",
      } as RegisterDTO);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 42,
          perfil: "Usuario",
          sexo: "Feminino",
        }),
        expect.any(String),
        { expiresIn: "24h" },
      );
    });
  });

  /**
   * ═══ QUEM PODE FAZER DE QUEM UM LÍDER ═══
   * Esta regra existe em TRÊS camadas, e cada uma responde uma pergunta:
   *
   *   rota (`requireRole`)  → QUEM chama: só Pastor e Administrador
   *   schema (`zod`)        → QUAL perfil: só "Membro" e "Líder"
   *   serviço (aqui)        → SOBRE QUEM: nem lideranca, nem si mesmo
   *
   * Os testes abaixo cobrem A TERCEIRA, e só ela.
   *
   * ⚠️  As outras duas NÃO estão testadas. Não existe teste de rota nem de
   * middleware neste projeto — se alguém apagar o `requireRole` do
   * `auth.routes.ts`, ou acrescentar "Administrador" ao enum do schema, a
   * suíte inteira continua verde. Este aviso está aqui porque uma versão
   * anterior deste comentário afirmava que essas camadas estavam cobertas, e
   * a afirmação era falsa: comentário errado é pior que comentário nenhum,
   * porque a próxima pessoa confia nele.
   *
   * O que motivou a camada: sem ela, um pastor rebaixava outro pastor a
   * membro, e o rebaixado perdia justamente o poder de desfazer. Duas
   * chamadas e a igreja fica sem liderança no app.
   */
  describe("atualizarPerfil", () => {
    const PASTOR = { id: 1, perfil: "Pastor", nomeCompleto: "Pastor João" };
    const ADMIN = { id: 2, perfil: "Administrador", nomeCompleto: "Ana Admin" };
    const LIDER = { id: 3, perfil: "Líder", nomeCompleto: "Carlos Líder" };
    const MEMBRO = { id: 4, perfil: "Membro", nomeCompleto: "Joana Membro" };

    it("promove um membro a líder", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(MEMBRO as any);

      await service.atualizarPerfil(MEMBRO.id, "Líder", PASTOR.id);

      expect(mockUsuarioRepository.atualizarPerfil).toHaveBeenCalledWith(
        MEMBRO.id,
        "Líder",
      );
    });

    it("rebaixa um líder a membro", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(LIDER as any);

      await service.atualizarPerfil(LIDER.id, "Membro", PASTOR.id);

      expect(mockUsuarioRepository.atualizarPerfil).toHaveBeenCalledWith(
        LIDER.id,
        "Membro",
      );
    });

    it("recusa alterar quem é Pastor", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue({
        ...PASTOR,
        id: 9,
      } as any);

      await expect(
        service.atualizarPerfil(9, "Membro", ADMIN.id),
      ).rejects.toThrow(/só pode ser alterado direto no sistema/i);

      expect(mockUsuarioRepository.atualizarPerfil).not.toHaveBeenCalled();
    });

    it("recusa alterar quem é Administrador", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(ADMIN as any);

      await expect(
        service.atualizarPerfil(ADMIN.id, "Membro", PASTOR.id),
      ).rejects.toThrow(/só pode ser alterado direto no sistema/i);

      expect(mockUsuarioRepository.atualizarPerfil).not.toHaveBeenCalled();
    });

    /**
     * A trava do "si mesmo" vale nas DUAS direções, e a de rebaixar é a que
     * importa: quem se rebaixa perde o poder de se promover de volta, e não
     * existe tela no app para consertar isso.
     */
    it("recusa alterar o próprio perfil", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(PASTOR as any);

      await expect(
        service.atualizarPerfil(PASTOR.id, "Membro", PASTOR.id),
      ).rejects.toThrow(/próprio perfil/i);

      expect(mockUsuarioRepository.atualizarPerfil).not.toHaveBeenCalled();
    });

    /**
     * Verifica o "si mesmo" ANTES do "alvo protegido": um pastor tentando
     * mexer em si é recusado pelo primeiro, e a mensagem tem que ser sobre
     * isso — dizer "esse perfil é definido no sistema" mandaria a pessoa
     * procurar o banco para resolver algo que ela nem deveria querer fazer.
     */
    it("diz que é sobre si mesmo, não sobre o perfil do alvo", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(ADMIN as any);

      await expect(
        service.atualizarPerfil(ADMIN.id, "Membro", ADMIN.id),
      ).rejects.toThrow(/próprio perfil/i);
    });

    it("não grava quando a pessoa já está no perfil pedido", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(LIDER as any);

      await service.atualizarPerfil(LIDER.id, "Líder", PASTOR.id);

      expect(mockUsuarioRepository.atualizarPerfil).not.toHaveBeenCalled();
    });

    it("404 quando o usuário não existe", async () => {
      mockUsuarioRepository.buscarPorId.mockResolvedValue(null as any);

      await expect(
        service.atualizarPerfil(999, "Líder", PASTOR.id),
      ).rejects.toThrow(/não encontrado/i);
    });
  });

  /**
   * ═══ O HASH DA SENHA NUNCA SAI DO SERVIDOR ═══
   * `criar` e `buscarPorEmail` devolvem a linha inteira do banco, coluna
   * `senha` incluída — o login precisa dela para conferir com o bcrypt.
   *
   * A única coisa que impede esse hash de chegar ao aparelho é o
   * `formatarUsuario` montar a resposta campo a campo. Bastaria alguém trocar
   * isso por um `{ ...usuario, token }` — que parece mais limpo e é o refactor
   * mais tentador do arquivo — para o hash começar a viajar em toda resposta
   * de login, sem nenhum erro, sem nenhum aviso.
   *
   * Este teste é a trava. Ele falha alto no dia em que esse atalho for
   * tomado, que é o único jeito de a proteção sobreviver ao próximo refactor.
   */
  describe("a senha nunca vaza", () => {
    it("o login não devolve o hash", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(mockUsuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const resultado = await service.login({
        email: "maria@test.com",
        senha: "SenhaForte123!",
      } as LoginDTO);

      expect(resultado).not.toHaveProperty("senha");
      expect(JSON.stringify(resultado)).not.toContain("$2a$");
    });

    it("o cadastro não devolve o hash", async () => {
      mockUsuarioRepository.buscarPorEmail.mockResolvedValue(null);
      mockUsuarioRepository.criar.mockResolvedValue(mockUsuario as any);

      const resultado = await service.register({
        nomeCompleto: "Maria Oliveira",
        email: "maria@test.com",
        senha: "SenhaForte123!",
        sexo: "Feminino",
      } as RegisterDTO);

      expect(resultado).not.toHaveProperty("senha");
      expect(JSON.stringify(resultado)).not.toContain("$2a$");
    });
  });
});
