// src/middlewares/__tests__/auth.middleware.test.ts

import type { Response, NextFunction } from "express";
import { authMiddleware, type AuthRequest } from "../auth.middleware";
import { Perfis } from "../../constants/perfis";

/**
 * ═══ POR QUE ESTE ARQUIVO É O MAIS IMPORTANTE DA SUÍTE ═══
 * `requireRole` é a trava de TODA ação de liderança do app: publicar aviso,
 * criar evento, mudar a cara da Home, promover alguém a líder. E até agora
 * não tinha um único teste.
 *
 * O risco não é ele estar errado hoje — está certo. É que apagar a linha
 * `authMiddleware.requireRole([...])` de qualquer arquivo de rotas deixa a
 * suíte inteira VERDE, o servidor sobe normalmente, e a única diferença é que
 * qualquer membro passa a poder fazer o que só o pastor podia. Um defeito
 * assim não aparece em teste manual, porque ninguém testa "será que o que
 * deve falhar falha?".
 *
 * ═══ POR QUE SÓ `requireRole`, E NÃO `authenticate` ═══
 * `authenticate` depende de JWT, de uma consulta a tokens revogados e agora da
 * busca do usuário no banco; testá-lo de verdade pede mock de três coisas e
 * ainda assim exercita pouco. Já `requireRole` é função pura sobre
 * `req.user.perfil` — o retorno por esforço é incomparável.
 *
 * Nota: quem PREENCHE `req.user.perfil` mudou (era o token, agora é o banco),
 * mas `requireRole` não sabe disso nem precisa saber. Ele continua respondendo
 * a mesma pergunta sobre o mesmo campo, e por isso estes testes seguem
 * valendo sem uma linha alterada — que é o sinal de que a separação entre os
 * dois middlewares está no lugar certo.
 */
