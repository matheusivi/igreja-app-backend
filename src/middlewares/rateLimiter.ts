import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Quem está sendo contado.
 *
 * Preferimos o id do usuário logado ao IP: numa igreja é normal várias pessoas
 * estarem no mesmo Wi-Fi, e contar por IP faria o orçamento de uma pessoa ser
 * consumido por todas as outras da mesma rede.
 *
 * O token é conferido aqui em vez de reaproveitar `req.user` porque o
 * limitador roda ANTES do middleware de autenticação — nesse ponto `req.user`
 * ainda não existe. E conferir de verdade importa: se aceitássemos o token sem
 * validar, bastaria inventar tokens diferentes para ganhar orçamento infinito.
 *
 * Quando não há token válido, cai no IP. Usamos `ipKeyGenerator` porque IPv6
 * precisa ser agrupado por faixa: um endereço cru daria a cada aparelho
 * bilhões de "identidades" para contornar o limite.
 */
function porUsuarioOuIp(req: Request): string {
    const header = req.headers.authorization;

    if (header?.startsWith('Bearer ')) {
        const token = header.slice(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
                id: number;
            };
            if (decoded?.id) return `u:${decoded.id}`;
        } catch {
            // Token inválido ou expirado: conta como anônimo. O 401 de verdade
            // vem depois, no middleware de autenticação.
        }
    }

    return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

const resposta = (message: string) => ({ success: false, message });

/**
 * E-mail informado no corpo, normalizado. Vazio quando não veio.
 *
 * Roda depois do `express.json()` (ver a ordem em `server.ts`), então o corpo
 * já está disponível aqui.
 */
function emailDoCorpo(req: Request): string {
    const email = (req.body as { email?: unknown })?.email;
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * LOGIN — só conta quem ERRA, e conta por CONTA, não por rede.
 *
 * ═══ OS DOIS DEFEITOS QUE ISTO CORRIGE ═══
 *
 * **1. Contava login que deu certo.** A versão anterior não tinha
 * `skipSuccessfulRequests`, então cada entrada BEM-SUCEDIDA gastava uma das
 * 10 fichas. Quem entrasse e saísse de contas para testar era bloqueado com
 * a senha correta — e a mensagem dizia "muitas tentativas", o que é
 * simplesmente falso quando nenhuma tentativa falhou. Limitador contra força
 * bruta existe para contar ERRO; acerto não é sintoma de ataque.
 *
 * **2. Contava por IP.** Este era o grave. Numa igreja, todo mundo está no
 * mesmo Wi-Fi e sai pelo MESMO IP público. Com teto de 10 por IP, a décima
 * primeira pessoa a entrar no culto tomava bloqueio de 15 minutos mesmo
 * digitando tudo certo. Numa igreja de 400 membros isso não é risco teórico:
 * é a garantia de que o app não funciona no domingo.
 *
 * ═══ A CHAVE: E-MAIL + IP ═══
 * Só por e-mail seria pior de outro jeito — qualquer um poderia travar a
 * conta do pastor de propósito, errando a senha dele cinco vezes. Só por IP
 * é o que estava quebrado. A combinação resolve os dois: 400 pessoas na mesma
 * rede têm 400 baldes distintos, e quem ataca uma conta específica de uma
 * máquina esbarra no limite dela.
 *
 * ═══ 5 ERROS EM 5 MINUTOS ═══
 * Antes eram 10 em 15 minutos. A janela caiu porque 15 minutos de castigo
 * para quem só errou a senha é punição, não proteção — a pessoa desiste do
 * app antes de voltar. Cinco erros ainda barram força bruta: são 60 chutes
 * por hora contra UMA conta, o que não quebra nem senha fraca em tempo útil.
 */
export const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    // O acerto devolve 200 e não é contado. A falha de credencial devolve 401
    // (ver `auth.services.ts`) e entra na conta.
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `login:${emailDoCorpo(req)}:${ipKeyGenerator(req.ip ?? '')}`,
    message: resposta(
        'Muitas tentativas com senha incorreta. Tente novamente em 5 minutos ou use "Esqueci minha senha".',
    ),
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * CADASTRO — por IP, e SEM ignorar o sucesso.
 *
 * Aqui a lógica se inverte em relação ao login: o abuso é justamente criar
 * muitas contas, então o cadastro bem-sucedido É o que precisa ser contado.
 *
 * O teto é folgado (20 em 15 min) pensando no dia de lançamento, quando meia
 * congregação se cadastra no mesmo Wi-Fi depois do culto. Não dá para usar
 * e-mail na chave: cada cadastro traz um e-mail diferente, e a chave nunca
 * repetiria — o limite não existiria na prática.
 */
export const cadastroLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: resposta('Muitos cadastros a partir desta rede. Tente novamente em 15 minutos.'),
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * RECUPERAÇÃO DE SENHA — por e-mail + IP, contando o sucesso.
 *
 * O abuso aqui é pedir redefinição repetidamente para encher a caixa de
 * entrada de alguém, e nesse caso o pedido ACEITO é o próprio incômodo.
 */
export const senhaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => `senha:${emailDoCorpo(req)}:${ipKeyGenerator(req.ip ?? '')}`,
    message: resposta('Muitos pedidos de redefinição. Tente novamente em 15 minutos.'),
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @deprecated Um limitador só para login, cadastro e senha significava um
 * CONTADOR só: as quatro rotas dividiam as mesmas 10 fichas por IP. Use
 * `loginLimiter`, `cadastroLimiter` ou `senhaLimiter`.
 */
export const authLimiter = loginLimiter;

/**
 * Leitura (GET). Abrir telas gera muita requisição e risco quase nenhum, então
 * o teto é alto — ele existe só para conter abuso automatizado, não para
 * atrapalhar quem navega.
 */
export const leituraLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 300,
    keyGenerator: porUsuarioOuIp,
    message: resposta('Muitas requisições. Aguarde um momento.'),
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Escrita (POST, PUT, PATCH, DELETE). Ações raras e sensíveis, com teto menor.
 *
 * 60 por minuto é folgado para uso humano: mesmo cadastrando turmas em
 * sequência, ninguém chega perto. Antes esse mesmo teto era compartilhado com
 * a navegação, e por isso estourava fazendo trabalho legítimo.
 */
export const escritaLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    keyGenerator: porUsuarioOuIp,
    message: resposta('Muitas requisições. Aguarde um momento.'),
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Aplica o limitador certo conforme o método HTTP.
 *
 * Fica num middleware só para o `server.ts` continuar com uma linha de
 * configuração, em vez de repetir a escolha em cada grupo de rotas.
 */
export const generalLimiter: RequestHandler = (req, res, next) => {
    const ehLeitura = req.method === 'GET' || req.method === 'HEAD';
    return ehLeitura ? leituraLimiter(req, res, next) : escritaLimiter(req, res, next);
};
