import { Resend } from "resend";
import { env } from "../config/env";

export const resend = new Resend(env.RESEND_API_KEY);

export async function enviarEmailRecuperacaoSenha(
  email: string,
  nomeCompleto: string,
  token: string,
): Promise<void> {
  const link = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: "Igreja App <noreply@suaigreja.com.br>", // trocar pelo seu domínio
    to: email,
    subject: "Recuperação de senha — IBVI Church",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Olá, ${nomeCompleto}!</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no IBVI Church App.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${link}" style="
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          margin: 16px 0;
        ">
          Redefinir senha
        </a>
        <p>Este link expira em <strong>1 hora</strong>.</p>
        <p>Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">Equipe IBVI Church</p>
      </div>
    `,
  });
}