describe("authMiddleware.requireRole", () => {
  /**
   * Dublês mínimos de Express.
   *
   * `status` devolve ele mesmo porque o código real encadeia
   * `res.status(403).json(...)` — se `status` devolvesse `undefined`, o teste
   * quebraria por um motivo que não tem nada a ver com permissão.
   */
  function criarResposta() {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
    } as unknown as Response & {
      status: jest.Mock;
      json: jest.Mock;
    };
    return res;
  }

  const next: NextFunction = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  function chamar(perfil: string | null, permitidos: string[]) {
    const req = (perfil === null
      ? {}
      : { user: { id: 1, perfil, sexo: "Masculino" } }) as AuthRequest;
    const res = criarResposta();

    authMiddleware.requireRole(permitidos)(req, res, next);

    return res;
  }

  describe("deixa passar quem está na lista", () => {
    it.each([Perfis.PASTOR, Perfis.ADMINISTRADOR])("%s", (perfil) => {
      const res = chamar(perfil, [Perfis.ADMINISTRADOR, Perfis.PASTOR]);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("barra quem não está", () => {
    it.each([Perfis.MEMBRO, Perfis.LIDER, Perfis.VISITANTE])("%s", (perfil) => {
      const res = chamar(perfil, [Perfis.ADMINISTRADOR, Perfis.PASTOR]);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  /**
   * ═══ LÍDER FICA DE FORA DA ROTA DE PERFIL ═══
   * Este caso tem nome próprio porque foi um defeito REAL: a rota
   * `PATCH /api/auth/usuarios/:id/perfil` aceitava Líder, e o corpo aceitava
   * os quatro perfis. Somados, um líder chamava a rota com o próprio id e
   * "Administrador", e virava administrador do app.
   *
   * Não havia tela para isso — mas rota não precisa de tela. Precisa do
   * endereço e de um token, e o token quem tem é o próprio interessado.
   */
  it("Líder NÃO passa na trava de Pastor/Administrador", () => {
    const res = chamar(Perfis.LIDER, [Perfis.ADMINISTRADOR, Perfis.PASTOR]);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("mas passa onde Líder é permitido", () => {
    chamar(Perfis.LIDER, [Perfis.ADMINISTRADOR, Perfis.PASTOR, Perfis.LIDER]);

    expect(next).toHaveBeenCalledTimes(1);
  });

  /**
   * Sem `req.user` significa que o `authenticate` não rodou antes — ordem
   * errada no arquivo de rotas. O correto é 401 (não sei quem é você), e não
   * 403 (sei quem é você e não pode): a diferença muda o que o app faz, porque
   * o 401 derruba a sessão e leva ao login.
   */
  it("responde 401 quando não houve autenticação antes", () => {
    const res = chamar(null, [Perfis.PASTOR]);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("usa a mensagem personalizada quando ela é passada", () => {
    const req = {
      user: { id: 1, perfil: Perfis.MEMBRO, sexo: "Masculino" },
    } as AuthRequest;
    const res = criarResposta();

    authMiddleware.requireRole(
      [Perfis.PASTOR],
      "Só o pastor ou o administrador podem definir quem é líder.",
    )(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Só o pastor ou o administrador podem definir quem é líder.",
      }),
    );
  });

  /**
   * A comparação é por texto exato. Um perfil gravado como "pastor" ou
   * "PASTOR" no banco não passaria — e é assim que tem que ser, porque
   * aceitar variações silenciaria um cadastro corrompido em vez de expô-lo.
   */
  it("não aceita o perfil em caixa diferente", () => {
    const res = chamar("pastor", [Perfis.PASTOR]);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("lista vazia de permitidos barra todo mundo", () => {
    const res = chamar(Perfis.ADMINISTRADOR, []);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

/**
 * ═══ A REGRA QUE DERRUBA A SESSÃO QUANDO A SENHA MUDA ═══
 * O middleware inteiro pede mock de JWT, de tokens revogados e do banco. Esta
 * função não pede nada: recebe dois números e devolve um booleano. É onde mora
 * a única decisão difícil do mecanismo, então é o que vale travar.
 *
 * O que ela protege, em uma frase: trocar a senha tem que expulsar quem já
 * estava dentro, SEM expulsar a própria pessoa que acabou de trocar.
 */
describe("tokenAnteriorATrocaDeSenha", () => {
  // Instância direta: a função é pura e não toca em repositório nenhum.
  // O construtor exige JWT_SECRET, então garantimos um aqui.
  const { AuthService } = require("../../services/auth.services");
  process.env.JWT_SECRET =
    process.env.JWT_SECRET ?? "segredo-de-teste-com-mais-de-32-caracteres";
  const service = new AuthService();

  /** `iat` do JWT é em SEGUNDOS; a coluna do banco é um Date. */
  const emSegundos = (data: Date) => Math.floor(data.getTime() / 1000);

  it("conta que nunca trocou de senha não derruba ninguém", () => {
    const agora = emSegundos(new Date());

    expect(service.tokenAnteriorATrocaDeSenha(agora, null)).toBe(false);
  });

  it("token emitido ANTES da troca é recusado", () => {
    const trocaEm = new Date("2026-08-18T12:00:00Z");
    const tokenAntigo = emSegundos(new Date("2026-08-18T11:59:00Z"));

    expect(service.tokenAnteriorATrocaDeSenha(tokenAntigo, trocaEm)).toBe(true);
  });

  it("token emitido DEPOIS da troca continua valendo", () => {
    const trocaEm = new Date("2026-08-18T12:00:00Z");
    const tokenNovo = emSegundos(new Date("2026-08-18T12:00:01Z"));

    expect(service.tokenAnteriorATrocaDeSenha(tokenNovo, trocaEm)).toBe(false);
  });

  /**
   * ═══ O CASO QUE JUSTIFICA O `Math.floor` ═══
   * O `iat` é truncado para segundo cheio: um token emitido em 12:00:00.900
   * carimba 12:00:00. Se a comparação fosse em milissegundos, uma senha
   * trocada em 12:00:00.400 — ANTES do token, portanto — pareceria posterior
   * e o derrubaria.
   *
   * Quem vive isso é justamente quem acabou de redefinir a senha e entrou de
   * novo: seria deslogado no primeiro toque. Truncando os dois lados, o empate
   * fica a favor do token.
   */
  it("empate no mesmo segundo não derruba o token recém-emitido", () => {
    const trocaEm = new Date("2026-08-18T12:00:00.400Z");
    const tokenLogoDepois = emSegundos(new Date("2026-08-18T12:00:00.900Z"));

    expect(tokenLogoDepois).toBe(emSegundos(trocaEm)); // mesmo segundo
    expect(service.tokenAnteriorATrocaDeSenha(tokenLogoDepois, trocaEm)).toBe(
      false,
    );
  });

  it("a troca só invalida a partir do segundo seguinte", () => {
    const trocaEm = new Date("2026-08-18T12:00:00.999Z");
    const tokenNoSegundoAnterior = emSegundos(
      new Date("2026-08-18T11:59:59.000Z"),
    );

    expect(
      service.tokenAnteriorATrocaDeSenha(tokenNoSegundoAnterior, trocaEm),
    ).toBe(true);
  });
});
