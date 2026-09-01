// src/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type {
  RegisterDTO,
  LoginDTO,
  AuthResponse,
  UpdateMeDTO,
  UsuarioPublico,
} from "../dtos/auth.dto";
import { UsuarioRepository } from "../repository/usuario.repository";
import { AppError } from "../utils/AppError";
import { TokenRevogadoRepository } from "../repository/tokenRevogado.repository";
import { PasswordResetTokenRepository } from "../repository/passwordResetToken.repository";
import { enviarEmailRecuperacaoSenha } from "../lib/email";
import { extrairPublicId, removerImagem } from "../lib/cloudinary";
import { Perfis } from "../constants/perfis";

export interface TokenPayload {
  id: number;
  perfil: string;
  sexo: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly SALT_ROUNDS = 10;
  private usuarioRepository: UsuarioRepository;
  private tokenRevogadoRepository: TokenRevogadoRepository;
  private passwordResetTokenRepository: PasswordResetTokenRepository;

  constructor(usuarioRepository?: UsuarioRepository) {
    this.usuarioRepository = usuarioRepository ?? new UsuarioRepository();
    this.tokenRevogadoRepository = new TokenRevogadoRepository();
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET não foi definido no arquivo .env. Isso é uma falha crítica de segurança.",
      );
    }

    // Validação adicional de força do secret
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET deve ter pelo menos 32 caracteres.");
    }

    this.JWT_SECRET = process.env.JWT_SECRET;
  }

  /**
   * A única descrição pública de um usuário.
   *
   * Todas as rotas que devolvem "quem é a pessoa" passam por aqui: entrar,
   * cadastrar, recarregar a sessão e salvar o perfil. Antes cada uma escolhia
   * os campos à mão, e as listas divergiram — o `/me` calava tres campos que
   * a pessoa tinha acabado de salvar.
   *
   * A montagem é EXPLÍCITA, campo a campo, e não um espalhamento do objeto do
   * banco. `buscarPorEmail` traz a linha inteira, com o hash da senha junto:
   * espalhar mandaria o hash para o aparelho sem ninguém perceber.
   */
  private formatarUsuario(usuario: {
    id: number;
    nomeCompleto: string;
    email: string;
    perfil: string;
    sexo: string | null;
    dataNascimento: Date | null;
    exibirAniversario: boolean;
    estadoCivil: string | null;
    fotoUrl: string | null;
    profissao: string | null;
    telefone: string | null;
    especializacao: string | null;
    divulgarTrabalho: boolean;
    batizado: boolean;
  }): UsuarioPublico {
    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      perfil: usuario.perfil,
      sexo: usuario.sexo,
      dataNascimento: usuario.dataNascimento,
      exibirAniversario: usuario.exibirAniversario,
      estadoCivil: usuario.estadoCivil,
      fotoUrl: usuario.fotoUrl,
      profissao: usuario.profissao,
      telefone: usuario.telefone,
      especializacao: usuario.especializacao,
      divulgarTrabalho: usuario.divulgarTrabalho,
      batizado: usuario.batizado,
    };
  }

  public async register(data: RegisterDTO): Promise<AuthResponse> {
    const {
      nomeCompleto,
      email,
      senha,
      dataNascimento,
      sexo,
      estadoCivil,
      profissao,
    } = data;

    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(email);
    if (usuarioExistente) {
      throw new AppError("Este e-mail já está cadastrado no sistema.", 409);
    }

    const senhaHash = await bcrypt.hash(senha, this.SALT_ROUNDS);

    const novoUsuario = await this.usuarioRepository.criar({
      nomeCompleto,
      email,
      senhaHash,
      dataNascimento,
      sexo,
      estadoCivil,
      profissao,
    });

    const token = this.generateToken(
      novoUsuario.id,
      novoUsuario.perfil,
      novoUsuario.sexo ?? "",
    );

    return { ...this.formatarUsuario(novoUsuario), token };
  }

  public async login(data: LoginDTO): Promise<AuthResponse> {
    const { email, senha } = data;

    const usuario = await this.usuarioRepository.buscarPorEmail(email);
    if (!usuario) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    /**
     * ═══ CONTA REMOVIDA NÃO ENTRA ═══
     * Na prática a senha guardada é um hash aleatório e nenhuma senha confere
     * — esta checagem nunca deveria ser alcançada. Ela existe porque "nunca
     * deveria" não é garantia: basta um dia alguém escrever um script de
     * migração que mexa na coluna, e a porta se abre sem ninguém notar.
     *
     * A mensagem é a mesma de credencial errada, de propósito. Dizer "esta
     * conta foi excluída" confirmaria a quem estivesse testando e-mails que
     * aquela pessoa já foi da igreja.
     */
    if (usuario.contaRemovidaEm) {
      throw new AppError("E-mail ou senha inválidos.", 401);
    }

    const token = this.generateToken(
      usuario.id,
      usuario.perfil,
      usuario.sexo ?? "",
    );

    // ═══ O LOGIN DEVOLVE TUDO, NÃO SÓ O CRACHÁ ═══
    // Antes vinham quatro campos. O app guardava isso como sendo "o usuário",
    // e o resultado era que logo depois de entrar a pessoa não tinha foto,
    // sexo nem data de nascimento — o Perfil mostrava as iniciais no lugar do
    // retrato até o app ser reaberto, quando o `/me` finalmente trazia o
    // resto. Entrar e recarregar precisam responder a mesma coisa.
    return { ...this.formatarUsuario(usuario), token };
  }

  /**
   * Busca usuário por ID SEM retornar a senha
   * Usado pela rota /me e middlewares
   */
  public async getUserById(id: number) {
    const usuario = await this.usuarioRepository.buscarPorId(id);

    if (!usuario) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    return usuario;
  }

  /**
   * O que o middleware de autenticação precisa saber a cada requisição:
   * o perfil de agora e quando a senha mudou pela última vez.
   *
   * Separado de `getUserById` porque as duas perguntas são diferentes. Aquela
   * é "quem é esta pessoa", para desenhar a tela. Esta é "esta sessão ainda
   * vale", e é feita centenas de vezes mais.
   */
  public async getSessao(
    id: number,
  ): Promise<{ id: number; perfil: string; senhaAlteradaEm: Date | null }> {
    const usuario = await this.usuarioRepository.buscarParaSessao(id);

    if (!usuario) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    return usuario;
  }

  /**
   * O token foi emitido ANTES da última troca de senha?
   *
   * ═══ POR QUE COMPARAR EM SEGUNDOS INTEIROS ═══
   * O `iat` do JWT é truncado para segundo cheio. Um token emitido em
   * 10.900s carimba `iat = 10`. Se a comparação fosse em milissegundos, uma
   * senha trocada em 10.400s — ou seja, ANTES — pareceria posterior ao token
   * e o derrubaria injustamente.
   *
   * Truncando os dois lados, só invalida quem foi emitido num segundo
   * anteriormente fechado. O empate fica a favor do token, que é o lado certo
   * de errar: o outro seria deslogar a pessoa no exato instante em que ela
   * acaba de redefinir a senha e entrar de novo.
   */
  public tokenAnteriorATrocaDeSenha(
    emitidoEm: number,
    senhaAlteradaEm: Date | null,
  ): boolean {
    if (!senhaAlteradaEm) return false;
    return Math.floor(senhaAlteradaEm.getTime() / 1000) > emitidoEm;
  }

  private generateToken(userId: number, perfil: string, sexo: string): string {
    return jwt.sign(
      { id: userId, perfil, sexo },
      this.JWT_SECRET,
      { expiresIn: "24h" }, // Reduzido de 7d para 24h (melhor prática)
    );
  }

  public verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      throw new AppError("Token inválido ou expirado.", 401);
    }
  }

  public async updateMe(usuarioId: number, data: UpdateMeDTO): Promise<object> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    const fotoAntiga = usuario.fotoUrl;

    /**
     * ═══ NÃO DÁ PARA SE DIVULGAR SEM OS DADOS QUE A DIVULGAÇÃO USA ═══
     * O diretório profissional exige duas coisas do servidor: telefone (senão
     * o cartão não tem como ser contatado) e data de nascimento (que é o que
     * barra menores de idade numa lista com telefone e foto).
     *
     * Sem esta checagem, a pessoa ligaria o interruptor, salvaria com
     * sucesso, e simplesmente não apareceria na lista — porque a consulta a
     * filtraria em silêncio. Ela concluiria que o app está quebrado, e
     * estaria certa em concluir: prometemos algo que não cumprimos.
     *
     * Falhar aqui, com o motivo, é o que transforma um sumiço inexplicável
     * numa instrução.
     */
    if (data.divulgarTrabalho === true) {
      const telefone = data.telefone ?? usuario.telefone;
      const nascimento = data.dataNascimento ?? usuario.dataNascimento;

      if (!telefone) {
        throw new AppError(
          "Informe um telefone para divulgar seu trabalho — é por ele que as pessoas vão te encontrar.",
          400,
        );
      }
      if (!nascimento) {
        throw new AppError(
          "Informe sua data de nascimento para divulgar seu trabalho.",
          400,
        );
      }

      const dezoitoAnosAtras = new Date();
      dezoitoAnosAtras.setFullYear(dezoitoAnosAtras.getFullYear() - 18);
      if (new Date(nascimento) > dezoitoAnosAtras) {
        throw new AppError(
          "A divulgação de trabalho é permitida apenas para maiores de 18 anos.",
          403,
        );
      }
    }

    const usuarioAtualizado = await this.usuarioRepository.atualizarDados(
      usuarioId,
      data,
    );

    // Trocou (ou removeu) a foto? Apaga a anterior no Cloudinary, senão o
    // espaço fica ocupado para sempre por imagens que ninguém mais vê.
    if (data.fotoUrl !== undefined && fotoAntiga && data.fotoUrl !== fotoAntiga) {
      const publicId = extrairPublicId(fotoAntiga);
      if (publicId) await removerImagem(publicId);
    }

    return usuarioAtualizado;
  }

  /**
   * Define quem é líder.
   *
   * ═══ TRÊS TRAVAS, EM CAMADAS DIFERENTES ═══
   * A rota diz QUEM pode chamar (Pastor e Administrador). O schema diz QUAL
   * perfil pode ser atribuído (Membro ou Líder). Falta a terceira, que é a
   * daqui: SOBRE QUEM.
   *
   * Sem ela, um Pastor rebaixaria outro Pastor a Membro — e o rebaixado
   * perderia o próprio poder de desfazer. Duas chamadas e a igreja fica sem
   * liderança no app, sem ninguém capaz de reverter pelo aparelho.
   *
   * ═══ POR QUE NÃO CONFIAR NA TELA ═══
   * A tela já esconde o botão de quem é Pastor ou Administrador. Isso é
   * arrumação, não segurança: quem chama a rota direto não passa pela tela.
   * A regra tem que morar onde a decisão é tomada.
   */
  public async atualizarPerfil(
    usuarioId: number,
    novoPerfil: string,
    solicitanteId: number,
  ): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    // Mexer no próprio perfil é sempre errado, nas duas direções: rebaixar-se
    // é tiro no pé, e promover-se é justamente o que a trava da rota impede.
    if (usuarioId === solicitanteId) {
      throw new AppError("Você não pode alterar o seu próprio perfil.", 403);
    }

    if (usuario.perfil === Perfis.PASTOR || usuario.perfil === Perfis.ADMINISTRADOR) {
      throw new AppError(
        `${usuario.nomeCompleto} é ${usuario.perfil.toLowerCase()}. Esse perfil só pode ser alterado direto no sistema.`,
        403,
      );
    }

    // Já está assim: gravar de novo não muda nada e ainda faria a tela
    // anunciar uma promoção que não aconteceu.
    if (usuario.perfil === novoPerfil) return;

    await this.usuarioRepository.atualizarPerfil(usuarioId, novoPerfil);
  }

  /**
   * ╔═══════════════════════════════════════════════════════════════════╗
   * ║  A PESSOA APAGA A PRÓPRIA CONTA                                   ║
   * ╚═══════════════════════════════════════════════════════════════════╝
   *
   * Exigência das duas lojas para publicar: quem cria conta tem que conseguir
   * apagá-la de dentro do app. Desativar não conta.
   *
   * ═══ POR QUE PEDE A SENHA ═══
   * É a ação mais destrutiva que existe aqui e não tem desfazer. Só o toque
   * num botão não basta: celular desbloqueado na mão de outra pessoa, criança
   * mexendo, toque errado. A senha prova que é a dona da conta agindo agora,
   * e não alguém que pegou o aparelho aberto.
   *
   * ═══ A FOTO SAI ANTES ═══
   * O Cloudinary é outro serviço; se a exclusão do banco acontecesse primeiro
   * e o processo caísse em seguida, o retrato ficaria hospedado para sempre,
   * sem ninguém saber de quem é. Apagando antes, o pior caso é uma foto órfã
   * de uma conta que continua existindo — recuperável.
   */
  public async excluirConta(usuarioId: number, senha: string): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new AppError("Usuário não encontrado.", 404);

    // `buscarPorId` não devolve a senha, de propósito. Para conferir é preciso
    // a linha completa — e é o único lugar do sistema que precisa disso.
    const comSenha = await this.usuarioRepository.buscarPorEmail(usuario.email);
    if (!comSenha) throw new AppError("Usuário não encontrado.", 404);

    const senhaConfere = await bcrypt.compare(senha, comSenha.senha);
    if (!senhaConfere) {
      throw new AppError("Senha incorreta.", 401);
    }

    if (usuario.fotoUrl) {
      const publicId = extrairPublicId(usuario.fotoUrl);
      if (publicId) await removerImagem(publicId);
    }

    /**
     * Hash de um valor aleatório que ninguém conhece — nem eu, nem o banco de
     * dados depois de gravado. Guardar o hash antigo permitiria entrar com a
     * senha de sempre; guardar texto qualquer faria o `bcrypt.compare` se
     * comportar de forma imprevisível. Um hash válido de segredo perdido é a
     * única forma limpa de trancar a porta.
     */
    const senhaInutilizavel = await bcrypt.hash(
      crypto.randomBytes(32).toString("hex"),
      this.SALT_ROUNDS,
    );

    await this.usuarioRepository.excluirConta(usuarioId, senhaInutilizavel);
  }

  public async logout(token: string): Promise<void> {
    const decoded = this.verifyToken(token);

    // exp vem em segundos no JWT — converter para Date
    const expiraEm = new Date(decoded.exp * 1000);

    await this.tokenRevogadoRepository.revogar(token, expiraEm);
  }

  public async forgotPassword(email: string): Promise<void> {
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    // não revelar se o e-mail existe ou não — segurança
    if (!usuario) return;

    const token = await this.passwordResetTokenRepository.criar(usuario.id);

    await enviarEmailRecuperacaoSenha(
      usuario.email,
      usuario.nomeCompleto,
      token,
    );
  }

  public async resetPassword(token: string, novaSenha: string): Promise<void> {
    const registro =
      await this.passwordResetTokenRepository.buscarValido(token);

    if (!registro) {
      throw new AppError("Token inválido ou não encontrado.", 400);
    }

    if (registro.usado) {
      throw new AppError("Este token já foi utilizado.", 400);
    }

    if (new Date() > registro.expiraEm) {
      throw new AppError("Token expirado. Solicite um novo link.", 400);
    }

    const senhaHash = await bcrypt.hash(novaSenha, this.SALT_ROUNDS);

    await this.usuarioRepository.atualizarSenha(registro.usuarioId, senhaHash);
    await this.passwordResetTokenRepository.invalidar(token);
  }
}
