import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "./logger";

export const resend = new Resend(env.RESEND_API_KEY);

/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  E-MAIL DE RECUPERAÇÃO DE SENHA                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * ═══ DOIS DEFEITOS QUE MORAVAM AQUI ═══
 *
 * 1. O DESTINATÁRIO ERA FIXO. O campo `to` tinha um endereço escrito à mão, e
 *    o parâmetro `email` era recebido e ignorado. Qualquer pessoa que pedisse
 *    "esqueci minha senha" fazia o link cair na caixa de OUTRA pessoa — e
 *    nunca recebia nada. Na prática, a recuperação de senha não existia.
 *
 *    Isso quase certamente foi contorno para a limitação do modo de teste do
 *    Resend, que só entrega para o e-mail dono da conta. O contorno virou
 *    permanente, como contorno costuma virar.
 *
 * 2. O E-MAIL MANDAVA UM LINK; O APP PEDE UM CÓDIGO. O corpo trazia um botão
 *    apontando para uma página web que NÃO EXISTE — o front é um aplicativo.
 *    Já a tela diz "Cole o código do e-mail aqui". Ninguém conseguiria ligar
 *    as duas pontas sem extrair o token da URL à mão.
 *
 *    Agora o e-mail mostra o CÓDIGO, que é o que a tela pede. Um dia, se
 *    existir link direto para dentro do app, o botão volta — mas aí levando
 *    para o app, não para o vazio.
 *
 * ═══ ANTES DE PUBLICAR ═══
 * `EMAIL_REMETENTE` precisa apontar para um domínio VERIFICADO no Resend. O
 * padrão (`onboarding@resend.dev`) é o modo de teste e só entrega para o dono
 * da conta — ou seja, a congregação continuaria sem receber nada.
 */
export async function enviarEmailRecuperacaoSenha(
  email: string,
  nomeCompleto: string,
  token: string,
): Promise<void> {
  const primeiroNome = nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto;

  /**
   * Aviso alto, uma vez por envio, enquanto o remetente for o de teste.
   *
   * Sem isto o sintoma em produção seria "ninguém recebe o e-mail", sem erro
   * nenhum nos logs — o Resend aceita a chamada e simplesmente não entrega.
   */
  if (env.EMAIL_REMETENTE.includes("resend.dev")) {
    logger.warn(
      "E-mail de recuperação enviado pelo remetente de TESTE do Resend. Só chega ao dono da conta. Configure EMAIL_REMETENTE com um domínio verificado.",
    );
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_REMETENTE,
    // O destinatário é quem pediu. Era isto que estava fixo.
    to: email,
    subject: "Código para redefinir sua senha",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3D2317;">
        <h2 style="margin-bottom: 8px;">Olá, ${primeiroNome}!</h2>
        <p style="margin-top: 0;">
          Recebemos um pedido para redefinir a senha da sua conta.
        </p>

        <p style="margin-bottom: 8px;"><strong>Seu código:</strong></p>

        <!-- Monoespaçada e com quebra por caractere: o código tem 64
             caracteres, e numa fonte proporcional ele vira um borrão em que a
             pessoa não consegue conferir se copiou inteiro. -->
        <div style="
          font-family: 'Courier New', Courier, monospace;
          font-size: 14px;
          line-height: 1.6;
          background-color: #F1EBE2;
          border: 1px solid #E8DED1;
          border-radius: 8px;
          padding: 16px;
          word-break: break-all;
          user-select: all;
        ">${token}</div>

        <p style="margin-top: 20px;">
          Abra o aplicativo, toque em <strong>“Esqueci minha senha”</strong> e
          cole o código acima na tela de redefinição.
        </p>

        <p>Este código vale por <strong>1 hora</strong> e só pode ser usado uma vez.</p>

        <p style="color: #7A5C4A;">
          Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.
        </p>
      </div>
    `,
  });

  /**
   * ═══ O RESEND NÃO LEVANTA EXCEÇÃO; ELE DEVOLVE O ERRO ═══
   * A biblioteca responde `{ data, error }`. Como o retorno era ignorado, uma
   * recusa passava como sucesso: `forgotPassword` terminava normalmente, o
   * app dizia "confira seu e-mail", e não havia e-mail nenhum — nem uma linha
   * de log para procurar.
   *
   * É o desfecho mais provável em produção, inclusive. Com o remetente de
   * teste (`onboarding@resend.dev`), o Resend RECUSA enviar para qualquer
   * endereço que não seja o dono da conta. Ou seja: funciona para quem
   * configurou o servidor e falha para a congregação inteira — a combinação
   * exata que faz um defeito sobreviver a todos os testes.
   *
   * ═══ POR QUE SÓ LOG, E NÃO ERRO PARA O APP ═══
   * `forgotPassword` responde igual existindo ou não a conta, de propósito:
   * é o que impede alguém de descobrir quem é membro testando e-mails.
   * Propagar a falha de entrega abriria essa porta pelo outro lado — quem
   * recebesse erro saberia que o endereço existe.
   *
   * Então a pessoa continua vendo a mesma tela, e quem cuida do servidor
   * passa a ter onde olhar.
   */
  if (error) {
    logger.error(
      { err: error, remetente: env.EMAIL_REMETENTE },
      "Resend recusou o envio do e-mail de recuperação. A pessoa NÃO recebeu o código.",
    );
  }
}
