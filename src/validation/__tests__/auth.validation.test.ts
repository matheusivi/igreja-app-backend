// src/validation/__tests__/auth.validation.test.ts

import { AtualizarPerfilSchema } from "../auth.validation";
import { Perfis } from "../../constants/perfis";

/**
 * ═══ A SEGUNDA DAS TRÊS CAMADAS ═══
 * A permissão de definir liderança mora em três lugares, e cada um responde
 * uma pergunta diferente:
 *
 *   rota (`requireRole`)  → QUEM chama          → auth.middleware.test.ts
 *   schema (aqui)         → QUAL perfil         → este arquivo
 *   serviço               → SOBRE QUEM          → auth.service.test.ts
 *
 * Nenhuma delas sozinha basta. Este arquivo cobre a do meio, que é a mais
 * fácil de afrouxar sem querer: o enum tem quatro valores óbvios, e
 * acrescentar "Pastor" à lista parece completude, não brecha.
 *
 * ═══ POR QUE SÓ MEMBRO E LÍDER ═══
 * Pastor e Administrador são definidos direto no banco. É trabalhoso de
 * propósito: são poucas contas, mudam uma vez a cada anos, e exigir acesso ao
 * banco garante que ninguém as crie por engano — nem no calor de uma
 * discussão, por quem estava com o celular na mão.
 *
 * Se este enum aceitasse os quatro, um pastor criaria um Administrador pela
 * mesma chamada que promove alguém a líder. E Administrador é o perfil que
 * manda em tudo, inclusive em quem é pastor.
 */
describe("AtualizarPerfilSchema", () => {
  describe("aceita os dois perfis que a igreja distribui", () => {
    it.each([Perfis.MEMBRO, Perfis.LIDER])("%s", (perfil) => {
      expect(AtualizarPerfilSchema.parse({ perfil })).toEqual({ perfil });
    });
  });

  /**
   * Estes dois são a razão de o arquivo existir. Se algum dia passarem, a
   * escalada de privilégio que fechamos volta — e volta em silêncio, porque
   * nada mais no caminho barra o valor.
   */
  describe("recusa os perfis que só o banco define", () => {
    it.each([Perfis.PASTOR, Perfis.ADMINISTRADOR])("%s", (perfil) => {
      expect(() => AtualizarPerfilSchema.parse({ perfil })).toThrow();
    });
  });

  it.each([
    ["Visitante", "perfil que existe no sistema mas não se atribui por aqui"],
    ["lider", "sem acento e em minúscula"],
    ["LÍDER", "em caixa alta"],
    ["Administradorr", "com erro de digitação"],
    ["", "vazio"],
  ])("recusa %s (%s)", (perfil) => {
    expect(() => AtualizarPerfilSchema.parse({ perfil })).toThrow();
  });

  it("recusa quando o campo nem vem", () => {
    expect(() => AtualizarPerfilSchema.parse({})).toThrow();
  });

  it("recusa tipos que não são texto", () => {
    expect(() => AtualizarPerfilSchema.parse({ perfil: 1 })).toThrow();
    expect(() => AtualizarPerfilSchema.parse({ perfil: null })).toThrow();
  });

  /**
   * A mensagem é lida por um pastor no celular, não por um programador no
   * terminal. Ela precisa dizer o que fazer — "é definido direto no sistema" —
   * e não apenas que o valor é inválido.
   */
  it("a mensagem de erro explica onde Pastor e Administrador são definidos", () => {
    const resultado = AtualizarPerfilSchema.safeParse({
      perfil: Perfis.ADMINISTRADOR,
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.message).toMatch(/direto no sistema/i);
    }
  });
});
