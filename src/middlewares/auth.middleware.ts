import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthService } from "../services/auth.services";
import type { TokenPayload } from "../services/auth.services";
import { TokenRevogadoRepository } from "../repository/tokenRevogado.repository";
import { AppError } from "../utils/AppError";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    perfil: string;
    sexo: string;
  };
}

export class AuthMiddleware {
  private authService: AuthService;
  private tokenRevogadoRepository: TokenRevogadoRepository;

  constructor() {
    this.authService = new AuthService();
    this.tokenRevogadoRepository = new TokenRevogadoRepository();
  }

  /**
   * Verifica se o usuário está autenticado via JWT
   */
  public authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
          success: false,
          message: "Token não fornecido. Use o formato: Bearer <token>",
        });
        return;
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        res.status(401).json({
          success: false,
          message: "Token mal formatado. Use o formato: Bearer <token>",
        });
        return;
      }

      const decoded: TokenPayload = this.authService.verifyToken(token);

      const revogado = await this.tokenRevogadoRepository.estaRevogado(token);
      if (revogado) {
        res.status(401).json({
          success: false,
          message: "Token inválido. Faça login novamente.",
        });
        return;
      }

      /**
       * ═══ O PERFIL VEM DO BANCO, NÃO DO TOKEN ═══
       * O token diz quem a pessoa ERA quando entrou. Como ele vale 24 horas,
       * confiar nele produzia duas coisas ruins:
       *
       *   promover a líder  → sem efeito até a pessoa sair e entrar
       *   REMOVER a liderança → sem efeito por até um dia inteiro
       *
       * A segunda é a grave. Se a liderança foi retirada por um motivo sério,
       * o app continuava obedecendo ao crachá velho — publicando avisos,
       * criando eventos, mexendo na cara da igreja.
       *
       * Buscando aqui, as duas passam a valer na requisição seguinte.
       *
       * ═══ O QUE ISSO CUSTA ═══
       * Uma busca por chave primária, que o Postgres resolve em fração de
       * milissegundo — contra os 100+ ms que a viagem do 4G já gasta. Não é
       * mensurável na escala de uma igreja.
       *
       * Se um dia for, o caminho é guardar isto numa memória rápida (Redis) e
       * apagar a entrada da pessoa quando o perfil mudar. A leitura está
       * concentrada AQUI justamente para essa troca ser em um lugar só.
       *
       * ═══ DE BRINDE ═══
       * Conta apagada do banco passa a ser recusada na hora, em vez de seguir
       * operando com o token que já tinha em mãos.
       */
      const usuario = await this.authService.getSessao(decoded.id);

      /**
       * ═══ TROCAR A SENHA DERRUBA AS SESSÕES ABERTAS ═══
       * Antes, redefinir a senha invalidava só o token de RECUPERAÇÃO. Os JWT
       * já emitidos seguiam valendo por até 24 horas.
       *
       * O caso que isso deixava sem resposta é o mais comum de todos: o
       * celular desbloqueado que ficou com outra pessoa. A vítima troca a
       * senha justamente para expulsar quem está lá dentro, o app diz que deu
       * certo — e não expulsa ninguém. Por um dia inteiro o intruso continua
       * publicando, lendo o diretório e mexendo no perfil, em nome dela.
       *
       * A conta nunca trocou de senha? `senhaAlteradaEm` é nulo e nada muda.
       * Ninguém é deslogado pela existência desta checagem.
       */
      if (
        this.authService.tokenAnteriorATrocaDeSenha(
          decoded.iat,
          usuario.senhaAlteradaEm,
        )
      ) {
        res.status(401).json({
          success: false,
          message: "Sua senha foi alterada. Entre novamente.",
        });
        return;
      }

      req.user = {
        id: usuario.id,
        perfil: usuario.perfil,
        // `sexo` continua vindo do token: é usado só para concordância de
        // gênero em texto ("bem-vinda"), muda praticamente nunca, e não vale
        // uma coluna a mais na resposta desta consulta.
        sexo: decoded.sexo,
      };

      next();
    } catch (error: unknown) {
      /**
       * ═══ NEM TODO ERRO AQUI É "SUA SESSÃO ACABOU" ═══
       *
       * Este `catch` respondia 401 para QUALQUER exceção. A intenção era boa —
       * token expirado, token revogado e conta apagada são todos "esta sessão
       * não vale mais", e o app trata 401 levando ao login.
       *
       * O problema é que servidor quebrado caía no mesmo balde. E foi
       * exatamente o que aconteceu: o cliente do Prisma estava desatualizado,
       * uma consulta daqui estourou, e o app passou a fazer login e sair no
       * mesmo segundo. O sintoma acusava a pessoa ("sua sessão expirou")
       * enquanto o defeito estava no servidor, sem nada nos logs.
       *
       * Erro de infraestrutura tem que gritar como 500 e aparecer no log. É
       * mais barato descobrir isso na primeira requisição do que perseguir um
       * logout fantasma.
       *
       * De quebra fecha um vazamento: `error.message` ia direto para o
       * aparelho, então a mensagem do Prisma — com nome de coluna e tabela —
       * era entregue a quem chamasse a rota.
       */
      const ehFalhaDeSessao =
        error instanceof AppError ||
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError;

      if (!ehFalhaDeSessao) {
        // Vai para o errorHandler: ele registra com pilha e responde 500
        // genérico em produção.
        next(error);
        return;
      }

      res.status(401).json({
        success: false,
        message:
          error instanceof AppError
            ? error.message
            : "Token inválido ou expirado.",
      });
    }
  };

  /**
   * Verifica se o usuário possui pelo menos um dos perfis permitidos
   * Exemplo: requireRole(['Pastor', 'Líder', 'Administrador'])
   */
  public requireRole = (allowedRoles: string[], customMessage?: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Usuário não autenticado.",
        });
        return;
      }

      const hasPermission = allowedRoles.includes(req.user.perfil);

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message:
            customMessage ||
            `Acesso negado. Perfis permitidos: ${allowedRoles.join(", ")}`,
          seuPerfil: req.user.perfil,
          perfisPermitidos: allowedRoles,
        });
        return;
      }

      next();
    };
  };
}

export const authMiddleware = new AuthMiddleware();
